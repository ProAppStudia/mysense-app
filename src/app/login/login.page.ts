import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, ModalController, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem } from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonButton, IonIcon, IonInput, IonList, IonItem]
})
export class LoginPage implements OnInit {

  constructor(private modalController: ModalController) { }

  ngOnInit() {
  }


  dismiss() {
    this.modalController.dismiss();
  }

}
