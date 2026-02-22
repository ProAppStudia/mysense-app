import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';

export interface DiaryQuestion {
  id: number;
  title: string;
  placeholder: string;
  sort_order?: number;
}

export interface DiaryCatalogResponse {
  questions: DiaryQuestion[];
  questionsHeader: string;
  mood: { items: Array<{ id: string; name: string; icon: string; type: string }>; header: string };
  body: { items: Array<{ id: string; name: string; icon: string }>; header: string };
}

export interface DiaryEntryNormalized {
  id?: number;
  date: string;
  mood: string[];
  body: string[];
  text: string;
  answers: Array<{ id: number; answer: string; question?: string; placeholder?: string }>;
}

export interface SaveDiaryEntryPayload {
  date: string;
  mood: string[];
  body: string[];
  text: string;
  answers: Record<number, string>;
  id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DiaryService {
  private apiUrl = 'https://mysense.care/app/connector.php';
  private readonly formHeaders = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded'
  });

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) { }

  getDiaryQuestions(): Observable<DiaryCatalogResponse> {
    return this.http.get(`${this.apiUrl}?action=get_diary_questions`).pipe(
      map((response: any) => {
        const rawQuestions = response?.questions?.items ? Object.values(response.questions.items) : [];
        const questions = (rawQuestions as DiaryQuestion[])
          .slice()
          .sort((a, b) => Number(a?.sort_order ?? 0) - Number(b?.sort_order ?? 0));

        return {
          questions,
          questionsHeader: String(response?.questions?.header ?? ''),
          mood: response?.mood ?? { items: [], header: '' },
          body: response?.body ?? { items: [], header: '' }
        };
      })
    );
  }

  getDiaryByDate(date: string): Observable<DiaryEntryNormalized | null> {
    const authToken = this.tokenStorage.getToken();
    if (!authToken) {
      return of(null);
    }
    const appId = this.tokenStorage.ensureDiaryToken();
    const body = new HttpParams()
      .set('date', date)
      .set('app_id', appId)
      .set('token', authToken);

    return this.http.post(`${this.apiUrl}?action=get_diary_by_date`, body.toString(), { headers: this.formHeaders }).pipe(
      map((response: any) => {
        const rows = Array.isArray(response?.results) ? response.results : [];
        if (!rows.length) {
          return null;
        }
        return this.normalizeApiEntry(rows[0], date);
      }),
      catchError(() => of(null))
    );
  }

  getDiaryEntriesForMonth(year: number, month: number): Observable<Record<string, boolean>> {
    const authToken = this.tokenStorage.getToken();
    if (!authToken) {
      return of({});
    }
    const diaryToken = this.tokenStorage.ensureDiaryToken();
    const monthNumber = month + 1;
    const url = `${this.apiUrl}?action=get_diary_for_month&year=${year}&month=${monthNumber}&app_id=${encodeURIComponent(diaryToken)}&token=${encodeURIComponent(authToken)}`;

    return this.http.get(url).pipe(
      map((response: any) => this.normalizeMonthEntries(response)),
      catchError(() => of({}))
    );
  }

  saveDiaryEntry(entry: SaveDiaryEntryPayload): Observable<any> {
    const authToken = this.tokenStorage.getToken();
    if (!authToken) {
      return throwError(() => new Error('Потрібна авторизація'));
    }
    const appId = this.tokenStorage.ensureDiaryToken();
    const form = new FormData();
    form.append('app_id', appId);
    form.append('token', authToken);
    form.append('date', entry.date);
    form.append('text', entry.text ?? '');

    if (entry.id) {
      form.append('id', String(entry.id));
    }

    (entry.mood ?? []).forEach((moodId) => form.append('mood[]', moodId));
    (entry.body ?? []).forEach((bodyId) => form.append('body[]', bodyId));
    Object.entries(entry.answers ?? {}).forEach(([questionId, answer]) => {
      form.append(`answer[${questionId}]`, answer ?? '');
    });

    const url = `${this.apiUrl}?action=set_diary`;
    return this.http.post(url, form).pipe(
      map((response: any) => {
        if (response?.error) {
          throw new Error(String(response.error));
        }
        return response;
      }),
      catchError(() => {
        return throwError(() => new Error('Не вдалося зберегти запис.'));
      })
    );
  }

  private normalizeApiEntry(raw: any, date: string): DiaryEntryNormalized {
    const mood = Array.isArray(raw?.mood) ? raw.mood.map((v: any) => String(v)) : [];
    const body = Array.isArray(raw?.body) ? raw.body.map((v: any) => String(v)) : [];
    const answers = Array.isArray(raw?.answers)
      ? raw.answers.map((item: any) => ({
          id: Number(item?.id ?? 0),
          answer: String(item?.answer ?? ''),
          question: item?.question ? String(item.question) : undefined,
          placeholder: item?.placeholder ? String(item.placeholder) : undefined
        }))
      : [];

    return {
      id: Number(raw?.id ?? 0) || undefined,
      date,
      mood,
      body,
      text: String(raw?.text ?? ''),
      answers
    };
  }

  private normalizeMonthEntries(response: any): Record<string, boolean> {
    const result: Record<string, boolean> = {};

    if (Array.isArray(response?.results)) {
      response.results.forEach((item: any) => {
        const date = String(item?.date ?? item?.day ?? '').slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          result[date] = true;
        }
      });
      return result;
    }

    if (response && typeof response === 'object') {
      Object.entries(response).forEach(([key, value]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key) && !!value) {
          result[key] = true;
        }
      });
    }

    return result;
  }
}
