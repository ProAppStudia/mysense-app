import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DiaryService {
  private apiUrl = 'https://mysense.care/app/connector.php';

  constructor(private http: HttpClient) { }

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
    return this.http.get(`${this.apiUrl}?action=get_diary_by_date.php&date=${date}`);
  }

  saveDiaryEntry(entry: any): Observable<any> {
    // This is a placeholder for the save action.
    // The actual implementation will depend on the API.
    return this.http.post(`${this.apiUrl}?action=save_diary_entry`, entry);
  }
}
