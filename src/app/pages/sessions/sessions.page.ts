import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, calendarOutline, arrowForwardOutline, closeOutline, walletOutline } from 'ionicons/icons';

interface Session {
  id: number;
  type: 'Індивідуальна сесія' | 'Сімейна сесія' | 'Дитяча сесія';
  status: 'Заброньована' | 'Оплачена' | 'Скасована' | 'Пройдена' | 'Очікується'; // Added 'Очікується'
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
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonBackButton, IonIcon, IonButton,
    IonSegment, IonSegmentButton, IonLabel // Added these imports
  ]
})
export class SessionsPage implements OnInit {
  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  selectedSegment: 'planned' | 'past' = 'planned';

  constructor(private route: ActivatedRoute, private router: Router) {
    addIcons({calendarOutline,arrowForwardOutline,timeOutline,videocamOutline,closeOutline,walletOutline});
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const doctors = navigation.extras.state['doctors'];
      this.sessions = [
        {
          id: 1,
          type: 'Індивідуальна сесія',
          status: 'Очікується', // Changed to 'Очікується' for testing 'Оплатити' button
          doctor_name: `${doctors[0].firstname} ${doctors[0].lastname}`,
          doctor_image: doctors[0].img,
          time_range: '20 вересня о 14:00',
          icon: 'videocam-outline'
        },
        {
          id: 2,
          type: 'Сімейна сесія',
          status: 'Заброньована', // Changed to 'Заброньована' for testing 'Скасувати' button
          doctor_name: `${doctors[1].firstname} ${doctors[1].lastname}`,
          doctor_image: doctors[1].img,
          time_range: '22 вересня о 18:00',
          icon: 'videocam-outline'
        },
        {
          id: 3,
          type: 'Індивідуальна сесія',
          status: 'Скасована',
          doctor_name: `${doctors[2].firstname} ${doctors[2].lastname}`,
          doctor_image: doctors[2].img,
          time_range: '25 вересня о 10:00',
          icon: 'videocam-outline'
        },
        {
          id: 4,
          type: 'Індивідуальна сесія',
          status: 'Пройдена',
          doctor_name: `${doctors[3].firstname} ${doctors[3].lastname}`,
          doctor_image: doctors[3].img,
          time_range: '15 вересня о 12:00',
          icon: 'videocam-outline'
        },
        {
          id: 5,
          type: 'Сімейна сесія',
          status: 'Пройдена',
          doctor_name: `${doctors[4].firstname} ${doctors[4].lastname}`,
          doctor_image: doctors[4].img,
          time_range: '18 вересня о 16:00',
          icon: 'videocam-outline'
        }
      ];
    }
  }

  ngOnInit() {
    this.filterSessions();
  }

  segmentChanged() {
    this.filterSessions();
  }

  filterSessions() {
    if (this.selectedSegment === 'planned') {
      this.filteredSessions = this.sessions.filter(session =>
        session.status === 'Заброньована' || session.status === 'Оплачена' || session.status === 'Очікується'
      );
    } else { // 'past'
      this.filteredSessions = this.sessions.filter(session =>
        session.status === 'Скасована' || session.status === 'Пройдена'
      );
    }
  }

  formatSessionTime(timeRange: string): { date: string; time: string } {
    const parts = timeRange.split(' о ');
    if (parts.length === 2) {
      return { date: parts[0], time: parts[1] };
    }
    const dateMatch = timeRange.match(/(\d{1,2}\s[А-Яа-я]+\s\d{4})/);
    const timeMatch = timeRange.match(/(\d{1,2}:\d{2})/);

    return {
      date: dateMatch ? dateMatch[0] : timeRange,
      time: timeMatch ? timeMatch[0] : ''
    };
  }

  rescheduleSession(sessionId: number) {
    console.log('Reschedule session:', sessionId);
    // Add your reschedule logic here
  }

  cancelSession(sessionId: number) {
    console.log('Cancel session:', sessionId);
    // Add your cancel logic here
  }

  paySession(sessionId: number) {
    console.log('Pay for session:', sessionId);
    // Add your payment logic here
  }
}
