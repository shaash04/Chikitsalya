import { Request, Response, NextFunction } from 'express';
import { appointmentService } from '../services/appointmentService.js';
import { createAppointmentSchema, updateAppointmentStatusSchema, rescheduleAppointmentSchema, idParamSchema } from '../validators/index.js';

export class AppointmentController {
  async getMyAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const appointments = await appointmentService.getAppointmentsForUser(req.sessionUser!);
      return res.json({ success: true, data: appointments });
    } catch (err) {
      next(err);
    }
  }

  async getAppointmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const appointment = await appointmentService.getAppointmentById(id, req.sessionUser!);
      return res.json({ success: true, data: appointment });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
      }
      if (err.message === 'ACCESS_DENIED') {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied to this appointment.' } });
      }
      next(err);
    }
  }

  async bookAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createAppointmentSchema.parse(req.body);
      const appointmentId = await appointmentService.bookAppointment(validated, req.sessionUser!, req);
      return res.status(201).json({
        success: true,
        message: 'Appointment booked successfully.',
        data: { appointmentId }
      });
    } catch (err: any) {
      if (err.message === 'DOCTOR_NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'DOCTOR_NOT_FOUND', message: 'Selected doctor not found.' } });
      }
      if (err.message === 'ONLY_PATIENTS_CAN_BOOK') {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only patients can book appointments.' } });
      }
      next(err);
    }
  }

  async cancelAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const reason = req.body.reason || 'Cancelled by patient';
      await appointmentService.cancelAppointment(id, reason, req.sessionUser!, req);
      return res.json({ success: true, message: 'Appointment cancelled.' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Appointment not found.' } });
      }
      if (err.message === 'ACCESS_DENIED') {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Access denied to this appointment.' } });
      }
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { status } = updateAppointmentStatusSchema.parse(req.body);
      await appointmentService.updateStatus(id, status, req.sessionUser!, req);
      return res.json({ success: true, message: `Appointment status updated to ${status}.` });
    } catch (err: any) {
      if (err.message === 'ACCESS_DENIED') {
        return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only authorized clinical staff can update appointment status.' } });
      }
      next(err);
    }
  }
}

export const appointmentController = new AppointmentController();
