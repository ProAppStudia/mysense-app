import { Component, OnInit } from '@angular/core';
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
export class FilterModalComponent implements OnInit {

  filters = {
    type: 'individual',
    format: 'online',
    gender: 'any',
    language: 'any',
    priceRange: { lower: 900, upper: 2700 },
    directions: [] as string[]
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

  ngOnInit() {}

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
      directions: []
    };
    this.directions.forEach(d => d.checked = false);
  }
}
