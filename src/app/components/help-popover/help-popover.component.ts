import { Component } from '@angular/core';
import { IonicModule, PopoverController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { helpBuoyOutline, openOutline, helpCircleOutline, chevronForwardCircleOutline, informationCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-help-popover',
  templateUrl: './help-popover.component.html',
  styleUrls: ['./help-popover.component.scss'],
  standalone: true,
  imports: [IonicModule],
})
export class HelpPopoverComponent {
  constructor(private popoverController: PopoverController) {
    addIcons({ helpBuoyOutline, openOutline, helpCircleOutline, chevronForwardCircleOutline, informationCircleOutline });
  }

  dismiss() {
    this.popoverController.dismiss();
  }
}
