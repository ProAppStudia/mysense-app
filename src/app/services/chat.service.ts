import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom, Observable, tap } from 'rxjs';
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

  getMyTasks(userId: number): Observable<any> {
    const token = this.tokenStorage.getToken();
    const params = new HttpParams()
      .set('action', 'get_my_tasks')
      .set('user_id', String(userId))
      .set('to_user_id', String(userId))
      .set('token', String(token ?? ''));

    console.log('[ChatService][Tasks] getMyTasks request', {
      action: 'get_my_tasks',
      user_id: userId,
      to_user_id: userId,
      hasToken: !!token
    });

    return this.http.get(this.apiUrl, { params }).pipe(
      tap({
        next: (response) => {
          console.log('[ChatService][Tasks] getMyTasks response', { userId, response });
        },
        error: (error) => {
          console.error('[ChatService][Tasks] getMyTasks error', { userId, error });
        }
      })
    );
  }

  createTask(userId: number, message: string, files: Array<{ name: string; path: string }> = []): Observable<any> {
    const token = this.tokenStorage.getToken();
    let body = new HttpParams()
      .set('user_id', String(userId))
      .set('to_user_id', String(userId))
      .set('message', message)
      .set('token', String(token ?? ''));

    files.forEach((file, index) => {
      body = body
        .set(`files[${index}][name]`, String(file.name ?? ''))
        .set(`files[${index}][path]`, String(file.path ?? ''));
    });

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    // Backend action uses this exact name.
    console.log('[ChatService][Tasks] createTask request', {
      action: 'set_new_taks',
      user_id: userId,
      to_user_id: userId,
      message,
      filesCount: files.length,
      files,
      hasToken: !!token
    });

    return this.http
      .post(`${this.apiUrl}?action=set_new_taks&token=${token}`, body.toString(), { headers })
      .pipe(
        tap({
          next: (response) => {
            console.log('[ChatService][Tasks] createTask response', { userId, response });
          },
          error: (error) => {
            console.error('[ChatService][Tasks] createTask error', { userId, error });
          }
        })
      );
  }

  uploadTaskFiles(files: File[]): Observable<any> {
    const token = this.tokenStorage.getToken();
    const formData = new FormData();
    files.forEach((file) => formData.append('file[]', file, file.name));

    console.log('[ChatService][Tasks] uploadTaskFiles request', {
      action: 'upload_file',
      filesCount: files.length,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      hasToken: !!token
    });

    return this.http.post(`${this.apiUrl}?action=upload_file&token=${token}`, formData).pipe(
      tap({
        next: (response) => {
          console.log('[ChatService][Tasks] uploadTaskFiles response', { response });
        },
        error: (error) => {
          console.error('[ChatService][Tasks] uploadTaskFiles error', { error });
        }
      })
    );
  }

  deleteTask(taskId: number): Observable<any> {
    const token = this.tokenStorage.getToken();
    const body = new HttpParams().set('id', String(taskId)).set('token', String(token ?? ''));
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    return this.http.post(`${this.apiUrl}?action=delete_task&token=${token}`, body.toString(), { headers });
  }

  getChatMessages(userId: number, options?: { hash?: string; type?: string }): Observable<any> {
    const token = this.tokenStorage.getToken();
    let params = new HttpParams()
      .set('action', 'get_my_chat_messages')
      .set('to_user_id', String(userId))
      .set('token', String(token ?? ''));

    if (options?.hash) {
      params = params.set('hash', options.hash);
    }
    if (options?.type) {
      params = params.set('type', options.type);
    }

    return this.http.get(this.apiUrl, { params });
  }

  initChatByHash(hash: string, type?: string): Observable<any> {
    const token = this.tokenStorage.getToken();
    let params = new HttpParams()
      .set('action', 'get_my_chat_messages')
      .set('hash', hash)
      .set('token', String(token ?? ''));

    if (type) {
      params = params.set('type', type);
    }

    return this.http.get(this.apiUrl, { params });
  }

  async sendChatMessage(
    toUserId: number,
    text: string,
    options?: { hash?: string; type?: string; firstMessageType?: number }
  ): Promise<{ ok: boolean; action?: string; response?: any; error?: any }> {
    const token = this.tokenStorage.getToken();

    if (!token) {
      return { ok: false, error: 'No token' };
    }

    const body = new URLSearchParams();
    body.set('to_user_id', String(toUserId));
    body.set('message', text);
    body.set('text', text);
    body.set('token', token);
    if (options?.hash) {
      body.set('hash', options.hash);
    }
    if (options?.type) {
      body.set('type', options.type);
    }
    if (options?.firstMessageType !== undefined) {
      body.set('first_message_type', String(options.firstMessageType));
    }

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
