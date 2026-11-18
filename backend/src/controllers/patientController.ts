import { Request, Response, NextFunction } from 'express';
import { patientRepository } from '../repositories/patientRepository.js';
import { userRepository } from '../repositories/userRepository.js';

export class PatientController {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.sessionUser!.userId;
      const patient = await patientRepository.findByUserId(userId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' }
        });
      }
      return res.json({ success: true, data: patient });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.sessionUser!.userId;
      const patient = await patientRepository.findByUserId(userId);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: { code: 'PATIENT_NOT_FOUND', message: 'Patient profile not found.' }
        });
      }

      const { fullName, phone, emergencyContact, address, allergies, medicalHistory } = req.body;

      // Mass assignment protection: only update allowlisted fields
      if (fullName) {
        await userRepository.updateProfile(userId, fullName, phone);
      }

      await patientRepository.update(patient.id, {
        emergencyContact: emergencyContact || patient.emergency_contact,
        address: address || patient.address,
        allergies: allergies !== undefined ? allergies : patient.allergies,
        medicalHistory: medicalHistory !== undefined ? medicalHistory : patient.medical_history
      });

      const updated = await patientRepository.findById(patient.id);
      return res.json({
        success: true,
        message: 'Patient profile updated successfully.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  async getAllPatients(req: Request, res: Response, next: NextFunction) {
    try {
      // Accessible only by doctors and admins
      const patients = await patientRepository.findAll();
      return res.json({ success: true, data: patients });
    } catch (err) {
      next(err);
    }
  }
}

export const patientController = new PatientController();
