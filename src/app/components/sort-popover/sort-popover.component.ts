import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonList, IonItem, IonIcon, IonLabel, PopoverController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowUpOutline, arrowDownOutline, closeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-sort-popover',
  templateUrl: './sort-popover.component.html',
  styleUrls: ['./sort-popover.component.scss'],
  standalone: true,
  imports: [CommonModule, IonList, IonItem, IonIcon, IonLabel]
})
export class SortPopoverComponent {

  constructor(private popoverController: PopoverController) {
    addIcons({ arrowUpOutline, arrowDownOutline, closeOutline });
  }

  selectSort(sortBy: string) {
    this.popoverController.dismiss(sortBy);
  }
}
