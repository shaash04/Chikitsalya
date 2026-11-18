import { Request, Response, NextFunction } from 'express';
import { medicalRecordService } from '../services/medicalRecordService.js';
import { createMedicalRecordSchema, idParamSchema } from '../validators/index.js';

export class MedicalRecordController {
  async getMyRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await medicalRecordService.getRecordsForUser(req.sessionUser!);
      return res.json({ success: true, data: records });
    } catch (err) {
      next(err);
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const record = await medicalRecordService.getRecordById(id, req.sessionUser!, req);
      return res.json({ success: true, data: record });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Medical record not found.' } });
      }
      if (err.message === 'ACCESS_DENIED') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not have permission to view this medical record.' } });
      }
      next(err);
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createMedicalRecordSchema.parse(req.body);
      const recordId = await medicalRecordService.createRecord(validated, req.sessionUser!, req);
      return res.status(201).json({
        success: true,
        message: 'Medical record documented successfully.',
        data: { recordId }
      });
    } catch (err: any) {
      if (err.message === 'ONLY_DOCTORS_CAN_CREATE_RECORDS') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only licensed physicians can create medical records.' } });
      }
      if (err.message === 'PATIENT_NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' } });
      }
      next(err);
    }
  }
}

export const medicalRecordController = new MedicalRecordController();
