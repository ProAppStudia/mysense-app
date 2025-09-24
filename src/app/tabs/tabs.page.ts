import { Component, EnvironmentInjector, inject } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonHeader, IonToolbar, IonButtons, IonButton, IonBadge, PopoverController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { notificationsOutline, helpCircleOutline, peopleOutline, homeOutline, checkboxOutline, headsetOutline, chatbubblesOutline, personOutline } from 'ionicons/icons';
import { HelpPopoverComponent } from '../components/help-popover/help-popover.component';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonHeader, IonToolbar, IonButtons, IonButton, IonBadge],
})
export class TabsPage {
  public environmentInjector = inject(EnvironmentInjector);

  constructor(private popoverController: PopoverController) {
    addIcons({ notificationsOutline, helpCircleOutline, peopleOutline, homeOutline, checkboxOutline, headsetOutline, chatbubblesOutline, personOutline });
  }

  async presentPopover(e: Event) {
    const popover = await this.popoverController.create({
      component: HelpPopoverComponent,
      event: e,
      translucent: true
    });
    await popover.present();
  }
}
