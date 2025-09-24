import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly DIARY_TOKEN_KEY = 'diary_token';

  constructor() { }

  // Auth Token Methods
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  // Diary Token Methods
  getDiaryToken(): string | null {
    return localStorage.getItem(this.DIARY_TOKEN_KEY);
  }

  ensureDiaryToken(): string {
    let token = this.getDiaryToken();
    if (!token) {
      token = this.generateUniqueToken();
      this.setDiaryToken(token);
    }
    return token;
  }

  private setDiaryToken(token: string): void {
    localStorage.setItem(this.DIARY_TOKEN_KEY, token);
  }

  private generateUniqueToken(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
