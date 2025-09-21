import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterCircleOutline } from 'ionicons/icons';
import { DoctorService } from '../services/doctor.service';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, CommonModule]
})
export class Tab2Page implements OnInit {
  
  doctors: (DoctorCardView | { error: string })[] = [];
  doctorIds = [6, 7]; // Example doctor IDs

  constructor(
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({ filterCircleOutline });
  }

  ngOnInit() {
    this.doctorIds.forEach(id => {
      this.doctorService.getDoctorProfile(id).subscribe(data => {
        this.doctors.push(data);
        this.cdr.detectChanges(); // Manually trigger change detection
      });
    });
  }
  
  isDoctorCardView(doctor: DoctorCardView | { error: string }): doctor is DoctorCardView {
    return (doctor as DoctorCardView).id !== undefined;
  }

  isError(doctor: DoctorCardView | { error: string }): doctor is { error: string } {
    return (doctor as { error: string }).error !== undefined;
  }
}
