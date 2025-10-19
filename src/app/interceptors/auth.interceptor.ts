import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenStorageService } from '../services/token-storage.service';
import { environment } from '../../environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  const token = tokenStorage.getToken();

  // Чіпляємось тільки до нашого бекенду
  const isOurApi =
    typeof req.url === 'string' && req.url.startsWith(environment.baseUrl);

  // Логін/реєстрацію не чіпаємо
  const isAuthEndpoint =
    req.url === `${environment.baseUrl}/connector.php?action=login` ||
    req.url === `${environment.baseUrl}/connector.php?action=register`;

  // Preflight взагалі не чіпаємо
  if (req.method === 'OPTIONS') {
    return next(req);
  }

  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(clonedRequest);
  }

  const cloned = req.clone({ headers });

  return next(cloned).pipe(
    tap((event) => {
      // Місце для діагностики, якщо треба
      if (event instanceof HttpResponse) {
        // console.debug('[HTTP]', event.status, cloned.url);
      }
    }),
    catchError((err: HttpErrorResponse) => {
      // Якщо не наш API — просто пробросимо помилку
      if (!isOurApi) {
        return throwError(() => err);
      }

      // Неавторизований / заборонено
      if (err.status === 401 || err.status === 403) {
        tokenStorage.clear();

        // М'яко ведемо на таб1 (де в тебе логін-модалка)
        // Щоб не робити зайвих навігацій — перевіримо поточний URL
        const targetUrl = '/tabs/tab1';
        if (router.url !== targetUrl) {
          router.navigateByUrl(targetUrl, { replaceUrl: true });
        }

        // (опційно) можна кинути подію, щоб одразу відкрити модалку логіну:
        // window.dispatchEvent(new CustomEvent('open-login-modal'));

        // ВАЖЛИВО: не маскуємо помилку — пробросимо її далі
        return throwError(() => err);
      }

      // Інші помилки теж пробросимо — нехай компоненти вирішують, що робити
      return throwError(() => err);
    })
  );
};
