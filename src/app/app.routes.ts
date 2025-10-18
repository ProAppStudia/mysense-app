import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
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
  {
    path: 'notifications',
    loadComponent: () => import('./pages/notifications/notifications.page').then( m => m.NotificationsPage)
  },
  {
    path: 'legal-info',
    loadComponent: () => import('./pages/legal-info/legal-info.page').then( m => m.LegalInfoPage)
  },
  {
    path: 'offer-agreement',
    loadComponent: () => import('./pages/legal-info/offer-agreement/offer-agreement.page').then( m => m.OfferAgreementPage)
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/legal-info/privacy-policy/privacy-policy.page').then( m => m.PrivacyPolicyPage)
  },
  {
    path: 'terms-of-service',
    loadComponent: () => import('./pages/legal-info/terms-of-service/terms-of-service.page').then( m => m.TermsOfServicePage)
  },
  {
    path: 'refund-policy',
    loadComponent: () => import('./pages/legal-info/refund-policy/refund-policy.page').then( m => m.RefundPolicyPage)
  },
];
