import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.baseUrl}/connector.php`;

  constructor(private http: HttpClient) { }

  getTestQuestions(): Observable<any> {
    const params = new HttpParams().set('action', 'get_test_questions');
    return this.http.get(this.apiUrl, { params }).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error fetching test questions:', error);
        return of({ step: {} }); // Return an object with an empty 'step' to prevent errors
      })
    );
  }

  getPsychologists(filters?: any): Observable<DoctorCardView[]> {
    let params = new HttpParams().set('action', 'get_psychologists');
    if (filters) {
      if (filters.type) {
        params = params.append('type', filters.type);
      }
      if (filters.format) {
        params = params.append('format', filters.format);
      }
      if (filters.gender) {
        params = params.append('gender', filters.gender);
      }
      if (filters.language) {
        params = params.append('language', filters.language);
      }
      if (filters.priceRange) {
        params = params.append('price_min', filters.priceRange.lower);
        params = params.append('price_max', filters.priceRange.upper);
      }
      if (filters.directions && filters.directions.length > 0) {
        params = params.append('directions', filters.directions.join(','));
      }
    }

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        if (response && Array.isArray(response.doctors)) {
          return response.doctors.map((doc: any) => this.transformToDoctorCardView(doc));
        }
        return [];
      }),
      catchError(error => {
        console.error('Error fetching psychologists:', error);
        return of([]); // On error, return an empty array
      })
    );
  }

  getDoctorProfile(doctorId: number | string): Observable<DoctorCardView | { error: string }> {
    const params = new HttpParams().set('action', 'get_doctor_profile').set('doctor_id', doctorId.toString());

    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        if (response.error) {
          return { error: response.error };
        }
        return this.transformToDoctorCardView(response);
      }),
      catchError(error => {
        console.error('Error fetching doctor profile:', error);
        return of({ error: 'Failed to fetch doctor profile.' });
      })
    );
  }

  private transformToDoctorCardView(data: any): DoctorCardView {
    let worksWith = [];
    if (Array.isArray(data.work_with)) {
      worksWith = data.work_with;
    } else if (typeof data.work_with === 'string') {
      worksWith = data.work_with.split(',').map((s: string) => s.trim());
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
      worksWith: worksWith,
      doNotWorkWith: data.do_not_work_with || [],
      worksWithMilitary: data.work_with_military === 1 || data.work_with_military === '1' || data.work_with_military === true,
worksWithLgbt:     data.work_with_lgbt     === 1 || data.work_with_lgbt     === '1' || data.work_with_lgbt     === true,
      languages: data.languages || [],
      description: data.description,
      universities: data.universities || [],
      doctorFiles: data.doctor_files || [],
      calendar: data.calendar,
      reviews: data.reviews || [],
    };
  }
}
