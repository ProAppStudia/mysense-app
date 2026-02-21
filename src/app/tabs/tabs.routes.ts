import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { TherapistProfilePage } from '../pages/therapist-profile/therapist-profile.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('../tab1/tab1.page').then((m) => m.Tab1Page),
      },
      {
        path: 'filter',
        loadComponent: () =>
          import('../tab2/tab2.page').then((m) => m.Tab2Page),
      },
      {
        path: 'tests',
        loadComponent: () =>
          import('../pages/selection-test/selection-test.page').then((m) => m.SelectionTestPage),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('../chat/chat.page').then((m) => m.ChatPage),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('../profile/profile.page').then((m) => m.ProfilePage),
      },
      {
        path: '',
        redirectTo: '/tabs/home',
        pathMatch: 'full',
      },
      {
        path: 'diary',
        loadComponent: () =>
          import('../pages/diary/diary.page').then((m) => m.DiaryPage),
      },
      {
        path: 'diary-entry',
        loadComponent: () =>
          import('../pages/diary-entry/diary-entry.page').then(
            (m) => m.DiaryEntryPage
          ),
      },
      {
        path: 'how-to-use',
        loadComponent: () =>
          import('../pages/how-to-use/how-to-use.page').then(
            (m) => m.HowToUsePage
          ),
      },
      {
        path: 'tasks',
        loadComponent: () =>
          import('../pages/tasks/tasks.page').then(
            (m) => m.TasksPage
          ),
      },
      {
        path: 'doctor-stats',
        loadComponent: () =>
          import('../pages/doctor-stats/doctor-stats.page').then(
            (m) => m.DoctorStatsPage
          ),
      },
      {
        path: 'doctor-work-schedule',
        loadComponent: () =>
          import('../pages/doctor-work-schedule/doctor-work-schedule.page').then(
            (m) => m.DoctorWorkSchedulePage
          ),
      },
      {
        path: 'therapist-profile/:id',
        loadComponent: () =>
          import('../pages/therapist-profile/therapist-profile.page').then(
            (m) => m.TherapistProfilePage
          ),
      },
      {
        path: 'session-request',
        loadComponent: () =>
          import('../pages/session-request/session-request.page').then(
            (m) => m.SessionRequestPage
          ),
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home',
    pathMatch: 'full',
  },
];
