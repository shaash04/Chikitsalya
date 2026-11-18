import { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/adminService.js';
import { createDoctorSchema, updateUserStatusSchema, idParamSchema } from '../validators/index.js';

export class AdminController {
  async provisionDoctor(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = createDoctorSchema.parse(req.body);
      const result = await adminService.provisionDoctor(validated, req.sessionUser!, req);
      return res.status(201).json({
        success: true,
        message: 'Doctor account provisioned successfully by administrator.',
        data: result
      });
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') {
        return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Doctor email is already registered.' } });
      }
      if (err.message === 'USERNAME_EXISTS') {
        return res.status(409).json({ success: false, error: { code: 'USERNAME_EXISTS', message: 'Doctor username already in use.' } });
      }
      next(err);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.getAllUsers();
      return res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const { isActive } = updateUserStatusSchema.parse(req.body);
      await adminService.setUserActiveStatus(id, isActive, req.sessionUser!, req);
      return res.json({
        success: true,
        message: `User status set to ${isActive === 1 ? 'Active' : 'Deactivated'}.`
      });
    } catch (err: any) {
      if (err.message === 'CANNOT_DEACTIVATE_SELF') {
        return res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Security restriction: An administrator cannot deactivate their own active account.' }
        });
      }
      next(err);
    }
  }

  async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await adminService.getDashboardStats();
      return res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
