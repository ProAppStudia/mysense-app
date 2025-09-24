import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonToolbar, IonContent, IonButton, IonIcon, IonButtons, ModalController, IonSearchbar, PopoverController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterCircleOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline, closeOutline } from 'ionicons/icons';
import { DoctorService } from '../services/doctor.service';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { CommonModule } from '@angular/common';
import { FilterModalComponent } from '../components/filter-modal/filter-modal.component';
import { SortPopoverComponent } from '../components/sort-popover/sort-popover.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonToolbar, IonContent, IonButton, IonIcon, IonButtons, CommonModule, IonSearchbar],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  
  doctors: (DoctorCardView | { error: string })[] = [];
  private allDoctors: DoctorCardView[] = [];
  public searchTerm: string = '';

  constructor(
    private doctorService: DoctorService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController,
    private popoverController: PopoverController
  ) {
    addIcons({ filterCircleOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline, closeOutline });
  }

  ngOnInit() {
    this.doctorService.getPsychologists().subscribe(psychologists => {
      this.allDoctors = psychologists.filter(p => this.isDoctorCardView(p)) as DoctorCardView[];
      this.doctors = [...this.allDoctors];
      this.cdr.detectChanges();
    });
  }

  searchDoctors(event: any) {
    this.searchTerm = event.target.value;
    this.doctors = this.allDoctors.filter(doctor => {
      if (this.isDoctorCardView(doctor)) {
        return doctor.fullName.toLowerCase().includes(this.searchTerm.toLowerCase());
      }
      return false;
    });
  }

  async openSortPopover(ev: any) {
    const popover = await this.popoverController.create({
      component: SortPopoverComponent,
      event: ev,
      translucent: true
    });
    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (data) {
      this.sortDoctorsByPrice(data);
    }
  }

  sortDoctorsByPrice(sortBy: string) {
    if (sortBy === 'none') {
      this.doctors = [...this.allDoctors];
      return;
    }
    this.doctors.sort((a, b) => {
      if (this.isDoctorCardView(a) && this.isDoctorCardView(b)) {
        const priceA = Number(a.priceIndividual) || 0;
        const priceB = Number(b.priceIndividual) || 0;
        if (sortBy === 'price-asc') {
          return priceA - priceB;
        } else {
          return priceB - priceA;
        }
      }
      return 0;
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
