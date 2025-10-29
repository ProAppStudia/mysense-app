import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { calendarOutline, chatbubbleEllipsesOutline } from 'ionicons/icons';
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
    private doctorService: DoctorService
  ) {
    addIcons({ calendarOutline, chatbubbleEllipsesOutline });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.doctorService.getDoctorProfile(id).subscribe(data => {
        this.doctor = data;
        if (this.isDoctorCardView(this.doctor)) {
          // Apply specific logic for therapist-profile page
          if (this.doctor.rawWorkType === 'both' || this.doctor.rawWorkType === 'online') {
            this.doctor.online = true;
          } else {
            this.doctor.online = false;
          }
          if (this.doctor.rawWorkType === 'both' || this.doctor.rawWorkType === 'offline') {
            this.doctor.inPerson = true;
          } else {
            this.doctor.inPerson = false;
          }

          if (this.doctor.calendar) {
            this.weeks = Object.values(this.doctor.calendar.weeks);
            this.currentWeekIndex = this.weeks.findIndex(w => w.active);
          }
        }
      });
    }
  }

  isDoctorCardView(doctor: any): doctor is DoctorCardView {
    return doctor && doctor.id !== undefined;
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
}
