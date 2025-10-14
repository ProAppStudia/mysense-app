import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, RefresherCustomEvent } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, ExploreContainerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab3Page {
  constructor() {}

  handleRefresh(event: RefresherCustomEvent) {
    // In a real application, you would fetch new data here.
    // For this generic tab, we'll just simulate a delay.
    setTimeout(() => {
      console.log('Refresher completed for Tab 3');
      event.detail.complete();
    }, 1000);
  }
}
