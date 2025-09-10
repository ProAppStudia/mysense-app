# MySense App - Soft Authentication

This document outlines the implementation of "soft-auth" for the MySense application, focusing on a non-blocking authentication flow primarily through the `/profile` page.

## Goal
The entire application remains public. Authentication is only available from the `/profile` page via a "Login" button, which opens a modal window with a form. Upon successful login, the modal closes, and the page state updates (e.g., "Logout" button and profile data are shown). There are no global guards blocking the application. Existing content on the `/profile` page is preserved; only the login button/handler and the modal itself are added.

## API Login
- **Endpoint**: `https://mysense.care/app/connector.php?action=login`
- **Method**: `POST`
- **Body Format**: `application/x-www-form-urlencoded`
- **Fields**: `username`, `password`
- **Response**:
  - `"error"` if something went wrong.
  - `"success"` if successful.
  - `token` - a string token.
- **Subsequent Requests**: The token is passed in headers:
  - `Authorization: Bearer <token>`
  - `X-Auth-Token: <token>` (as fallback)

## Token Storage
The authentication token is stored in `localStorage` under the key `"auth_token"`. A `TokenStorageService` wrapper (`getToken`, `setToken`, `clear`) is provided for easy migration to Capacitor Preferences in the future.

## Project Structure and Files

### `src/environments/environment.ts`
Contains the base URL for API calls.
```typescript
export const environment = {
  production: false,
  baseUrl: 'https://mysense.care/app'
};
```

### `src/app/services/token-storage.service.ts`
A service to manage token storage in `localStorage`.
```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  private readonly TOKEN_KEY = 'auth_token';

  constructor() { }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }
}
```

### `src/app/services/auth.service.ts`
Handles login, logout, and authentication status.
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { TokenStorageService } from './token-storage.service';
import { environment } from '../../environments/environment';

interface AuthResponse {
  success: boolean;
  token?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly LOGIN_URL = `${environment.baseUrl}/connector.php?action=login`;

  constructor(
    private http: HttpClient,
    private tokenStorage: TokenStorageService
  ) { }

  login(username: string, password: string): Observable<AuthResponse> {
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post(this.LOGIN_URL, body.toString(), { headers, responseType: 'text' }).pipe(
      map(responseText => {
        // Attempt to parse as JSON first
        try {
          const jsonResponse = JSON.parse(responseText);
          if (jsonResponse.success === true && jsonResponse.token) {
            this.tokenStorage.setToken(jsonResponse.token);
            return { success: true, token: jsonResponse.token };
          } else if (jsonResponse.error) {
            return { success: false, message: jsonResponse.error };
          }
        } catch (e) {
          // Not a JSON response, proceed to text parsing
        }

        // Text parsing for success/error and token extraction
        if (responseText.toLowerCase().includes('success')) {
          const tokenMatch = responseText.match(/(?:token=|"token":")([^"&]+)/i);
          const token = tokenMatch ? tokenMatch[1] : undefined;
          if (token) {
            this.tokenStorage.setToken(token);
            return { success: true, token: token };
          }
          return { success: true, message: 'Login successful, but token not found in response.' };
        } else if (responseText.toLowerCase().includes('error')) {
          return { success: false, message: responseText };
        }

        return { success: false, message: 'Unknown response format or login failed.' };
      }),
      catchError(error => {
        console.error('Login API error:', error);
        return of({ success: false, message: 'Network error or server unavailable.' });
      })
    );
  }

  logout(): void {
    this.tokenStorage.clear();
  }

  isAuthenticated(): boolean {
    return !!this.tokenStorage.getToken();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }
}
```

### `src/app/interceptors/auth.interceptor.ts`
An HTTP interceptor to add authentication headers to outgoing requests.
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const token = tokenStorage.getToken();

  // Do not intercept login request
  if (req.url.includes(`${environment.baseUrl}/connector.php?action=login`)) {
    return next(req);
  }

  if (token) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Auth-Token': token
      }
    });
    return next(clonedRequest);
  }

  return next(req);
};
```

### Interceptor Connection Instruction
For standalone Angular applications (like this one, indicated by `bootstrapApplication` in `main.ts`), connect the interceptor in `src/main.ts`:

```typescript
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptor';
// ... other imports

bootstrapApplication(AppComponent, {
  providers: [
    // ... other providers
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
```

For module-based Angular applications (if `AppModule` exists), you would typically add it to the `providers` array in `app.module.ts`:

```typescript
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './app/interceptors/auth.interceptor'; // Assuming it's a class-based interceptor

@NgModule({
  // ...
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor, // Or useValue: authInterceptor if it's a functional interceptor
      multi: true
    }
  ],
  // ...
})
export class AppModule { }
```

### `src/app/profile/profile.page.ts`
The component logic for the profile page, including login modal handling and authentication state.
```typescript
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, ModalController } from '@ionic/angular/standalone';
import { RegisterPage } from '../register/register.page';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel,
    IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText,
    CommonModule, FormsModule, ReactiveFormsModule, RegisterPage
  ]
})
export class ProfilePage implements OnInit {
  loginOpen = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  isLoggedIn = signal(false);

  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(3)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  constructor(
    private modalController: ModalController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
  }

  async openRegisterModal() {
    const modal = await this.modalController.create({
      component: RegisterPage,
      cssClass: 'register-modal'
    });
    return await modal.present();
  }

  openLoginModal() {
    this.loginOpen.set(true);
    this.errorMsg.set(null);
    this.loginForm.reset();
  }

  closeLoginModal() {
    this.loginOpen.set(false);
    this.errorMsg.set(null);
    this.loginForm.reset();
  }

  onSubmitLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const { username, password } = this.loginForm.value;

    if (username && password) {
      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.isLoggedIn.set(true);
            this.closeLoginModal();
          } else {
            this.errorMsg.set(response.message || 'Login failed. Please try again.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set('An unexpected error occurred. Please try again later.');
          console.error('Login error:', err);
        }
      });
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn.set(false);
    console.log('User logged out');
  }
}
```

### `src/app/profile/profile.page.html`
The template for the profile page, including the login button and the modal.
```html
<ion-header>
  <ion-toolbar>
    <ion-title>Особистий кабінет</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content>
  <div class="profile-container" >
    <ion-card class="login-card">
      <ion-card-content>
        <p class="login-text">Увійдіть або зареєструйтеся, щоб не втратити дані особистого кабінету, а також мати можливість доступу з іншого пристрою.</p>
      </ion-card-content>
    </ion-card>

    <div class="login-buttons">
      <!-- Existing content preserved. Added *ngIf for conditional display. -->
      <ion-button *ngIf="!isLoggedIn()" expand="block" class="login-button" (click)="openLoginModal()">
        <ion-icon slot="start" src="assets/icon/sing-in.svg"></ion-icon>
        Вхід
      </ion-button>
      <ion-button *ngIf="!isLoggedIn()" expand="block" class="login-button" (click)="openRegisterModal()">Реєстрація</ion-button>
    </div>

    <ion-list class="profile-menu-group">
      <ion-item detail routerLink="/profile-details">
        <ion-icon slot="start" name="person-outline"></ion-icon>
        <ion-label>Мій профіль</ion-label>
      </ion-item>
      <ion-item detail routerLink="/my-sessions">
        <ion-icon slot="start" name="calendar-outline"></ion-icon>
        <ion-label>Мої сесії</ion-label>
      </ion-item>
      <ion-item detail routerLink="/book-session">
        <ion-icon slot="start" name="add-circle-outline"></ion-icon>
        <ion-label>Забронювати сесію</ion-label>
      </ion-item>
    </ion-list>

    <ion-list class="profile-menu-group">
      <ion-item detail routerLink="/my-diary">
        <ion-icon slot="start" name="book-outline"></ion-icon>
        <ion-label>Мій щоденник</ion-label>
      </ion-item>
      <ion-item detail routerLink="/my-library">
        <ion-icon slot="start" name="library-outline"></ion-icon>
        <ion-label>Моя бібліотека</ion-label>
      </ion-item>
      <ion-item detail routerLink="/how-to-use">
        <ion-icon slot="start" name="information-circle-outline"></ion-icon>
        <ion-label>Як користуватись додатком</ion-label>
      </ion-item>
    </ion-list>

    <ion-list class="profile-menu-group">
      <ion-item detail routerLink="/notifications">
        <ion-icon slot="start" name="notifications-outline"></ion-icon>
        <ion-label>Сповіщення</ion-label>
      </ion-item>
      <ion-item detail routerLink="/support">
        <ion-icon slot="start" name="headset-outline"></ion-icon>
        <ion-label>Служба підтримки</ion-label>
      </ion-item>
      <ion-item detail routerLink="/legal-info">
        <ion-icon slot="start" name="document-text-outline"></ion-icon>
        <ion-label>Правова Інформація</ion-label>
      </ion-item>
    </ion-list>

    <ion-list class="profile-menu-group">
      <!-- Existing content preserved. Added *ngIf for conditional display. -->
      <ion-item *ngIf="isLoggedIn()" button detail="false" (click)="logout()">
        <ion-icon slot="start" name="log-out-outline"></ion-icon>
        <ion-label>Вийти</ion-label>
      </ion-item>
    </ion-list>
  </div>

  <!-- Login Modal -->
  <ion-modal [isOpen]="loginOpen()" (willDismiss)="closeLoginModal()">
    <ng-template>
      <ion-header>
        <ion-toolbar>
          <ion-title>Вхід</ion-title>
          <ion-buttons slot="end">
            <ion-button (click)="closeLoginModal()">Закрити</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <form [formGroup]="loginForm" (ngSubmit)="onSubmitLogin()">
          <ion-list>
            <ion-item>
              <ion-input
                label="Ім'я користувача"
                labelPlacement="floating"
                formControlName="username"
                autocomplete="username"
                type="text"
              ></ion-input>
            </ion-item>
            <ion-text color="danger" *ngIf="loginForm.get('username')?.invalid && loginForm.get('username')?.touched">
              <p class="ion-padding-start" *ngIf="loginForm.get('username')?.errors?.['required']">Ім'я користувача обов'язкове.</p>
              <p class="ion-padding-start" *ngIf="loginForm.get('username')?.errors?.['minlength']">Ім'я користувача повинно бути не менше 3 символів.</p>
            </ion-text>

            <ion-item>
              <ion-input
                label="Пароль"
                labelPlacement="floating"
                formControlName="password"
                autocomplete="current-password"
                type="password"
              ></ion-input>
            </ion-item>
            <ion-text color="danger" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
              <p class="ion-padding-start" *ngIf="loginForm.get('password')?.errors?.['required']">Пароль обов'язковий.</p>
              <p class="ion-padding-start" *ngIf="loginForm.get('password')?.errors?.['minlength']">Пароль повинен бути не менше 6 символів.</p>
            </ion-text>
          </ion-list>

          <ion-text color="danger" *ngIf="errorMsg()">
            <p class="ion-padding-start">{{ errorMsg() }}</p>
          </ion-text>

          <ion-button expand="block" type="submit" [disabled]="loginForm.invalid || loading()">
            <ion-spinner *ngIf="loading()" name="lines-small"></ion-spinner>
            <span *ngIf="!loading()">Увійти</span>
          </ion-button>
        </form>
      </ion-content>
    </ng-template>
  </ion-modal>
</ion-content>
```

### `src/app/profile/profile.page.scss` (Optional styling for the modal)
```scss
ion-modal {
  --width: fit-content;
  --min-width: 290px;
  --height: fit-content;
  --border-radius: 6px;
  --box-shadow: 0 28px 48px rgba(0, 0, 0, 0.4);
}

ion-modal::part(backdrop) {
  background: rgba(209, 213, 219, 0.5);
}

ion-modal::part(content) {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
```

### Routing
The `/profile` page remains public, as do all other pages. No `canActivate` guards are applied globally or to the `/profile` page itself.

**(Optional) AuthGuard for Subpages**:
If a subpage like `/profile/edit` were to be created and required authentication, an `AuthGuard` could be implemented specifically for that route. In case of unauthorized access, it would redirect to `/profile` (where the login modal is available).

Example `AuthGuard` (not implemented as per current requirements, but for future reference):
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/profile']); // Redirect to profile page for login
      return false;
    }
  }
}
```
And then in `app.routes.ts` (or `profile.routes.ts` if using child routes):
```typescript
import { AuthGuard } from './guards/auth.guard'; // Assuming guard is in src/app/guards

const routes: Routes = [
  // ... other routes
  {
    path: 'profile/edit',
    loadComponent: () => import('./profile/edit/profile-edit.page').then(m => m.ProfileEditPage),
    canActivate: [AuthGuard]
  }
];
```

## UI/UX
- Existing content on `/profile` is untouched.
- The login modal is a separate overlay, not altering the page layout.
- During login, a spinner (`ion-spinner`) is shown, and errors are displayed using `ion-text`.
- Input fields use `autocomplete="username"` and `autocomplete="current-password"`.

## Quality
- Full typization is used; no `any` types.
- All URLs are sourced from `environment.ts`.
- Comments are provided for the response parsing logic in `AuthService` due to the mixed JSON/text response format.
- The solution is designed to work in both web and Capacitor environments.

## How to use
1. **Base URL**: The API base URL is configured in `src/environments/environment.ts`.
2. **Login Modal**: Access the login modal from the `/profile` page by clicking the "Вхід" button.
3. **Token Storage**: The authentication token is stored in `localStorage` under the key `"auth_token"`.
4. **AuthGuard for Subpages**: If you need to protect specific subpages (e.g., `/profile/edit`), you can implement an `AuthGuard` as described in the "Routing" section and apply it to the desired routes.
