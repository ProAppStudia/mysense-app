import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, Input } from '@angular/core'; // Import Input
import { ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
@Component({
  selector: 'app-filter-modal',
  templateUrl: './filter-modal.component.html',
  styleUrls: ['./filter-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class FilterModalComponent implements OnInit, AfterViewInit {
  @Input() cities: any[] = []; // Receive cities data
  @Input() directions: any[] = []; // Receive directions data
  @Input() prices: { min_price: number, max_price: number } = { min_price: 900, max_price: 2700 }; // Receive prices data
  @Input() languages: any[] = [];
  @Input() types: any[] = [];
  @Input() formats: any[] = [];
  @Input() genders: any[] = []; // Receive genders data
  @ViewChildren('rangeInput') rangeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  filters = {
    type: 'individual',
    format: 'online',
    gender: 'any',
    language: 'any',
    priceRange: { lower: 900, upper: 2700 },
    directions: [] as string[],
    city_id: null // Add city_id filter
  };

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    // Set a default city if available and no city is selected
    if (this.cities.length > 0 && !this.filters.city_id) {
      this.filters.city_id = this.cities[0].city_id;
    }
    // Initialize checked state for directions
    this.directions = this.directions.map(d => ({ ...d, checked: false }));

    // Set initial price range from API data
    this.filters.priceRange.lower = this.prices.min_price;
    this.filters.priceRange.upper = this.prices.max_price;

    // Set a default language if available and no language is selected
    if (this.languages.length > 0 && !this.filters.language) {
      this.filters.language = this.languages[0].code;
    }

    // Set a default type if available and no type is selected
    if (this.types.length > 0 && !this.filters.type) {
      this.filters.type = this.types[0].id;
    }

    // Set a default format if available and no format is selected
    if (this.formats.length > 0 && !this.filters.format) {
      this.filters.format = this.formats[0].id;
    }

    // Set a default gender if available and no gender is selected
    if (this.genders.length > 0 && !this.filters.gender) {
      this.filters.gender = this.genders[0].id;
    }
  }

  ngAfterViewInit() {
    this.updateRangeBackground();
    this.rangeInputs.forEach(input => {
      input.nativeElement.addEventListener('input', () => this.updateRangeBackground());
    });
  }

  updateRangeBackground() {
    const min = this.prices.min_price;
    const max = this.prices.max_price;
    const lower = this.filters.priceRange.lower;
    const upper = this.filters.priceRange.upper;

    const percent1 = ((lower - min) / (max - min)) * 100;
    const percent2 = ((upper - min) / (max - min)) * 100;

    const rangeSlider = document.querySelector('.range-slider') as HTMLElement;
    if (rangeSlider) {
      rangeSlider.style.background = `linear-gradient(to right, #ddd ${percent1}%, rgb(113, 144, 249) ${percent1}%, rgb(113, 144, 249) ${percent2}%, #ddd ${percent2}%)`;
    }
  }

  dismiss() {
    this.modalController.dismiss();
  }

  applyFilters() {
    this.filters.directions = this.directions
      .filter(d => d.checked)
      .map(d => d.name);
    this.modalController.dismiss(this.filters);
  }

  resetFilters() {
    this.filters = {
      type: 'individual',
      format: 'online',
      gender: 'any',
      language: 'any',
      priceRange: { lower: this.prices.min_price, upper: this.prices.max_price },
      directions: [],
      city_id: null
    };
    // Reset language filter
    if (this.languages.length > 0) {
      this.filters.language = this.languages[0].code;
    }
    // Reset type filter
    if (this.types.length > 0) {
      this.filters.type = this.types[0].id;
    }
    // Reset format filter
    if (this.formats.length > 0) {
      this.filters.format = this.formats[0].id;
    }
    // Reset gender filter
    if (this.genders.length > 0) {
      this.filters.gender = this.genders[0].id;
    }
    this.directions.forEach(d => d.checked = false);
    this.modalController.dismiss({ reset: true });
  }
}
