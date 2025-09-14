import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonHeader, IonToolbar, IonButtons, IonButton, IonBadge } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, helpCircleOutline, peopleOutline, homeOutline, checkboxOutline, headsetOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonHeader, IonToolbar, IonButtons, IonButton, IonBadge],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    addIcons({ notificationsOutline, helpCircleOutline, peopleOutline, homeOutline, checkboxOutline, headsetOutline });
  }
}
