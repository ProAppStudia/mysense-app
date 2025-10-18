// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { APP_INITIALIZER } from '@angular/core';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  home,
  filterOutline,
  flaskOutline,
  chatbubblesOutline,
  personOutline,
  calendarOutline,
  addCircleOutline,
  bookOutline,
  libraryOutline,
  informationCircleOutline,
  notificationsOutline,
  headsetOutline,
  documentTextOutline,
  logOutOutline,
  eyeOutline,
  eyeOffOutline,
  closeOutline,
  helpCircleOutline,
  warningOutline,
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { TokenStorageService } from './app/services/token-storage.service';

// реєструємо потрібні іконки один раз на старті
addIcons({
  home,
  filterOutline,
  flaskOutline,
  chatbubblesOutline,
  personOutline,
  calendarOutline,
  addCircleOutline,
  bookOutline,
  libraryOutline,
  informationCircleOutline,
  notificationsOutline,
  headsetOutline,
  documentTextOutline,
  logOutOutline,
  eyeOutline,
  eyeOffOutline,
  closeOutline,
  helpCircleOutline,
  warningOutline,
});

// ініціалізація токен-сховища до старту апки (щоб інтерцептор одразу бачив токен)
function initToken(storage: TokenStorageService) {
  return () => storage.init();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),

    // роутер з прелоадом модулів
    provideRouter(routes, withPreloading(PreloadAllModules)),

    // HttpClient + інтерцептор + реалізація через fetch (краще на iOS)
    provideHttpClient(withInterceptors([authInterceptor]), withFetch()),

    // APP_INITIALIZER — прогріваємо Preferences/кеш токена до першого HTTP
    { provide: APP_INITIALIZER, useFactory: initToken, deps: [TokenStorageService], multi: true },
  ],
}).catch((err) => console.error(err));
