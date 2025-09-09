import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, ModalController, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem, IonCheckbox, IonLabel } from '@ionic/angular/standalone';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem, IonCheckbox, IonLabel]
})
export class RegisterPage implements OnInit {

  constructor(private modalController: ModalController) { }

  ngOnInit() {
  }

  dismiss() {
    this.modalController.dismiss();
  }

}
