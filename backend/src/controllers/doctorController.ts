import { Request, Response, NextFunction } from 'express';
import { doctorRepository } from '../repositories/doctorRepository.js';
import { searchSchema } from '../validators/index.js';

export class DoctorController {
  async getDirectory(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = searchSchema.parse(req.query);
      const doctors = await doctorRepository.findAll(q);
      return res.json({
        success: true,
        data: doctors
      });
    } catch (err) {
      next(err);
    }
  }

  async getDoctorById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const doctor = await doctorRepository.findById(id);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor profile not found.' }
        });
      }
      return res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const doctor = await doctorRepository.findByUserId(req.sessionUser!.userId);
      if (!doctor) {
        return res.status(404).json({
          success: false,
          error: { code: 'DOCTOR_NOT_FOUND', message: 'Doctor record not found.' }
        });
      }
      return res.json({ success: true, data: doctor });
    } catch (err) {
      next(err);
    }
  }
}

export const doctorController = new DoctorController();
