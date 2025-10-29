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
      city_id: null // No default city selected
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
    this.filters.directions = this.directions
      .filter(d => d.checked)
      .map(d => d.name);
    this.modalController.dismiss(this.filters);
  }

  resetFilters() {
    this.filters = { ...this.initialFilters }; // Revert to initial state
    this.directions.forEach(d => d.checked = false); // Reset directions checked state
    this.updateRangeBackground(); // Update range slider background
    this.modalController.dismiss({ reset: true });
  }
}
