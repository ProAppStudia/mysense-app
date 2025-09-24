import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DiaryService {
  private apiUrl = 'https://mysense.care/app/connector.php';

  constructor(private http: HttpClient, private tokenStorage: TokenStorageService) { }

  getDiaryQuestions(): Observable<any> {
    return this.http.get(`${this.apiUrl}?action=get_diary_questions`).pipe(
      map((response: any) => {
        return {
          questions: Object.values(response.questions.items),
          mood: response.mood,
          body: response.body
        };
      })
    );
  }

  getDiaryByDate(date: string): Observable<any> {
    const diaryToken = this.tokenStorage.ensureDiaryToken();
    return this.http.get(`${this.apiUrl}?action=get_diary_by_date.php&date=${date}&diary_token=${diaryToken}`);
  }

  getDiaryEntriesForMonth(year: number, month: number): Observable<any> {
    const diaryToken = this.tokenStorage.ensureDiaryToken();
    return this.http.get(`${this.apiUrl}?action=get_diary_for_month&year=${year}&month=${month + 1}&diary_token=${diaryToken}`);
  }

  saveDiaryEntry(entry: any): Observable<any> {
    const diaryToken = this.tokenStorage.ensureDiaryToken();
    const entryWithToken = { ...entry, diary_token: diaryToken };
    return this.http.post(`${this.apiUrl}?action=save_diary_entry`, entryWithToken);
  }
}
