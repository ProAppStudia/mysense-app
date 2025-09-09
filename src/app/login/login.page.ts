import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, ModalController, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem } from '@ionic/angular/standalone';
import { RegisterPage } from '../register/register.page';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem, RegisterPage]
})
export class LoginPage implements OnInit {

  constructor(private modalController: ModalController) { }

  ngOnInit() {
  }

  async openRegisterModal() {
    const modal = await this.modalController.create({
      component: RegisterPage,
      cssClass: 'register-modal'
    });
    return await modal.present();
  }

  dismiss() {
    this.modalController.dismiss();
  }

}
