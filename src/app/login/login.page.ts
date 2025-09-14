import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, ModalController, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem]
})
export class LoginPage implements OnInit {

  constructor(private modalController: ModalController) { }

  ngOnInit() {
  }


  dismiss() {
    this.modalController.dismiss();
  }

  async openRegisterModal() {
    // TODO: Implement opening the registration modal
    console.log('Open Register Modal clicked');
  }

}
