import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { home, filterOutline, flaskOutline, chatbubblesOutline, personOutline, calendarOutline, addCircleOutline, bookOutline, libraryOutline, informationCircleOutline, notificationsOutline, headsetOutline, documentTextOutline, logOutOutline } from 'ionicons/icons';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './app/interceptors/auth.interceptor';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';

addIcons({ home, filterOutline, flaskOutline, chatbubblesOutline, personOutline, calendarOutline, addCircleOutline, bookOutline, libraryOutline, informationCircleOutline, notificationsOutline, headsetOutline, documentTextOutline, logOutOutline });

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
});
