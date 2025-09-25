import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { register } from 'swiper/element/bundle';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { environment } from '../../environments/environment'; // Import environment for base URL
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline } from 'ionicons/icons';
import { Router, RouterLink, NavigationExtras } from '@angular/router';

addIcons({ timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline });
register();

interface Doctor {
  img: string;
  firstname: string;
  practice_years_text: string;
}

interface Session {
  id: number;
  type: 'Індивідуальна сесія' | 'Сімейна сесія' | 'Дитяча сесія' ;
  status: string; // e.g., 'Waiting for call', 'Confirmed', 'Completed'
  doctor_name: string;
  doctor_image: string;
  time_range: string; // e.g., '4:00 PM-9:00 PM'
  icon: string; // e.g., 'videocam-outline' or 'person-outline'
}

interface HomepageData {
  section_1: {
    heading: string;
    sub_heading: string;
    button_test_text: string;
    text_choise_psyhologist: string;
  };
  doctors: Doctor[];
  section_3: {
    heading_acquaintance: string;
    text_acquaintance: string;
  };
  section_8: {
    heading: string;
    sub_heading: string;
    cities: { name: string }[];
    img: string;
  };
  section_9: {
    heading: string;
    reviews: { text: string; date: string; user_name: string; showFullText?: boolean; truncatedText?: string }[];
  };
  section_10: {
    heading: string;
    items: { heading: string; content: string }[];
    text_button: string;
  };
  section_11: {
    heading: string;
    articles: { id: number; slug: string; img: string; title: string; short_description: string; date: string }[];
  };
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, CommonModule, IonAccordionGroup, IonAccordion, IonItem, IonLabel, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit {
  @ViewChild('articlesSwiper') articlesSwiper?: ElementRef;
  @ViewChild('reviewsSwiper') reviewsSwiper?: ElementRef;

  homepageData: HomepageData | null = null;
  readonly TRUNCATE_LENGTH = 100; // Define a constant for truncation length
  isLoggedIn: boolean = false;
  userSessions: Session[] = [];

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {
      addIcons({timeOutline,addCircleOutline,calendarOutline,documentTextOutline,chatbubblesOutline,checkboxOutline,peopleOutline,bookOutline});}

  ngOnInit() {
    this.getHomepageData(); // Fetch homepage data first
  }

  formatSessionTime(timeRange: string): { date: string; time: string } {
    const parts = timeRange.split(' о ');
    if (parts.length === 2) {
      return { date: parts[0], time: parts[1] };
    }
    return { date: timeRange, time: '' }; // Fallback if format is unexpected
  }

  checkLoginStatus() {
    // For demonstration purposes, force isLoggedIn to true to display example sessions.
    // In a real application, this would be: this.isLoggedIn = this.authService.isAuthenticated();
    this.isLoggedIn = true; 
    if (this.isLoggedIn && this.homepageData && this.homepageData.doctors && this.homepageData.doctors.length >= 2) {
      this.userSessions = [
        {
          id: 1,
          type: 'Індивідуальна сесія', // Changed to match interface
          status: 'Очікується', // Changed status to "Очікується"
          doctor_name: this.homepageData.doctors[0].firstname,
          doctor_image: this.homepageData.doctors[0].img, // Use the image path directly from API
          time_range: '20 вересня о 14:00', // Changed time to "20 вересня о 14:00"
          icon: 'videocam-outline'
        },
        {
          id: 2,
          type: 'Сімейна сесія', // Changed to match interface
          status: 'Очікується', // Changed status to "Очікується"
          doctor_name: this.homepageData.doctors[1].firstname,
          doctor_image: this.homepageData.doctors[1].img, // Use the image path directly from API
          time_range: '20 вересня о 14:00', // Changed time to "20 вересня о 14:00"
          icon: 'videocam-outline'
        }
      ];
      // In a real scenario, you would call getUserSessions() here
      // this.getUserSessions();
    }
  }

  toggleText(review: any) {
    review.showFullText = !review.showFullText;
  }

  ngAfterViewInit() {
    if (this.articlesSwiper) {
      this.articlesSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.articlesSwiper && this.articlesSwiper.nativeElement.swiper) {
          this.articlesSwiper.nativeElement.swiper.update();
        }
      });
    }

    if (this.reviewsSwiper) {
      this.reviewsSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
          this.reviewsSwiper.nativeElement.swiper.update();
        }
      });
    }
  }

  // getUserSessions() {
  //   const token = this.authService.getToken();
  //   if (token) {
  //     this.http.get<Session[]>(`${environment.baseUrl}/connector.php?action=get_user_sessions&token=${token}`).subscribe(
  //       (sessions) => {
  //         this.userSessions = sessions.map(session => ({
  //           ...session,
  //           icon: session.type === 'Video Consultation' ? 'videocam-outline' : 'person-outline'
  //         }));
  //         console.log('User Sessions:', this.userSessions);
  //       },
  //       (error) => {
  //         console.error('Error fetching user sessions:', error);
  //         // Handle error, e.g., clear token if it's invalid
  //         if (error.status === 401) { // Unauthorized
  //           this.authService.logout();
  //           this.isLoggedIn = false;
  //         }
  //       }
  //     );
  //   }
  // }

  getHomepageData() {
    this.http.get<HomepageData>(`${environment.baseUrl}/connector.php?action=get_homepage`).subscribe((data) => {
      this.homepageData = data;
      if (this.homepageData && this.homepageData.section_9 && this.homepageData.section_9.reviews) {
        this.homepageData.section_9.reviews = this.homepageData.section_9.reviews.map(review => ({
          ...review,
          showFullText: false,
          truncatedText: review.text.length > this.TRUNCATE_LENGTH ? review.text.substring(0, this.TRUNCATE_LENGTH) + '...' : review.text
        }));
      }
      console.log(this.homepageData);
      this.checkLoginStatus(); // Call checkLoginStatus after homepageData is loaded
    });
  }

  rescheduleSession(sessionId: number) {
    console.log('Reschedule session:', sessionId);
    // Add your reschedule logic here
  }

  cancelSession(sessionId: number) {
    console.log('Cancel session:', sessionId);
    // Add your cancel logic here
  }

  viewAllSessions() {
    const navigationExtras: NavigationExtras = {
      state: {
        sessions: this.userSessions,
        doctors: this.homepageData?.doctors
      }
    };
    this.router.navigate(['/sessions'], navigationExtras);
  }
}
