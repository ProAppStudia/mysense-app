import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';

@Component({
  selector: 'app-therapist-profile',
  templateUrl: './therapist-profile.page.html',
  styleUrls: ['./therapist-profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonBackButton, IonButtons, IonIcon, IonButton]
})
export class TherapistProfilePage implements OnInit {

  doctor: DoctorCardView | { error: string } | null = null;

  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService
  ) { }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.doctorService.getDoctorProfile(id).subscribe(data => {
        this.doctor = data;
      });
    }
  }

  isDoctorCardView(doctor: any): doctor is DoctorCardView {
    return doctor && doctor.id !== undefined;
  }
}
