import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface UserProfile {
  avatar: string;
  firstname: string;
  lastname: string;
  fullname?: string;
  email: string;
  phone: string;
  success: boolean;
  user_id: number;
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly LOGIN_URL = `${environment.baseUrl}/connector.php?action=login`;
  private readonly REGISTER_URL = `${environment.baseUrl}/connector.php?action=register`;
  private readonly PROFILE_URL = `${environment.baseUrl}/connector.php?action=get_my_profile`;
  private readonly UPDATE_PROFILE_URL = `${environment.baseUrl}/connector.php?action=set_my_profile`;

  // 👇 додаємо реактивний стан авторизації
  private authStateSubject = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService,
    private router: Router
  ) {}

  // ---------- LOGIN ----------
  login(username: string, password: string): Observable<AuthResponse> {
    const body = new HttpParams().set('username', username).set('password', password);
    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post(this.LOGIN_URL, body.toString(), { headers, responseType: 'text' }).pipe(
      map((responseText) => {
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.success === true && jsonResponse.token) {
            this.tokenStorage.setToken(jsonResponse.token);
            this.authStateSubject.next(true); // ✅ оновлення стану
            this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
            return { success: true, token: jsonResponse.token };
          } else if (jsonResponse.error) {
            return { success: false, message: jsonResponse.error };
          }
        } catch {
          // fallback
        }

        if (responseText.toLowerCase().includes('success')) {
          const tokenMatch = responseText.match(/(?:token=|"token":")([^"&]+)/i);
          const token = tokenMatch ? tokenMatch[1] : undefined;
          if (token) {
            this.tokenStorage.setToken(token);
            this.authStateSubject.next(true);
            this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
            return { success: true, token };
          }
          return { success: true, message: 'Login successful, but token not found in response.' };
        } else if (responseText.toLowerCase().includes('error')) {
          return { success: false, message: responseText };
        }

        return { success: false, message: 'Unknown response format or login failed.' };
      }),
      catchError((error) => {
        console.error('Login API error:', error);
        return of({ success: false, message: 'Network error or server unavailable.' });
      })
    );
  }

  // ---------- REGISTER ----------
  private parseRegisterResponse(responseText: string): RegisterResult {
    try {
      const jsonResponse = JSON.parse(responseText);
      if (jsonResponse.success === true && jsonResponse.token) {
        this.tokenStorage.setToken(jsonResponse.token);
        this.authStateSubject.next(true);
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
        return { stage: 'done', success: true, token: jsonResponse.token };
      } else if (jsonResponse.show_code_field === true) {
        return {
          stage: 'awaiting_code',
          message: jsonResponse.message || 'Code sent. Please check your phone.',
        };
      } else if (jsonResponse.error) {
        return { stage: 'error', message: jsonResponse.error };
      }
    } catch {
      // fallback
    }

    if (responseText.toLowerCase().includes('show_code_field')) {
      const messageMatch = responseText.match(/(?:message=|"message":")([^"&]+)/i);
      const message = messageMatch ? messageMatch[1] : 'Code sent. Please check your phone.';
      return { stage: 'awaiting_code', message };
    } else if (responseText.toLowerCase().includes('success') && responseText.toLowerCase().includes('token')) {
      const tokenMatch = responseText.match(/(?:token=|"token":")([^"&]+)/i);
      const token = tokenMatch ? tokenMatch[1] : '';
      if (token) {
        this.tokenStorage.setToken(token);
        this.authStateSubject.next(true);
        this.router.navigateByUrl('/tabs/tab1', { replaceUrl: true });
        return { stage: 'done', success: true, token };
      }
      return { stage: 'error', message: 'Registration successful, but token not found in response.' };
    } else if (responseText.toLowerCase().includes('error')) {
      const errorMatch = responseText.match(/(?:error=|"error":")([^"&]+)/i);
      const errorMessage = errorMatch ? errorMatch[1] : String(responseText);
      return { stage: 'error', message: errorMessage };
    }

    return { stage: 'error', message: 'Unknown response format or registration failed.' };
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

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });

    return this.http.post(this.REGISTER_URL, body.toString(), { headers, responseType: 'text' }).pipe(
      map((responseText) => this.parseRegisterResponse(responseText)),
      catchError((error) => {
        console.error('Register API error:', error);
        return of({ stage: 'error', message: 'Network error or server unavailable.' });
      })
    ) as Observable<RegisterResult>;
  }

  // ---------- LOGOUT ----------
  logout(): void {
    this.tokenStorage.clear();
    this.authStateSubject.next(false); // ✅ оновлення стану
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // ---------- TOKEN / AUTH ----------
  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  // ---------- PROFILE ----------
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(this.PROFILE_URL).pipe(
      map((res: any) => {
        if (res && res.success === true) return res as UserProfile;
        return {
          success: false,
          avatar: '',
          firstname: '',
          lastname: '',
          fullname: '',
          email: '',
          phone: '',
          user_id: 0,
          error: typeof res?.error === 'string' ? res.error : 'Auth required',
        } as UserProfile;
      }),
      catchError((err) => {
        console.error('Error loading user profile:', err);
        return of({
          success: false,
          avatar: '',
          firstname: '',
          lastname: '',
          fullname: '',
          email: '',
          phone: '',
          user_id: 0,
          error: 'Network error',
        } as UserProfile);
      })
    );
  }

  // ---------- UPDATE PROFILE ----------
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

    const headers = new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' });
    return this.http.post<UpdateProfileResponse>(this.UPDATE_PROFILE_URL, body.toString(), { headers });
  }
}
