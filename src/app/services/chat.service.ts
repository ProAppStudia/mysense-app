import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.baseUrl}/connector.php`;

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) { }

  getMyChats(): Observable<any> {
    const token = this.tokenStorage.getToken();
    return this.http.get(`${this.apiUrl}?action=get_my_chats&token=${token}`);
  }

  getChatMessages(userId: number): Observable<any> {
    const token = this.tokenStorage.getToken();
    return this.http.get(`${this.apiUrl}?action=get_my_chat_messages&to_user_id=${userId}&token=${token}`);
  }

  async sendChatMessage(toUserId: number, text: string): Promise<{ ok: boolean; action?: string; response?: any; error?: any }> {
    const token = this.tokenStorage.getToken();

    if (!token) {
      return { ok: false, error: 'No token' };
    }

    const body = new URLSearchParams();
    body.set('to_user_id', String(toUserId));
    body.set('message', text);
    body.set('text', text);
    body.set('token', token);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    const action = 'set_new_message_to_chat';

    try {
      const rawResponse = await firstValueFrom(
        this.http.post(`${this.apiUrl}?action=${action}&token=${token}`, body.toString(), {
          headers,
          responseType: 'text'
        })
      );

      const response = this.parseBackendResponse(rawResponse);

      const hasCreatedMessage =
        typeof response?.message === 'object' &&
        response?.message !== null &&
        (!!response?.message?.id || !!response?.message?.text);

      const isSuccess =
        response?.success === true ||
        response?.success === 1 ||
        response?.success === '1' ||
        response?.ok === true ||
        response?.ok === 1 ||
        response?.ok === '1' ||
        response?.status === 'ok' ||
        response?.status === 'success' ||
        hasCreatedMessage ||
        !!response?.message_id ||
        !!response?.id;

      if (isSuccess) {
        return { ok: true, action, response };
      }

      return { ok: false, action, response };
    } catch (error) {
      return { ok: false, action, error };
    }
  }

  private parseBackendResponse(raw: unknown): any {
    if (typeof raw !== 'string') {
      return raw;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      // Some backend responses contain HTML/PHP warnings before JSON.
      const start = trimmed.lastIndexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const maybeJson = trimmed.slice(start, end + 1);
        try {
          return JSON.parse(maybeJson);
        } catch {
          return { raw: trimmed };
        }
      }
      return { raw: trimmed };
    }
  }
}
