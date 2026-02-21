import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // Import Location
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router'; // Import Router
import { addIcons } from 'ionicons';
import { calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline } from 'ionicons/icons'; // Import arrowBackOutline
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { register } from 'swiper/element/bundle';
import { Week } from 'src/app/models/calendar.model';

register();

@Component({
  selector: 'app-therapist-profile',
  templateUrl: './therapist-profile.page.html',
  styleUrls: ['./therapist-profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonBackButton, IonButtons, IonIcon, IonButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TherapistProfilePage implements OnInit {

  doctor: DoctorCardView | { error: string } | null = null;
  isDescriptionExpanded = false;
  isEducationExpanded = false;
  isReviewsExpanded = false;
  isWorkwithExpanded = false;
  sessionType: 'online' | 'offline' = 'online';
  bookingFor: 'me' | 'pair' | 'child' = 'me';
  
  currentWeekIndex = 0;
  weeks: Week[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private location: Location, // Inject Location service
    private router: Router // Inject Router
  ) {
    addIcons({ calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline }); // Add arrowBackOutline
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.doctorService.getDoctorProfile(id).subscribe(data => {
          this.doctor = data;
          if (this.isDoctorCardView(this.doctor)) {
            if (this.doctor.calendar) {
              this.weeks = Object.values(this.doctor.calendar.weeks);
              this.currentWeekIndex = this.weeks.findIndex(w => w.active);
            }
          }
        });
      }
    });
  }

  isDoctorCardView(doctor: any): doctor is DoctorCardView {
    return doctor && doctor.id !== undefined;
  }

  goBack() {
    const testToken = this.route.snapshot.queryParamMap.get('test_token');
    if (testToken) {
      // If there's a test_token, navigate back to the selection-test page with the token
      this.router.navigate(['/tabs/tests'], { queryParams: { test_token: testToken } });
    } else {
      // Otherwise, use the default back navigation
      this.location.back();
    }
  }

  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  toggleEducation() {
    this.isEducationExpanded = !this.isEducationExpanded;
  }
  toggleWorkwith() {
    this.isWorkwithExpanded = !this.isWorkwithExpanded;
  }
  toggleReviews() {
    this.isReviewsExpanded = !this.isReviewsExpanded;
  }

  get currentWeek(): Week | undefined {
    return this.weeks[this.currentWeekIndex];
  }

  get dayKeys(): string[] {
    return this.currentWeek ? Object.keys(this.currentWeek.days) : [];
  }

  nextWeek() {
    if (this.currentWeekIndex < this.weeks.length - 1) {
      this.currentWeekIndex++;
    }
  }

  prevWeek() {
    if (this.currentWeekIndex > 0) {
      this.currentWeekIndex--;
    }
  }

  openChat(type: '15min' | 'write') {
    if (!this.isDoctorCardView(this.doctor)) {
      return;
    }

    const queryParams: Record<string, string | number> = { type };

    if (this.doctor.hash) {
      queryParams['hash'] = this.doctor.hash;
    }

    if (this.doctor.userId) {
      queryParams['to_user_id'] = this.doctor.userId;
    }

    this.router.navigate(['/tabs/chat'], { queryParams });
  }
}
