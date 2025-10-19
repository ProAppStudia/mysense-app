import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, retry, tap } from 'rxjs/operators';
import { QuizFull, QuizListItem } from '../models/quiz.model';

const API_BASE_URL = 'https://mysense.care/app/connector.php';

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private quizListCache: QuizListItem[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * @description Fetches the list of quizzes with simple in-memory caching and retry mechanism.
   * @returns An Observable of QuizListItem array.
   */
  getQuizList(): Observable<QuizListItem[]> {
    if (this.quizListCache) {
      return of(this.quizListCache);
    }

    return this.http.get<any>(`${API_BASE_URL}?action=get_quiz_list`).pipe(
      retry(1), // Retry once on failure
      map((response) => {
        // Access the 'results' array from the response object
        const quizzes = response.results || [];
        return quizzes.map((r: any) => {
          return {
            // Adapter: mapping API response keys to QuizListItem interface
            id: r.id ?? r.quiz_id,
            title: r.name ?? r.title,
            preview: r.desc ?? r.preview ?? '',
            duration_minutes: r.time ?? r.duration_minutes ?? 0,
            image_url: r.image ?? r.image_url ?? '',
          };
        });
      }),
      tap((quizzes) => (this.quizListCache = quizzes)), // Cache the successful response
      catchError((error) => {
        console.error('Error fetching quiz list:', error);
        return throwError(() => new Error('Не вдалося завантажити список тестів.'));
      })
    );
  }

  /**
   * @description Fetches a full quiz by its ID.
   * @param id The ID of the quiz to fetch.
   * @returns An Observable of QuizFull.
   */
  getQuiz(id: number): Observable<QuizFull> {
    return this.http.get<any>(`${API_BASE_URL}?action=get_quiz&id=${id}`).pipe(
      map((r) => {
        // Adapter: mapping API response keys to QuizFull interface
        const defaultResultsBands = [
          { min: 1, max: 33, text: 'Низький показник.' },
          { min: 34, max: 66, text: 'Середній показник.' },
          { min: 67, max: 100, text: 'Високий показник.' },
        ];

        return {
          id: r.id ?? r.quiz_id,
          title: r.name ?? r.title,
          preview: r.desc ?? r.preview ?? '',
          duration_minutes: r.time ?? r.duration_minutes ?? 0,
          image_url: r.image ?? r.image_url ?? '',
          questions: r.questions || [],
          results_bands: r.results_bands || defaultResultsBands,
        };
      }),
      catchError((error) => {
        console.error(`Error fetching quiz with ID ${id}:`, error);
        return throwError(() => new Error(`Не вдалося завантажити тест з ID ${id}.`));
      })
    );
  }
}
