import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'therapist-profile/:id',
    loadComponent: () => import('./pages/therapist-profile/therapist-profile.page').then( m => m.TherapistProfilePage)
  },
  {
    path: 'sessions',
    loadComponent: () => import('./pages/sessions/sessions.page').then( m => m.SessionsPage)
  },
  {
    path: 'faq',
    loadComponent: () => import('./pages/faq/faq.page').then( m => m.FaqPage)
  },
];
