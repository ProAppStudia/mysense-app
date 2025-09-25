import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline } from 'ionicons/icons';

interface Session {
  id: number;
  type: 'Індивідуальна сесія' | 'Сімейна сесія' | 'Дитяча сесія';
  status: 'Заброньована' | 'Оплачена' | 'Скасована' | 'Пройдена';
  doctor_name: string;
  doctor_image: string;
  time_range: string;
  icon: string;
}

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonBackButton, IonIcon, IonButton]
})
export class SessionsPage implements OnInit {
  sessions: Session[] = [];

  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({ timeOutline, videocamOutline });
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const doctors = navigation.extras.state['doctors'];
      this.sessions = [
        {
          id: 1,
          type: 'Індивідуальна сесія',
          status: 'Заброньована',
          doctor_name: doctors[0].firstname,
          doctor_image: doctors[0].img,
          time_range: '20 вересня о 14:00',
          icon: 'videocam-outline'
        },
        {
          id: 2,
          type: 'Сімейна сесія',
          status: 'Оплачена',
          doctor_name: doctors[1].firstname,
          doctor_image: doctors[1].img,
          time_range: '22 вересня о 18:00',
          icon: 'videocam-outline'
        },
        {
          id: 3,
          type: 'Індивідуальна сесія',
          status: 'Скасована',
          doctor_name: doctors[2].firstname,
          doctor_image: doctors[2].img,
          time_range: '25 вересня о 10:00',
          icon: 'videocam-outline'
        },
        {
          id: 4,
          type: 'Індивідуальна сесія',
          status: 'Пройдена',
          doctor_name: doctors[3].firstname,
          doctor_image: doctors[3].img,
          time_range: '15 вересня о 12:00',
          icon: 'videocam-outline'
        },
        {
          id: 5,
          type: 'Сімейна сесія',
          status: 'Пройдена',
          doctor_name: doctors[4].firstname,
          doctor_image: doctors[4].img,
          time_range: '18 вересня о 16:00',
          icon: 'videocam-outline'
        }
      ];
    }
  }

  ngOnInit() {
  }

}
