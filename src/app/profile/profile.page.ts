import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, ModalController } from '@ionic/angular/standalone';
import { LoginPage } from '../login/login.page';
import { RegisterPage } from '../register/register.page';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, CommonModule, FormsModule, LoginPage, RegisterPage]
})
export class ProfilePage implements OnInit {

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

  async openLoginModal() {
    const modal = await this.modalController.create({
      component: LoginPage,
      cssClass: 'login-modal'
    });
    return await modal.present();
  }

  logout() {
    // Implement logout logic here
    console.log('User logged out');
    // Example: navigate to login page or clear user data
  }

}
