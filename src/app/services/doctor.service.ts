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

  getPsychologists(): Observable<DoctorCardView[]> {
    const params = new HttpParams().set('action', 'get_psychologists');
    return this.http.get(this.apiUrl, { params, responseType: 'text' }).pipe(
      map(response => {
        try {
          const data = JSON.parse(response);
          if (data && Array.isArray(data.doctors)) {
            return data.doctors.map((doc: any) => this.transformToDoctorCardView(doc));
          }
          return [];
        } catch (e) {
          return [];
        }
      }),
      catchError(() => of([])) // On error, return an empty array
    );
  }

  private transformToDoctorCardView(data: any): DoctorCardView {
    return {
      id: data.doctor_id,
      fullName: data.fullname,
      city: data.city_name,
      avatarUrl: data.img,
      online: data.work_type.includes('Онлайн'),
      inPerson: data.work_type.includes('Очно'),
      specialization: data.specialisation,
      experienceYears: data.practice_years,
      sessionsCount: data.practice_time_hours,
      feedbackCount: data.reiviews, // Corrected from 'reviews_count' to 'reiviews' based on log
      introMinutes: undefined, // Not directly available in the list view
      priceIndividual: data.session_amount,
      priceFamily: data.family_session_amount,
      verified: true, // Assuming all listed are verified
    };
  }
}
