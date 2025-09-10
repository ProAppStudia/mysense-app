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

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly LOGIN_URL = `${environment.baseUrl}/connector.php?action=login`;

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

  logout(): void {
    this.tokenStorage.clear();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }
}
