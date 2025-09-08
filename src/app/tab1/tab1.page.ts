import { Component } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, IonButton],
})
export class Tab1Page {
  constructor() {}
}
