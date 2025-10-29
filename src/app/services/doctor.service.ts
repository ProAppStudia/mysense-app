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
  // Default prices, these will be overridden by FilterModalComponent's @Input if available
  private prices: { min_price: number, max_price: number } = { min_price: 900, max_price: 2700 };

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

  getPsychologists(filters: any = {}): Observable<DoctorCardView[]> {
    // Check if any meaningful filters are applied
    const hasActiveFilters = Object.keys(filters).some(key => {
      if (key === 'type' || key === 'format' || key === 'gender' || key === 'language' || key === 'city_id' || key === 'search') {
        return filters[key] && filters[key] !== 'any' && filters[key] !== null && filters[key] !== '';
      }
      if (key === 'priceRange') {
        return filters.priceRange.lower !== this.prices.min_price || filters.priceRange.upper !== this.prices.max_price;
      }
      if (key === 'direction_id') { // Check for direction_id
        return filters.direction_id !== null;
      }
      if (key === 'directions') { // Keep this for backward compatibility if needed, but it should be undefined now
        return filters.directions && filters.directions.length > 0;
      }
      return false;
    });

    if (!hasActiveFilters) {
      // If no active filters, use the original GET request to fetch all psychologists
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
            console.error('Error parsing API response for GET:', e);
            return [];
          }
        }),
        catchError(error => {
          console.error('Error fetching psychologists with GET:', error);
          return of([]);
        })
      );
    } else {
      // If filters are present, use the POST request
      let params = new HttpParams().set('action', 'get_psychologists');
      const body: any = {}; // Initialize an empty body for POST

      if (filters.type) {
        body.type_id = filters.type;
      }
      if (filters.format) {
        body.format = filters.format;
      }
      if (filters.gender && filters.gender !== 'any') {
        body.gender = filters.gender;
      }
      if (filters.language && filters.language !== 'any') {
        body.language_id = filters.language;
      }
      if (filters.priceRange && (filters.priceRange.lower !== this.prices.min_price || filters.priceRange.upper !== this.prices.max_price)) {
        body.min_price = filters.priceRange.lower;
        body.max_price = filters.priceRange.upper;
      }
      if (filters.direction_id && filters.direction_id !== null) {
        // If direction_id is an array, send it as an array. Otherwise, send as single value.
        body.direction_id = Array.isArray(filters.direction_id) ? filters.direction_id : [filters.direction_id];
      }
      if (filters.city_id && filters.city_id !== null) {
        body.city_id = filters.city_id;
      }
      if (filters.use_pagination !== undefined) {
        body.use_pagination = filters.use_pagination;
      }
      if (filters.search) {
        body.search = filters.search;
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
