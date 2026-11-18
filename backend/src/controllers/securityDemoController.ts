import { Request, Response, NextFunction } from 'express';
import { securityDemoService } from '../services/securityDemoService.js';
import { auditLogRepository } from '../repositories/auditLogRepository.js';

export class SecurityDemoController {
  async getFeaturesMatrix(req: Request, res: Response) {
    const features = [
      {
        id: 1,
        name: 'Password Hashing',
        threat: 'Credential dumping, rainbow table cracking, plaintext exposure',
        file: 'backend/src/utils/security.ts',
        procedure: 'Inspect database password column and verify bcrypt hash expansion (cost 12)',
        expectedResult: 'Passwords stored strictly as salted hashes; plaintext never logged or stored',
        testAction: 'test-password-hash'
      },
      {
        id: 2,
        name: 'Authentication & Secure Sessions',
        threat: 'Session hijacking, session fixation, token theft via XSS',
        file: 'backend/src/middleware/sessionAuth.ts',
        procedure: 'Inspect session cookie flags (HttpOnly, SameSite, Secure) & trigger logout',
        expectedResult: 'Cookies inaccessible to JavaScript; server destroys session on logout',
        testAction: 'test-session'
      },
      {
        id: 3,
        name: 'Role-Based Access Control (RBAC)',
        threat: 'Privilege escalation, unauthorized access to doctor/admin resources',
        file: 'backend/src/middleware/rbac.ts',
        procedure: 'Send request to Admin API using Patient or Doctor credentials',
        expectedResult: 'Server returns HTTP 403 Forbidden and writes event to security audit log',
        testAction: 'test-rbac'
      },
      {
        id: 4,
        name: 'SQL Injection Prevention',
        threat: 'Authentication bypass, unauthorized database queries, data exfiltration',
        file: 'backend/src/repositories/*',
        procedure: "Submit harmless injection string: ' OR '1'='1 into email/search query",
        expectedResult: 'Prepared statements treat input as literal data parameter; query meaning unaltered',
        testAction: 'test-sqli'
      },
      {
        id: 5,
        name: 'Cross-Site Scripting (XSS) Prevention',
        threat: 'Malicious script injection, DOM manipulation, cookie stealing',
        file: 'backend/src/middleware/securityHeaders.ts & Angular Template Binding',
        procedure: "Submit payload: <script>alert('XSS')</script> in text input",
        expectedResult: 'Angular interpolation encodes entities; Helmet CSP blocks script execution',
        testAction: 'test-xss'
      },
      {
        id: 6,
        name: 'CSRF Protection',
        threat: 'Cross-site unauthorized state-changing POST/PUT requests',
        file: 'backend/src/middleware/csrf.ts',
        procedure: 'Send POST request without X-CSRF-Token or with tampered token',
        expectedResult: 'Server rejects request with HTTP 403 Forbidden (CSRF_TOKEN_MISSING)',
        testAction: 'test-csrf'
      },
      {
        id: 7,
        name: 'Brute-Force Rate Limiting',
        threat: 'Credential stuffing, automated dictionary attacks, Denial of Service',
        file: 'backend/src/middleware/rateLimiter.ts',
        procedure: 'Exceed 5 rapid login attempts from the same IP address',
        expectedResult: 'Server throttles requests with HTTP 429 Too Many Requests & locks account',
        testAction: 'test-rate-limit'
      },
      {
        id: 8,
        name: 'Security Response Headers',
        threat: 'Clickjacking, MIME-type sniffing, cross-domain leakage',
        file: 'backend/src/middleware/securityHeaders.ts',
        procedure: 'Inspect response headers using network analyzer or test endpoint',
        expectedResult: 'CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff present',
        testAction: 'test-headers'
      },
      {
        id: 9,
        name: 'Input Validation & Error Handling',
        threat: 'Malformed payloads, buffer overflows, implementation disclosure',
        file: 'backend/src/validators/index.ts & backend/src/middleware/errorHandler.ts',
        procedure: 'Submit malformed JSON, invalid email syntax, or out-of-range IDs',
        expectedResult: 'Zod rejects request with 400; stack traces and SQL queries suppressed',
        testAction: 'test-validation'
      },
      {
        id: 10,
        name: 'Patient Privacy & IDOR Prevention',
        threat: 'Horizontal privilege escalation, viewing other patients clinical records',
        file: 'backend/src/middleware/rbac.ts (requireRecordAccess)',
        procedure: 'Login as Patient A and attempt to query Medical Record of Patient B',
        expectedResult: 'Server denies access with HTTP 403/404; private data is not disclosed',
        testAction: 'test-idor'
      },
      {
        id: 11,
        name: 'Security Audit Logs',
        threat: 'Undetected intrusion, repudiation of sensitive administrative actions',
        file: 'backend/src/repositories/auditLogRepository.ts',
        procedure: 'Execute sensitive operations and inspect database audit log entries',
        expectedResult: 'Immutable log records actor, IP, event type, correlation ID, and outcome',
        testAction: 'test-audit'
      },
      {
        id: 12,
        name: 'Secure Configuration & Secrets',
        threat: 'Hardcoded credentials in source control, runtime misconfiguration',
        file: 'backend/src/config/env.ts',
        procedure: 'Inspect environment variable schema validation and secret isolation',
        expectedResult: 'Secrets stored in .env, validated at boot; never sent to client API',
        testAction: 'test-config'
      }
    ];

    return res.json({
      success: true,
      features
    });
  }

  async testPasswordHash(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await securityDemoService.testPasswordHashing();
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async testSqlInjection(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body.payload || "' OR '1'='1";
      const result = await securityDemoService.testSqlInjection(payload);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async testXss(req: Request, res: Response) {
    const payload = req.body.payload || "<script>alert('XSS Vulnerability')</script>";
    const result = securityDemoService.testXssSanitization(payload);
    return res.json({ success: true, data: result });
  }

  async testCsrf(req: Request, res: Response) {
    const token = req.headers['x-csrf-token'] as string | undefined;
    const result = securityDemoService.testCsrfProtection(token);
    return res.json({ success: true, data: result });
  }

  async testIdor(req: Request, res: Response, next: NextFunction) {
    try {
      const targetRecordId = Number(req.body.recordId || 3);
      const simulatedRole = req.body.role || 'patient';
      const simulatedUserId = Number(req.body.userId || 4); // John Doe trying to access Jane Smith's record 3
      const result = await securityDemoService.testIdorProtection(targetRecordId, simulatedRole, simulatedUserId);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  getSecurityHeaders(req: Request, res: Response) {
    const result = securityDemoService.getSecurityHeadersReport();
    return res.json({ success: true, data: result });
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await securityDemoService.getAuditLogSample();
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  getSecureConfig(req: Request, res: Response) {
    const result = securityDemoService.getSecureConfigReport();
    return res.json({ success: true, data: result });
  }
}

export const securityDemoController = new SecurityDemoController();
