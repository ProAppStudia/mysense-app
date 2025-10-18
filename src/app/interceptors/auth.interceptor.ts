import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';
import { environment } from '../../environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);
  const token = tokenStorage.getToken();

  // прикрутимо інтерцептор лише до нашого API
  const isOurApi = req.url.startsWith(environment.baseUrl);

  // не чіпаємо логін/реєстрацію (без Authorization)
  const isAuthEndpoint =
    req.url === `${environment.baseUrl}/connector.php?action=login` ||
    req.url === `${environment.baseUrl}/connector.php?action=register`;

  // базові заголовки (без печальок для CORS)
  let headers = req.headers
    .set('Accept', 'application/json')
    .set('X-Requested-With', 'XMLHttpRequest');

  // додаємо токен, якщо це наш API, не login/register, і токен є
  if (isOurApi && !isAuthEndpoint && token) {
    headers = headers
      .set('Authorization', `Bearer ${token}`)
      .set('X-Auth-Token', token);
  }

  const cloned = req.clone({ headers });

  return next(cloned).pipe(
    tap((event) => {
      // опційний хук на успішні відповіді
      if (event instanceof HttpResponse) {
        // наприклад, можна логувати статуси у debug-режимі
      }
    }),
    catchError((err) => {
      // якщо токен прострочився/некоректний
      if (isOurApi && err?.status === 401) {
        tokenStorage.clear();
        // м’яка переадресація на логін
        router.navigateByUrl('/login', { replaceUrl: true });
        // повернемо «чисту» помилку наверх, якщо компонент хоче її показати
        return of(err);
      }
      return throwError(() => err);
    })
  );
};
