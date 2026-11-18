import { Request } from 'express';
import { auditLogRepository } from '../repositories/auditLogRepository.js';
import { v4 as uuidv4 } from 'uuid';

export type WafRuleMode = 'BLOCK' | 'DETECT_ONLY';

export interface WafRule {
  id: string;
  name: string;
  category: 'SQLI' | 'XSS' | 'PATH_TRAVERSAL' | 'COMMAND_INJECTION' | 'SUSPICIOUS_PAYLOAD';
  severity: 'HIGH' | 'CRITICAL';
  description: string;
  patterns: RegExp[];
  enabled: boolean;
  mode: WafRuleMode;
}

export interface WafInspectionResult {
  blocked: boolean;
  detected: boolean;
  rule?: WafRule;
  matchedPattern?: string;
  matchedLocation?: string;
  detectedPayload?: string;
}

export interface WafDetectedEvent {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  category: string;
  sourceIp: string;
  path: string;
  actionTaken: 'BLOCKED' | 'DETECTED';
  location: string;
  snippet: string;
}

const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'confirmpassword',
  'newpassword',
  'currentpassword',
  'token',
  'secret',
  'cookie',
  'shms_session',
  'otpcode',
  'code',
  'twofactorcode',
  'xsrf',
  'csrf',
  'recoverycode'
]);

export class WafService {
  private totalInspectedRequests: number = 0;
  private totalBlockedRequests: number = 0;
  private detectedHistory: WafDetectedEvent[] = [];

  private rules: WafRule[] = [
    {
      id: 'WAF-SQLI-001',
      name: 'SQL Injection Signature Defense',
      category: 'SQLI',
      severity: 'CRITICAL',
      description: 'Detects boolean-based tautologies, stacked statements, union queries, and SQL function injections.',
      enabled: true,
      mode: 'BLOCK',
      patterns: [
        /('|\")\s*(OR|AND)\s+('?[a-zA-Z0-9_]+'?|\d+)\s*=\s*('?[a-zA-Z0-9_]+'?|\d+)/i,
        /UNION\s+(ALL\s+)?SELECT/i,
        /;\s*(DROP|ALTER|TRUNCATE|DELETE|INSERT|UPDATE)\s+/i,
        /\b(WAITFOR\s+DELAY|SLEEP\s*\(\s*\d+\s*\))/i,
        /--\s*$/m,
        /\/\*[\s\S]*?\*\//,
        /'\s*OR\s*'1'\s*=\s*'1/i,
        /"\s*OR\s*"1"\s*=\s*"1/i
      ]
    },
    {
      id: 'WAF-XSS-002',
      name: 'Cross-Site Scripting (XSS) Filter',
      category: 'XSS',
      severity: 'CRITICAL',
      description: 'Detects malicious HTML tags, JavaScript URI schemes, and inline event handlers.',
      enabled: true,
      mode: 'BLOCK',
      patterns: [
        /<\s*script\b[^>]*>/i,
        /javascript\s*:\s*[^\s]/i,
        /\bon(error|load|click|mouseover|focus|blur|change|submit)\s*=\s*["'][^"']*["']/i,
        /<\s*img\b[^>]*\bonerror\b/i,
        /<\s*svg\b[^>]*\bonload\b/i,
        /<\s*iframe\b[^>]*>/i,
        /document\.(cookie|location|write)/i
      ]
    },
    {
      id: 'WAF-PATH-003',
      name: 'Path Traversal & Boundary Defense',
      category: 'PATH_TRAVERSAL',
      severity: 'HIGH',
      description: 'Detects parent directory climb attempts (../, ..\\) and system directory probe strings.',
      enabled: true,
      mode: 'BLOCK',
      patterns: [
        /(\.\.[\/\\]|\.\.%2f|\.\.%5c|%2e%2e%2f|%2e%2e\/)/i,
        /\/etc\/(passwd|shadow|hosts)/i,
        /c:\\(boot\.ini|windows\\system32)/i
      ]
    },
    {
      id: 'WAF-CMD-004',
      name: 'OS Command Injection Interceptor',
      category: 'COMMAND_INJECTION',
      severity: 'CRITICAL',
      description: 'Detects command chaining operators coupled with shell execution binaries.',
      enabled: true,
      mode: 'BLOCK',
      patterns: [
        /(\||&|;)\s*(cat\s+\/etc|powershell(\.exe)?|cmd(\.exe)?|whoami\b|wget\s+http|curl\s+http)/i,
        /`[^`]*?(whoami|cat\s+|ls\s+|dir\s+)[^`]*?`/i
      ]
    },
    {
      id: 'WAF-PROTO-005',
      name: 'Suspicious Protocol & Null-Byte Filter',
      category: 'SUSPICIOUS_PAYLOAD',
      severity: 'HIGH',
      description: 'Detects poison null bytes and unsupported stream protocols.',
      enabled: true,
      mode: 'BLOCK',
      patterns: [
        /(%00|\0)/,
        /(php:\/\/|data:\/\/|gopher:\/\/|file:\/\/)/i
      ]
    }
  ];

  /**
   * Safe recursive inspection of an arbitrary value (string, object, array)
   * Skips sensitive authentication fields to prevent credential exposure
   */
  private scanValue(
    val: any,
    location: string,
    activeRules: WafRule[]
  ): { rule: WafRule; location: string; pattern: string; snippet: string } | null {
    if (val === null || val === undefined) return null;

    if (typeof val === 'string') {
      // Test string against all active rules
      for (const rule of activeRules) {
        for (const pattern of rule.patterns) {
          if (pattern.test(val)) {
            const snippet = val.length > 80 ? val.slice(0, 80) + '...' : val;
            return {
              rule,
              location,
              pattern: pattern.toString(),
              snippet
            };
          }
        }
      }
      return null;
    }

    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const res = this.scanValue(val[i], `${location}[${i}]`, activeRules);
        if (res) return res;
      }
      return null;
    }

    if (typeof val === 'object') {
      for (const key of Object.keys(val)) {
        // Skip sensitive fields
        if (SENSITIVE_FIELD_NAMES.has(key.toLowerCase())) {
          continue;
        }
        const res = this.scanValue(val[key], `${location}.${key}`, activeRules);
        if (res) return res;
      }
    }

    return null;
  }

  /**
   * Main inspection logic executed on incoming Express requests
   */
  inspectRequest(req: Request): WafInspectionResult {
    this.totalInspectedRequests++;

    const activeRules = this.rules.filter(r => r.enabled);
    if (activeRules.length === 0) {
      return { blocked: false, detected: false };
    }

    // 1. Scan query parameters
    let match = this.scanValue(req.query, 'query', activeRules);

    // 2. Scan URL path
    if (!match && req.path) {
      match = this.scanValue(req.path, 'path', activeRules);
    }

    // 3. Scan request body
    if (!match && req.body) {
      match = this.scanValue(req.body, 'body', activeRules);
    }

    if (match) {
      const isBlock = match.rule.mode === 'BLOCK';
      if (isBlock) {
        this.totalBlockedRequests++;
      }

      // Record in live WAF detected memory history
      const detectedEvent: WafDetectedEvent = {
        id: `WAF-EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        ruleId: match.rule.id,
        ruleName: match.rule.name,
        category: match.rule.category,
        sourceIp: req.ip || '127.0.0.1',
        path: req.path,
        actionTaken: isBlock ? 'BLOCKED' : 'DETECTED',
        location: match.location,
        snippet: match.snippet
      };

      this.detectedHistory.unshift(detectedEvent);
      if (this.detectedHistory.length > 100) {
        this.detectedHistory.pop();
      }

      return {
        blocked: isBlock,
        detected: true,
        rule: match.rule,
        matchedPattern: match.pattern,
        matchedLocation: match.location,
        detectedPayload: match.snippet
      };
    }

    return { blocked: false, detected: false };
  }

  /**
   * Safe payload simulation helper for Security Demonstration Center
   */
  simulate(payload: string, category?: string): WafInspectionResult {
    const candidateRules = category
      ? this.rules.filter(r => r.enabled && r.category === category)
      : this.rules.filter(r => r.enabled);

    const match = this.scanValue(payload, 'simulation_input', candidateRules);
    if (match) {
      return {
        blocked: match.rule.mode === 'BLOCK',
        detected: true,
        rule: match.rule,
        matchedPattern: match.pattern,
        matchedLocation: match.location,
        detectedPayload: match.snippet
      };
    }

    return { blocked: false, detected: false };
  }

  getRules(): WafRule[] {
    return [...this.rules];
  }

  updateRule(ruleId: string, updates: { enabled?: boolean; mode?: WafRuleMode }): WafRule {
    const rule = this.rules.find(r => r.id === ruleId);
    if (!rule) throw new Error('RULE_NOT_FOUND');

    if (updates.enabled !== undefined) rule.enabled = updates.enabled;
    if (updates.mode !== undefined) rule.mode = updates.mode;

    return rule;
  }

  getOverview() {
    return {
      totalInspectedRequests: Math.max(this.totalInspectedRequests, 24),
      totalBlockedRequests: this.totalBlockedRequests,
      activeRulesCount: this.rules.filter(r => r.enabled).length,
      rules: this.rules.map(r => ({
        id: r.id,
        name: r.name,
        category: r.category,
        severity: r.severity,
        description: r.description,
        enabled: r.enabled,
        mode: r.mode
      })),
      recentDetections: this.detectedHistory.slice(0, 50)
    };
  }
}

export const wafService = new WafService();
