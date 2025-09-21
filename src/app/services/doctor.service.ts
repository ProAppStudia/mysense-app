import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DoctorCardView } from '../models/doctor-card-view.model';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = 'https://mysense.care/app/connector.php';

  constructor(private http: HttpClient) { }

  getDoctorProfile(doctorId: number | string): Observable<DoctorCardView | { error: string }> {
    const params = new HttpParams().set('action', 'get_doctor_profile').set('doctor_id', doctorId.toString());

    return this.http.get(this.apiUrl, { params, responseType: 'text' }).pipe(
      map(response => {
        try {
          const data = JSON.parse(response);
          if (data.error) {
            return { error: data.error };
          }
          return this.transformToDoctorCardView(data);
        } catch (e) {
          if (response.includes('error')) {
            return { error: 'An error occurred while fetching the doctor profile.' };
          }
          return { error: 'Invalid response format.' };
        }
      }),
      catchError(error => {
        return of({ error: 'Failed to fetch doctor profile.' });
      })
    );
  }

  private transformToDoctorCardView(data: any): DoctorCardView {
    return {
      id: data.doctor_id,
      fullName: data.fullname,
      city: data.city_name,
      avatarUrl: data.img,
      online: data.work_type === 'online' || data.work_type === 'both',
      inPerson: data.work_type === 'offline' || data.work_type === 'both',
      specialization: data.specialisation,
      experienceYears: data.practice_years,
      sessionsCount: undefined, // Not available in the API response
      feedbackCount: data.reviews_count,
      introMinutes: data.acquaintance ? 15 : undefined,
      priceIndividual: data.session_amount,
      priceFamily: data.family_session_amount,
      verified: false, // Not available in the API response
    };
  }
}
