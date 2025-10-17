import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-offer-agreement',
  templateUrl: './offer-agreement.page.html',
  styleUrls: ['./offer-agreement.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class OfferAgreementPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
