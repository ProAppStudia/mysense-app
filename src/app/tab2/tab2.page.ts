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
  private allDoctors: DoctorCardView[] = [];

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
    this.doctorService.getPsychologists().subscribe(psychologists => {
      this.allDoctors = psychologists.filter(p => this.isDoctorCardView(p)) as DoctorCardView[];
      this.doctors = [...this.allDoctors];
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
      if (data.reset) {
        this.doctors = [...this.allDoctors];
      } else {
        this.applyFilters(data);
      }
    }
  }

  applyFilters(filters: any) {
    this.doctors = this.allDoctors.filter(doctor => {
      if (!this.isDoctorCardView(doctor)) return false;

      const typeMatch = !filters.type || 
                        (filters.type === 'individual' && doctor.priceIndividual) ||
                        (filters.type === 'family' && doctor.priceFamily) ||
                        (filters.type === 'child'); // Assuming there is a property for this

      const formatMatch = !filters.format ||
                          (filters.format === 'online' && doctor.online) ||
                          (filters.format === 'in-person' && doctor.inPerson);

      const genderMatch = !filters.gender || filters.gender === 'any'; // Assuming no gender property

      const languageMatch = !filters.language || filters.language === 'any' || (doctor.languages && doctor.languages.includes(filters.language));

      const priceMatch = (!filters.priceRange || !doctor.priceIndividual) || 
                         (doctor.priceIndividual >= filters.priceRange.lower && doctor.priceIndividual <= filters.priceRange.upper);

      const directionMatch = !filters.directions || filters.directions.length === 0 || 
                             filters.directions.some((direction: string) => doctor.specialization?.includes(direction));

      return typeMatch && formatMatch && genderMatch && languageMatch && priceMatch && directionMatch;
    });
    this.cdr.detectChanges();
  }
}
