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
    const worksWith = [];
    if (Array.isArray(data.work_with)) {
        worksWith.push(...data.work_with);
    } else {
        if (data.work_with_military === '1' || data.work_with_military === true) {
            worksWith.push('Військовими');
        }
        if (data.work_with_lgbt === '1' || data.work_with_lgbt === true) {
            worksWith.push('ЛГБТКІ+');
        }
    }

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
      feedbackCount: data.reiviews,
      introMinutes: data.acquaintance ? 15 : undefined,
      priceIndividual: data.session_amount,
      priceFamily: data.family_session_amount,
      verified: true,
      videoAppealUrl: data.video_appeal_file,
      workWithTypes: data.types || [],
     worksWithMilitary: data.work_with_military === 1 || data.work_with_military === '1' || data.work_with_military === true,
worksWithLgbt:     data.work_with_lgbt     === 1 || data.work_with_lgbt     === '1' || data.work_with_lgbt     === true,
      languages: data.languages || [],
    };
  }
}
