import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { receiptOutline, shieldCheckmarkOutline, clipboardOutline, cashOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-legal-info',
  templateUrl: './legal-info.page.html',
  styleUrls: ['./legal-info.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LegalInfoPage {

  constructor(private router: Router) {
    addIcons({
      receiptOutline,
      shieldCheckmarkOutline,
      clipboardOutline,
      cashOutline,
      chevronForwardOutline
    });
  }

  goToSubPage(path: string) {
    this.router.navigate([`/${path}`]);
  }
}
