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
  @Input() initialFilters: any = {}; // Receive initial filters
  @ViewChildren('rangeInput') rangeInputs!: QueryList<ElementRef<HTMLInputElement>>;

  filters: any;
  private defaultFilters: any; // Renamed to avoid confusion with @Input initialFilters

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    // Initialize filters with defaults or values from initialFilters
    let initialLanguage = this.initialFilters.language || null;
    // If initialLanguage is an ID, convert it back to code for display
    if (initialLanguage && typeof initialLanguage === 'number') {
      const languageObj = this.languages.find(lang => lang.id === initialLanguage);
      if (languageObj) {
        initialLanguage = languageObj.code;
      } else {
        initialLanguage = null;
      }
    }

    this.filters = {
      type: this.initialFilters.type || null,
      format: this.initialFilters.format || null,
      gender: this.initialFilters.gender || null,
      language: initialLanguage,
      priceRange: this.initialFilters.priceRange || { lower: this.prices.min_price, upper: this.prices.max_price },
      city_id: this.initialFilters.city_id || null,
      direction_id: this.initialFilters.direction_id || null,
    };

    this.defaultFilters = { // Store default state for reset
      type: null,
      format: null,
      gender: null,
      language: null, // Default language should be null or 'any' code, not ID
      priceRange: { lower: this.prices.min_price, upper: this.prices.max_price },
      city_id: null,
      direction_id: null,
    };

    // Map directions and set checked state based on initialFilters.direction_id
    const initialDirectionIds = Array.isArray(this.initialFilters.direction_id)
      ? this.initialFilters.direction_id
      : (this.initialFilters.direction_id !== null ? [this.initialFilters.direction_id] : []);

    this.directions = this.directions.map(d => ({
      ...d,
      checked: initialDirectionIds.includes(d.direction_id)
    }));
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
    console.log('FilterModalComponent: this.directions before filtering:', this.directions);
    const selectedDirections = this.directions
      .filter(d => d && d.checked) // Ensure d is not null/undefined before accessing d.checked
      .map(d => d.direction_id); // Map to direction_id

    console.log('FilterModalComponent: selectedDirections after filtering and mapping:', selectedDirections);

    // Send an array of selected direction IDs. The backend needs to be updated to handle this.
    this.filters.direction_id = selectedDirections.length > 0 ? selectedDirections : null;
    // No need to delete this.filters.directions as we are now sending direction_id as an array

    // Convert language code to ID if a language is selected and it's not 'any'
    if (this.filters.language && this.filters.language !== 'any') {
      const selectedLanguage = this.languages.find(lang => lang.code === this.filters.language);
      if (selectedLanguage) {
        this.filters.language = selectedLanguage.id; // Set to ID
      } else {
        // If no matching language found, perhaps set to null to avoid sending invalid data
        this.filters.language = null;
      }
    }

    console.log('FilterModalComponent: Dismissing with filters:', this.filters);
    this.modalController.dismiss(this.filters);
  }

  resetFilters() {
    this.filters = { ...this.defaultFilters }; // Revert to default state
    this.directions.forEach(d => d.checked = false); // Reset directions checked state
    this.updateRangeBackground(); // Update range slider background
    this.modalController.dismiss({ reset: true });
  }
}
