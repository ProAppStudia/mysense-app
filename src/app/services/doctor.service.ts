import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { environment } from '../../environments/environment';

interface PostResultsResponse {
  doctors?: any[]; // Array of doctors
  doctor_counts?: number;
  test_token?: string;
  is_doctor?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DoctorService {
  private apiUrl = `${environment.baseUrl}/connector.php`;
  // Default prices, these will be overridden by FilterModalComponent's @Input if available
  private prices: { min_price: number, max_price: number } = { min_price: 900, max_price: 2700 };

  constructor(private http: HttpClient) { }

  // New methods for the test flow
  loadTestSchema(): Observable<any> {
    const params = new HttpParams().set('action', 'get_test_questions');
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(response => {
        console.log('API Response (get_test_questions):', response);
        return response;
      })
    );
  }

  postResults(body: any): Observable<PostResultsResponse> {
    const params = new HttpParams().set('action', 'get_test_results');
    return this.http.post<PostResultsResponse>(this.apiUrl, body, { params }).pipe(
      map(response => {
        console.log('API Response (get_test_results):', response);
        return response;
      })
    );
  }

  getResultsByToken(token: string): Observable<PostResultsResponse> {
    const params = new HttpParams().set('action', 'get_test_results').set('test_token', token);
    return this.http.get<PostResultsResponse>(this.apiUrl, { params }).pipe(
      map(response => {
        console.log('API Response (get_test_results by token):', response);
        return response;
      })
    );
  }

  // Original methods (restored)
  getTestQuestions(): Observable<any> {
    const params = new HttpParams().set('action', 'get_test_questions');
    return this.http.get(this.apiUrl, { params }).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error fetching test questions:', error);
        return of(null);
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

      console.log('DoctorService: POST Body for getPsychologists (with filters):', JSON.stringify(body, null, 2));

      return this.http.post(this.apiUrl, body, { params, responseType: 'text' }).pipe(
        map(response => {
          console.log('DoctorService: API Response for getPsychologists:', response);
          try {
            const data = JSON.parse(response);
            if (data && Array.isArray(data.doctors)) {
              return data.doctors.map((doc: any) => this.transformToDoctorCardView(doc));
            }
            return [];
          } catch (e) {
            console.error('Error parsing API response for POST:', e);
            return [];
          }
        }),
        catchError(error => {
          console.error('Error fetching psychologists with POST:', error);
          return of([]);
        })
      );
    }
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

  getDoctorProfileByHash(hash: string): Observable<DoctorCardView | { error: string }> {
    const params = new HttpParams().set('action', 'get_doctor_profile').set('hash', hash);

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
            return { error: 'An error occurred while fetching the doctor profile by hash.' };
          }
          return { error: 'Invalid response format.' };
        }
      }),
      catchError(() => {
        return of({ error: 'Failed to fetch doctor profile by hash.' });
      })
    );
  }

  getDoctorProfileByUserId(userId: number | string): Observable<DoctorCardView | { error: string }> {
    const params = new HttpParams().set('action', 'get_doctor_profile').set('user_id', userId.toString());

    return this.http.get(this.apiUrl, { params, responseType: 'text' }).pipe(
      map(response => {
        try {
          const data = JSON.parse(response);
          if (data.error) {
            return { error: data.error };
          }
          return this.transformToDoctorCardView(data);
        } catch {
          if (response.includes('error')) {
            return { error: 'An error occurred while fetching the doctor profile by user_id.' };
          }
          return { error: 'Invalid response format.' };
        }
      }),
      catchError(() => {
        return of({ error: 'Failed to fetch doctor profile by user_id.' });
      })
    );
  }

  transformToDoctorCardView(data: any): DoctorCardView {
    let worksWith = [];
    if (Array.isArray(data.work_with)) {
      worksWith = data.work_with;
    } else if (typeof data.work_with === 'string') {
      worksWith = data.work_with.split(',').map((s: string) => s.trim());
    }

    const therapyTypeIds = this.extractTherapyTypeIds(data);
    const workType = this.extractWorkTypeFlags(data?.work_type);
    const childAgeLabels = this.extractChildAgeLabels(data);
    let normalizedWorkWithTypes = this.normalizeWorkWithTypes(data?.types, therapyTypeIds);
    if (childAgeLabels.length && !normalizedWorkWithTypes.some((item) => /д[іi]т|дит|child/i.test(String(item)))) {
      normalizedWorkWithTypes = [...normalizedWorkWithTypes, 'Діти'];
    }

    return {
      id: data.doctor_id,
      userId: data.user_id,
      hash: data.hash,
      fullName: data.fullname,
      city: data.city_name,
      avatarUrl: data.img,
      online: workType.online,
      inPerson: workType.inPerson,
      rawWorkType: data.work_type, // Populate rawWorkType
      therapyTypeIds,
      specialization: data.specialisation,
      experienceYears: data.practice_years,
      sessionsCount: data.practice_time_hours,
      feedbackCount: data.reviews_count,
      reviewsCountText: data.reviews_count_text,
      introMinutes: data.acquaintance ? 15 : undefined,
      priceIndividual: data.session_amount,
      priceFamily: data.family_session_amount,
      verified: true,
      videoAppealUrl: data.video_appeal_file,
      workWithTypes: normalizedWorkWithTypes,
      childAgeLabels,
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

  private normalizeWorkWithTypes(rawTypes: any, therapyTypeIds: number[]): string[] {
    const list = Array.isArray(rawTypes)
      ? rawTypes
      : (typeof rawTypes === 'string' ? rawTypes.split(',') : []);

    const normalized: string[] = [];
    let hasChildType = therapyTypeIds.includes(3);

    for (const token of list) {
      const text = String(token ?? '').trim();
      if (!text) {
        continue;
      }

      if (/^\d+$/.test(text)) {
        const n = Number(text);
        if (n === 1) {
          normalized.push('Дорослі');
          continue;
        }
        if (n === 2) {
          normalized.push("Сім'ї (пари)");
          continue;
        }
        if ([3, 4, 5].includes(n)) {
          hasChildType = true;
          continue;
        }
      }

      if (/д[іi]т|дит|child/i.test(text)) {
        hasChildType = true;
        continue;
      }

      normalized.push(text);
    }

    if (hasChildType) {
      normalized.push('Діти');
    }

    // Keep canonical therapy types even if raw `types` is partial/inconsistent.
    if (therapyTypeIds.includes(1)) {
      normalized.push('Дорослі');
    }
    if (therapyTypeIds.includes(2)) {
      normalized.push("Сім'ї (пари)");
    }

    const compact = normalized
      .map((item) => String(item ?? '').trim())
      .filter(Boolean)
      .map((item) => (/д[іi]т|дит|child/i.test(item) ? 'Діти' : item))
      .filter((item) => !/д[іi]т[иi]\s*в[іi]д\s*\d+/i.test(item))
      .filter((item) => !/^\d{1,2}\s*[-–]\s*\d{1,2}\s*рок/i.test(item));

    const dedup = new Set<string>();
    return compact.filter((item) => {
      const key = item.toLowerCase();
      if (dedup.has(key)) {
        return false;
      }
      dedup.add(key);
      return true;
    });
  }

  private extractChildAgeLabels(data: any): string[] {
    const sources = [
      data?.child_age_categories,
      data?.child_age_category,
      data?.child_categories,
      data?.child_ages,
      data?.children_age_categories,
      data?.doctor_child_age_categories,
      data?.child_age_categories_ids,
      data?.child_age,
      data?.types,
    ];

    const ranges = new Set<string>();

    for (const source of sources) {
      if (!source) {
        continue;
      }

      let normalizedItems: any[] = Array.isArray(source) ? source : [source];
      if (typeof source === 'string') {
        const text = source.trim();
        if (text.startsWith('[') || text.startsWith('{')) {
          try {
            const parsed = JSON.parse(text);
            normalizedItems = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            normalizedItems = [source];
          }
        }
      }
      for (const item of normalizedItems) {
        const parsedRanges = this.parseChildRangeToken(item);
        for (const range of parsedRanges) {
          if (range) {
            ranges.add(range);
          }
        }
      }
    }

    return Array.from(ranges).sort((a, b) => {
      const [aStart] = a.split('-').map((n) => Number(n));
      const [bStart] = b.split('-').map((n) => Number(n));
      return aStart - bStart;
    });
  }

  private parseChildRangeToken(token: any): string[] {
    if (token === null || token === undefined) {
      return [];
    }

    if (typeof token === 'number' || /^\d+$/.test(String(token).trim())) {
      const n = Number(token);
      if (Number.isFinite(n) && n > 0) {
        const mapped = this.mapChildCategoryIdToRange(n);
        return [mapped || `${n}-${n}`];
      }
    }

    if (typeof token === 'string') {
      const text = token.trim();
      if (text.includes(',')) {
        return text
          .split(',')
          .map((part) => this.parseChildRangeToken(part))
          .reduce((acc: string[], cur: string[]) => acc.concat(cur), [])
          .filter(Boolean);
      }
      const rangeRegex = /(\d{1,2})\s*[-–]\s*(\d{1,2})/g;
      const ranges: string[] = [];
      let match: RegExpExecArray | null = null;
      while ((match = rangeRegex.exec(text)) !== null) {
        ranges.push(`${Number(match[1])}-${Number(match[2])}`);
      }
      if (ranges.length) {
        return ranges;
      }

      // Backend may return strings like "Діти від 4 років" where 4 is a category id.
      const idLikeMatch = text.match(/\b(\d{1,2})\b/);
      if (idLikeMatch) {
        const n = Number(idLikeMatch[1]);
        if (Number.isFinite(n) && n > 0) {
          const mapped = this.mapChildCategoryIdToRange(n);
          if (mapped) {
            return [mapped];
          }
        }
      }
      return [];
    }

    if (typeof token === 'object') {
      const from = Number(
        token?.from ?? token?.min ?? token?.start ?? token?.age_from ?? token?.category_from
      );
      const to = Number(
        token?.to ?? token?.max ?? token?.end ?? token?.age_to ?? token?.category_to
      );

      if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0) {
        const lo = Math.min(from, to);
        const hi = Math.max(from, to);
        return [`${lo}-${hi}`];
      }

      const single = Number(token?.category ?? token?.age ?? token?.value ?? token?.id);
      if (Number.isFinite(single) && single > 0) {
        const mapped = this.mapChildCategoryIdToRange(single);
        return [mapped || `${single}-${single}`];
      }
    }

    return [];
  }

  private mapChildCategoryIdToRange(value: number): string {
    const map: Record<number, string> = {
      3: '6-10',
      4: '10-15',
      5: '15-18'
    };
    return map[value] || '';
  }

  private extractWorkTypeFlags(workTypeRaw: any): { online: boolean; inPerson: boolean } {
    const raw = String(workTypeRaw ?? '').trim().toLowerCase();
    if (!raw) {
      return { online: false, inPerson: false };
    }

    const normalized = raw.replace(/\s|_/g, '').replace('-', '');
    const hasBoth = ['both', 'усі', 'обидва', 'онлайночно'].some((v) => normalized.includes(v));
    const online = hasBoth || ['онлайн', 'online', 'online', 'online'].some((v) => normalized.includes(v.replace('-', '')));
    const inPerson = hasBoth || ['очно', 'офлайн', 'offline', 'offline'].some((v) => normalized.includes(v.replace('-', '')));

    return { online, inPerson };
  }

  private extractTherapyTypeIds(data: any): number[] {
    const candidates = [
      data?.therapy_type,
      data?.therapy_types,
      data?.therapy_type_ids,
      data?.types,
      data?.type_ids
    ];

    const ids = new Set<number>();
    for (const candidate of candidates) {
      this.normalizeTherapyTypeSource(candidate).forEach((id) => ids.add(id));
    }

    return Array.from(ids).sort((a, b) => a - b);
  }

  private normalizeTherapyTypeSource(source: any): number[] {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      const out: number[] = [];
      for (const item of source) {
        out.push(...this.mapTherapyToken(item));
      }
      return out;
    }

    if (typeof source === 'object') {
      const out: number[] = [];
      const values = Object.values(source);
      for (const item of values) {
        out.push(...this.mapTherapyToken(item));
      }
      return out;
    }

    if (typeof source === 'string') {
      const raw = source.trim();
      try {
        const parsed = JSON.parse(raw);
        return this.normalizeTherapyTypeSource(parsed);
      } catch {
        const out: number[] = [];
        for (const item of raw.split(',')) {
          out.push(...this.mapTherapyToken(item));
        }
        return out;
      }
    }

    return this.mapTherapyToken(source);
  }

  private mapTherapyToken(token: any): number[] {
    const asNumber = Number(token);
    if (Number.isFinite(asNumber) && [1, 2, 3].includes(asNumber)) {
      return [asNumber];
    }

    const text = String(token ?? '').trim().toLowerCase();
    if (!text) {
      return [];
    }

    if (text.includes('індив') || text.includes('индив') || text.includes('individual')) {
      return [1];
    }
    if (text.includes('сім') || text.includes('сем') || text.includes('пар') || text.includes('family')) {
      return [2];
    }
    if (text.includes('дит') || text.includes('child')) {
      return [3];
    }

    return [];
  }
}
