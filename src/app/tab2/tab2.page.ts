import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonToolbar, IonContent, IonButton, IonIcon, IonButtons, ModalController, IonSearchbar, PopoverController, RefresherCustomEvent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterCircleOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline, closeOutline } from 'ionicons/icons';
import { DoctorService } from '../services/doctor.service';
import { CityService } from '../services/city.service'; // Import CityService
import { DoctorCardView } from '../models/doctor-card-view.model';
import { CommonModule } from '@angular/common';
import { FilterModalComponent } from '../components/filter-modal/filter-modal.component';
import { SortPopoverComponent } from '../components/sort-popover/sort-popover.component';
import { HttpClientModule } from '@angular/common/http'; // Import HttpClientModule

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [IonToolbar, IonContent, IonButton, IonIcon, IonButtons, CommonModule, IonSearchbar, HttpClientModule], // Add HttpClientModule
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Tab2Page implements OnInit {
  
  doctors: (DoctorCardView | { error: string })[] = [];
  private allDoctors: DoctorCardView[] = [];
  public searchTerm: string = '';
  public cities: any[] = [];
  public directions: any[] = [];
  public prices: { min_price: number, max_price: number } = { min_price: 900, max_price: 2700 };
  public languages: any[] = [];
  public types: any[] = [];
  public formats: any[] = []; // Add formats property

  constructor(
    private doctorService: DoctorService,
    private cityService: CityService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private modalController: ModalController,
    private popoverController: PopoverController
  ) {
    addIcons({ filterCircleOutline, swapVerticalOutline, arrowUpOutline, arrowDownOutline, closeOutline });
  }

  ngOnInit() {
    this.loadDoctors(); // Load doctors initially without filters

    this.cityService.getCities().subscribe(data => {
      if (data) {
        if (data.cities) {
          this.cities = data.cities;
        }
        if (data.directions) {
          this.directions = data.directions;
        }
        if (data.prices) {
          this.prices = data.prices;
        }
        if (data.languages) {
          this.languages = data.languages;
        }
        if (data.types) {
          this.types = Object.keys(data.types).map(key => ({ id: key, text: data.types[key].text, selected: data.types[key].selected }));
        }
        if (data.format) {
          this.formats = data.format;
        }
        this.cdr.detectChanges();
      }
    });
  }

  private loadDoctors(filters: any = {}) { // Default to an empty object if no filters are provided
    this.doctorService.getPsychologists(filters).subscribe(psychologists => {
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
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }

    const modal = await this.modalController.create({
      component: FilterModalComponent,
      componentProps: {
        cities: this.cities, // Pass the cities data
        directions: this.directions, // Pass the directions data
        prices: this.prices, // Pass the prices data
        languages: this.languages, // Pass the languages data
        types: this.types, // Pass the types data
        formats: this.formats // Pass the formats data
      },
      presentingElement: document.querySelector('ion-router-outlet') || undefined
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
    this.loadDoctors(filters);
  }

  handleRefresh(event: RefresherCustomEvent) {
    window.location.reload(); // Perform a full page reload
    event.detail.complete(); // Complete the refresher animation
  }
}
