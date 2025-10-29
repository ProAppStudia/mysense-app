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

  filters: any;
  private initialFilters: any;

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    this.filters = {
      type: null, // No default type selected
      format: null, // No default format selected
      gender: null, // No default gender selected
      language: null, // No default language selected
      priceRange: { lower: this.prices.min_price, upper: this.prices.max_price },
      directions: [] as string[],
      city_id: null, // No default city selected
      direction_id: null // Initialize direction_id
    };

    this.initialFilters = { ...this.filters }; // Store initial state

    this.directions = this.directions.map(d => ({ ...d, checked: false }));
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

    // If the backend expects a single direction_id, send only the first one
    // Otherwise, if the backend can handle an array, send the whole array.
    // Based on the PHP snippet, it expects a single ID.
    this.filters.direction_id = selectedDirections.length > 0 ? selectedDirections[0] : null;
    delete this.filters.directions; // Explicitly remove the 'directions' array to avoid sending it

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
    this.filters = { ...this.initialFilters }; // Revert to initial state
    this.directions.forEach(d => d.checked = false); // Reset directions checked state
    this.updateRangeBackground(); // Update range slider background
    this.modalController.dismiss({ reset: true });
  }
}
