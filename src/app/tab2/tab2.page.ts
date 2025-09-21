import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, ModalController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterCircleOutline } from 'ionicons/icons';
import { DoctorService } from '../services/doctor.service';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { CommonModule } from '@angular/common';
import { FilterModalComponent } from '../components/filter-modal/filter-modal.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonButtons, CommonModule, FilterModalComponent]
})
export class Tab2Page implements OnInit {
  
  doctors: (DoctorCardView | { error: string })[] = [];

  constructor(
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController
  ) {
    addIcons({ filterCircleOutline });
  }

  ngOnInit() {
    this.loadDoctors();
  }

  loadDoctors(filters?: any) {
    this.doctorService.getPsychologists(filters).subscribe(psychologists => {
      this.doctors = psychologists;
      this.cdr.detectChanges();
    });
  }

  goToProfile(doctorId: number | string) {
    this.router.navigate(['therapist-profile', doctorId]);
  }
  
  isDoctorCardView(doctor: DoctorCardView | { error: string }): doctor is DoctorCardView {
    return (doctor as DoctorCardView).id !== undefined;
  }

  isError(doctor: DoctorCardView | { error: string }): doctor is { error: string } {
    return (doctor as { error: string }).error !== undefined;
  }

  async openFilterModal() {
    const modal = await this.modalController.create({
      component: FilterModalComponent,
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.applyFilters(data);
    }
  }

  applyFilters(filters: any) {
    this.loadDoctors(filters);
  }
}
