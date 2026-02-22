import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../environments/environment';

interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface UserProfile {
  avatar: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  success: boolean;
  user_id: number;
  is_doctor?: boolean | number | string;
  error?: string;
}

export interface UpdateProfilePayload {
  name: string;
  surname: string;
  phone: string;
  email: string;
  password?: string;
  confirm?: string;
  photo?: string;
}

export interface UpdateProfileResponse {
    success?: string;
    error?: string;
}

export interface DoctorStatsResponse {
  success?: boolean | number | string;
  error?: string;
  income?: number | string;
  clients?: number | string;
  clients_text?: string;
  sessions?: number | string;
  sessions_text?: string;
  minutes?: number | string;
  minutes_text?: string;
  batch?: number | string;
  batch_text?: string;
  viewed_articles?: number | string;
  viewed_webinars?: number | string;
}

export interface WorkScheduleDayTime {
  time: string;
  time_int: number;
  is_work: boolean;
}

export interface WorkScheduleDay {
  day_name: string;
  month_name: string;
  day_no: string;
  date: string;
  is_today: boolean;
  times: WorkScheduleDayTime[];
}

export interface WorkScheduleVariant {
  value: number;
  text: string;
  selected: boolean;
}

export interface DoctorWorkScheduleResponse {
  error?: string;
  status?: number;
  google_clandar?: string;
  not_booking_time?: number;
  status_variants?: Record<string, WorkScheduleVariant>;
  not_booking_time_variants?: Record<string, WorkScheduleVariant>;
  google_instruction?: string;
  google_service_email?: string;
  additional_calendars?: string[];
  work_hours?: any[];
  current_date?: string;
  calendar?: Record<string, WorkScheduleDay>;
}

export interface MySessionItem {
  fullname: string;
  photo?: string;
  session_time?: string;
  session_date?: string;
  session_type?: string;
  session_time_period?: string;
  status?: number | string;
  status_id?: number | string;
  status_text?: string;
  status_color?: 'success' | 'danger' | 'primary' | string;
  payment_link?: string;
  who?: number | string;
  client_user_id?: number;
  doctor_id?: number;
  doctor_user_id?: number;
  order_id?: number;
  meet_id?: number;
}

export interface MySessionsResponse {
  success?: boolean;
  error?: string;
  empty_text?: string;
  planned?: MySessionItem[];
  past?: MySessionItem[];
}

export interface ChangeSessionResponse {
  success?: string;
  error?: string;
  show_modal?: boolean;
  confirm?: boolean;
  date?: string;
  time?: string;
  client_name?: string;
  return_money?: boolean;
  return_money_text?: string;
}

export interface DeleteSessionResponse {
  success?: string;
  error?: string;
  return_money?: boolean;
  return_money_text?: string;
}

type RegisterPayload = {
  name: string;
  surname: string;
  email: string;
  phone: string;
  confirm: boolean;
  code?: string;
};

type RegisterResult =
  | { stage: 'awaiting_code'; message: string }
  | { stage: 'done'; success: true; token: string }
  | { stage: 'error'; message: string };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly LOGIN_URL = `${environment.baseUrl}/connector.php?action=login`;
  private readonly REGISTER_URL = `${environment.baseUrl}/connector.php?action=register`;
  private readonly PROFILE_URL = `${environment.baseUrl}/connector.php?action=get_my_profile`;
  private readonly UPDATE_PROFILE_URL = `${environment.baseUrl}/connector.php?action=set_my_profile`;
  private readonly DOCTOR_STATS_URL = `${environment.baseUrl}/connector.php?action=get_my_doctor_stats`;
  private readonly DOCTOR_WORK_SCHEDULE_URL = `${environment.baseUrl}/connector.php?action=get_my_work_schedule`;
  private readonly MY_SESSIONS_URL = `${environment.baseUrl}/connector.php?action=get_my_sessions`;
  private readonly CHANGE_SESSION_URL = `${environment.baseUrl}/connector.php?action=change_session`;
  private readonly DELETE_SESSION_URL = `${environment.baseUrl}/connector.php?action=delete_session`;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) { }

  login(username: string, password: string): Observable<AuthResponse> {
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(this.LOGIN_URL, body.toString(), { headers, responseType: 'text' }).pipe(
      map(responseText => {
        // Attempt to parse as JSON first
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.success === true && jsonResponse.token) {
            this.tokenStorage.setToken(jsonResponse.token);
            window.location.reload(); // Full page reload after successful login
            return { success: true, token: jsonResponse.token };
          } else if (jsonResponse.error) {
            return { success: false, message: jsonResponse.error };
          }
        } catch (e) {
          // Not a JSON response, proceed to text parsing
        }

        // Text parsing for success/error and token extraction
        if (responseText.toLowerCase().includes('success')) {
          const tokenMatch = responseText.match(/(?:token=|"token":")([^"&]+)/i);
          const token = tokenMatch ? tokenMatch[1] : undefined;
          if (token) {
            this.tokenStorage.setToken(token);
            window.location.reload(); // Full page reload after successful login
            return { success: true, token: token };
          }
          return { success: true, message: 'Login successful, but token not found in response.' };
        } else if (responseText.toLowerCase().includes('error')) {
          return { success: false, message: responseText };
        }

        return { success: false, message: 'Unknown response format or login failed.' };
      }),
      catchError(error => {
        console.error('Login API error:', error);
        return of({ success: false, message: 'Network error or server unavailable.' });
      })
    );
  }

  private parseRegisterResponse(responseText: string): RegisterResult {
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.success === true && jsonResponse.token) {
        this.tokenStorage.setToken(jsonResponse.token);
        window.location.reload(); // Full page reload after successful registration
        return { stage: 'done', success: true, token: jsonResponse.token };
      } else if (jsonResponse.show_code_field === true) {
        return { stage: 'awaiting_code', message: jsonResponse.message || 'Code sent. Please check your phone.' };
      } else if (jsonResponse.error) {
        return { stage: 'error', message: jsonResponse.error };
      }
    } catch (e) {
      // Not a JSON response, proceed to text parsing
    }

    // Text parsing for success/error and token extraction
    if (responseText.toLowerCase().includes('show_code_field')) {
      const messageMatch = responseText.match(/(?:message=|"message":")([^"&]+)/i);
      const message = messageMatch ? messageMatch[1] : 'Code sent. Please check your phone.';
      return { stage: 'awaiting_code', message: message };
    } else if (responseText.toLowerCase().includes('success') && responseText.toLowerCase().includes('token')) {
      const tokenMatch = responseText.match(/(?:token=|"token":")([^"&]+)/i);
      const token = tokenMatch ? tokenMatch[1] : '';
      if (token) {
        this.tokenStorage.setToken(token);
        window.location.reload(); // Full page reload after successful registration
        return { stage: 'done', success: true, token: token };
      }
      return { stage: 'error', message: 'Registration successful, but token not found in response.' };
    } else if (responseText.toLowerCase().includes('error')) {
      const errorMatch = responseText.match(/(?:error=|"error":")([^"&]+)/i);
      const errorMessage = errorMatch ? errorMatch[1] : String(responseText); // Ensure errorMessage is always a simple string
      return { stage: 'error', message: errorMessage };
    }

    // Explicitly cast the final return to ensure type compatibility
    return { stage: 'error', message: 'Unknown response format or registration failed.' } as RegisterResult;
  }

  register(payload: RegisterPayload): Observable<RegisterResult> {
    let body = new HttpParams()
      .set('name', payload.name)
      .set('surname', payload.surname)
      .set('email', payload.email)
      .set('phone', payload.phone)
      .set('confirm', payload.confirm ? '1' : '0');

    if (payload.code) {
      body = body.set('code', payload.code);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(this.REGISTER_URL, body.toString(), { headers, responseType: 'text' }).pipe(
      map(responseText => this.parseRegisterResponse(responseText)),
      catchError(error => {
        console.error('Register API error:', error);
        return of({ stage: 'error', message: 'Network error or server unavailable.' });
      })
    ) as Observable<RegisterResult>; // Explicitly cast the entire Observable
  }

  logout(): void {
    this.tokenStorage.clear();
    window.location.reload(); // Full page reload after logout
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.PROFILE_URL);
  }

  updateProfile(payload: UpdateProfilePayload): Observable<UpdateProfileResponse> {
    let body = new HttpParams()
      .set('name', payload.name)
      .set('surname', payload.surname)
      .set('email', payload.email)
      .set('phone', payload.phone);

    if (payload.password && payload.confirm) {
      body = body.set('password', payload.password);
      body = body.set('confirm', payload.confirm);
    }
    if (payload.photo) {
      body = body.set('photo', payload.photo);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<UpdateProfileResponse>(this.UPDATE_PROFILE_URL, body.toString(), { headers });
  }

  getMyDoctorStats(period: 'day' | 'week' | 'month' | 'half_year' = 'week'): Observable<DoctorStatsResponse> {
    const params = new HttpParams().set('period', period);
    return this.http.get<DoctorStatsResponse>(this.DOCTOR_STATS_URL, { params });
  }

  getMyWorkSchedule(): Observable<DoctorWorkScheduleResponse> {
    return this.http.get<DoctorWorkScheduleResponse>(this.DOCTOR_WORK_SCHEDULE_URL);
  }

  getMySessions(): Observable<MySessionsResponse> {
    const token = this.tokenStorage.getToken();
    const params = new HttpParams().set('token', String(token ?? ''));
    return this.http.get(this.MY_SESSIONS_URL, { params, responseType: 'text' }).pipe(
      map((responseText) => {
        try {
          return JSON.parse(responseText) as MySessionsResponse;
        } catch {
          return {
            error: String(responseText || 'Некоректна відповідь сервера')
          } as MySessionsResponse;
        }
      }),
      catchError((error) => {
        const backendText = String(error?.error ?? '').trim();
        return of({
          error: backendText || 'Не вдалося завантажити сесії'
        } as MySessionsResponse);
      })
    );
  }

  changeSession(payload: {
    session_id: number;
    date: string; // YYYY-MM-DD
    time: number; // 24h integer
    confirm_change?: 1;
  }): Observable<ChangeSessionResponse> {
    const token = this.tokenStorage.getToken();
    let body = new HttpParams()
      .set('session_id', String(payload.session_id))
      .set('date', payload.date)
      .set('time', String(payload.time))
      .set('token', String(token ?? ''));

    if (payload.confirm_change) {
      body = body.set('confirm_change', '1');
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const url = `${this.CHANGE_SESSION_URL}&token=${encodeURIComponent(String(token ?? ''))}`;
    return this.http.post(url, body.toString(), { headers, responseType: 'text' }).pipe(
      map((responseText) => {
        try {
          return JSON.parse(responseText) as ChangeSessionResponse;
        } catch {
          return { error: String(responseText || 'Не вдалося перенести сесію.') } as ChangeSessionResponse;
        }
      }),
      catchError((error) => {
        const backendText = String(error?.error ?? '').trim();
        return of({ error: backendText || 'Не вдалося перенести сесію.' } as ChangeSessionResponse);
      })
    );
  }

  deleteSession(sessionId: number): Observable<DeleteSessionResponse> {
    const token = this.tokenStorage.getToken();
    const body = new HttpParams()
      .set('session_id', String(sessionId))
      .set('token', String(token ?? ''));
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const url = `${this.DELETE_SESSION_URL}&token=${encodeURIComponent(String(token ?? ''))}`;
    return this.http.post(url, body.toString(), { headers, responseType: 'text' }).pipe(
      map((responseText) => {
        try {
          return JSON.parse(responseText) as DeleteSessionResponse;
        } catch {
          return { error: String(responseText || 'Не вдалося скасувати сесію.') } as DeleteSessionResponse;
        }
      }),
      catchError((error) => {
        const backendText = String(error?.error ?? '').trim();
        return of({ error: backendText || 'Не вдалося скасувати сесію.' } as DeleteSessionResponse);
      })
    );
  }
}
