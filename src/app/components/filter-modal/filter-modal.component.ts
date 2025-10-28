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

  directions = [
    { name: 'Транзакційний аналіз', checked: false },
    { name: 'Травматерапія', checked: false },
    { name: 'Схема-терапія', checked: false },
    { name: 'Символдрама', checked: false },
    { name: 'Психодрама', checked: false },
    { name: 'Психоаналіз', checked: false },
    { name: 'Позитивна терапія', checked: false }
  ];

  constructor(private modalController: ModalController) { }

  ngOnInit() {
    // Set a default city if available and no city is selected
    if (this.cities.length > 0 && !this.filters.city_id) {
      this.filters.city_id = this.cities[0].city_id;
    }
  }

  ngAfterViewInit() {
    this.updateRangeBackground();
    this.rangeInputs.forEach(input => {
      input.nativeElement.addEventListener('input', () => this.updateRangeBackground());
    });
  }

  updateRangeBackground() {
    const min = 900;
    const max = 2700;
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
      priceRange: { lower: 900, upper: 2700 },
      directions: [],
      city_id: null
    };
    this.directions.forEach(d => d.checked = false);
    this.modalController.dismiss({ reset: true });
  }
}
