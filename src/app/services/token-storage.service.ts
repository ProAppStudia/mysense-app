import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly DIARY_TOKEN_KEY = 'diary_token';

  /** RAM-кеш, щоб інтерцептор мав синхронний доступ */
  private authTokenMem: string | null = null;
  private diaryTokenMem: string | null = null;

  /** Стрім для реактивного оновлення UI */
  readonly token$ = new BehaviorSubject<string | null>(null);

  /**
   * Викликати ОДИН раз при старті апки (через APP_INITIALIZER),
   * щоб прогріти кеш і перемістити токени з localStorage у Preferences.
   */
  async init(): Promise<void> {
    // Міграція зі старого localStorage → Preferences (один раз)
    const lsAuth = localStorage.getItem(TokenStorageService.TOKEN_KEY);
    if (lsAuth) {
      await Preferences.set({ key: TokenStorageService.TOKEN_KEY, value: lsAuth });
      localStorage.removeItem(TokenStorageService.TOKEN_KEY);
    }
    const lsDiary = localStorage.getItem(TokenStorageService.DIARY_TOKEN_KEY);
    if (lsDiary) {
      await Preferences.set({ key: TokenStorageService.DIARY_TOKEN_KEY, value: lsDiary });
      localStorage.removeItem(TokenStorageService.DIARY_TOKEN_KEY);
    }

    // Прогрів RAM-кешу
    const { value: auth } = await Preferences.get({ key: TokenStorageService.TOKEN_KEY });
    this.authTokenMem = auth ?? null;
    this.token$.next(this.authTokenMem);

    const { value: diary } = await Preferences.get({ key: TokenStorageService.DIARY_TOKEN_KEY });
    this.diaryTokenMem = diary ?? null;

    // Якщо не було diaryToken — створимо
    if (!this.diaryTokenMem) {
      this.diaryTokenMem = this.generateUUID();
      await Preferences.set({ key: TokenStorageService.DIARY_TOKEN_KEY, value: this.diaryTokenMem });
    }
  }

  // ---------- AUTH TOKEN ----------

  /** Синхронний доступ (читає з RAM-кешу). Використовується інтерцептором. */
  getToken(): string | null {
    return this.authTokenMem;
  }

  /** Асинхронний доступ на випадок, якщо десь потрібно гарантовано зі сховища. */
  async getTokenAsync(): Promise<string | null> {
    if (this.authTokenMem != null) return this.authTokenMem;
    const { value } = await Preferences.get({ key: TokenStorageService.TOKEN_KEY });
    this.authTokenMem = value ?? null;
    this.token$.next(this.authTokenMem);
    return this.authTokenMem;
  }

  async setToken(token: string): Promise<void> {
    this.authTokenMem = token;
    await Preferences.set({ key: TokenStorageService.TOKEN_KEY, value: token });
    this.token$.next(token);
  }

  async clear(): Promise<void> {
    this.authTokenMem = null;
    await Preferences.remove({ key: TokenStorageService.TOKEN_KEY });
    this.token$.next(null);
  }

  // ---------- DIARY TOKEN ----------

  getDiaryTokenSync(): string | null {
    return this.diaryTokenMem;
  }

  async getDiaryToken(): Promise<string> {
    if (this.diaryTokenMem) return this.diaryTokenMem;
    const { value } = await Preferences.get({ key: TokenStorageService.DIARY_TOKEN_KEY });
    if (value) {
      this.diaryTokenMem = value;
      return value;
    }
    const fresh = this.generateUUID();
    this.diaryTokenMem = fresh;
    await Preferences.set({ key: TokenStorageService.DIARY_TOKEN_KEY, value: fresh });
    return fresh;
  }

  // ---------- HELPERS ----------
  private generateUUID(): string {
    // v4-подібний UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
