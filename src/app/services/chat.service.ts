import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
}
