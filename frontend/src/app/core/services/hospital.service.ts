import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HospitalService {
  private readonly baseUrl = typeof window !== 'undefined' && window.location.port === '4200' ? 'http://localhost:4000/api' : '/api';

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dashboard/stats`);
  }

  getDoctors(query?: string): Observable<any> {
    const options = query ? { params: { q: query } } : {};
    return this.http.get<any>(`${this.baseUrl}/doctors`, options);
  }

  getDoctorById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/doctors/${id}`);
  }

  getMyAppointments(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/appointments`);
  }

  getAppointmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/appointments/${id}`);
  }

  bookAppointment(data: { doctorId: number; appointmentDate: string; timeSlot: string; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/appointments`, data);
  }

  cancelAppointment(id: number, reason: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/appointments/${id}/cancel`, { reason });
  }

  updateAppointmentStatus(id: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/appointments/${id}/status`, { status });
  }

  getMyMedicalRecords(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/medical-records`);
  }

  getMedicalRecordById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/medical-records/${id}`);
  }

  createMedicalRecord(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/medical-records`, data);
  }

  getPatientProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients/profile`);
  }

  updatePatientProfile(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/patients/profile`, data);
  }

  getAllPatients(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/patients`);
  }

  getAllUsers(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/admin/users`);
  }

  setUserStatus(id: number, isActive: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/admin/users/${id}/status`, { isActive });
  }

  provisionDoctor(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/admin/doctors`, data);
  }

  getAuditLogs(filter?: { eventType?: string; outcome?: string; limit?: number }): Observable<any> {
    const params: Record<string, string> = {};
    if (filter?.eventType) params['eventType'] = filter.eventType;
    if (filter?.outcome) params['outcome'] = filter.outcome;
    if (filter?.limit) params['limit'] = String(filter.limit);
    return this.http.get<any>(`${this.baseUrl}/audit-logs`, { params });
  }
}
