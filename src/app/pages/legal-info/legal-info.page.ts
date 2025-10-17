import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonList, IonItem, IonLabel } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { documentTextOutline } from 'ionicons/icons';

@Component({
  selector: 'app-legal-info',
  templateUrl: './legal-info.page.html',
  styleUrls: ['./legal-info.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton, IonList, IonItem, IonLabel
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LegalInfoPage implements OnInit {

  constructor(private router: Router, private route: ActivatedRoute) {
    addIcons({ documentTextOutline });
  }

  ngOnInit() {
  }

  goToSubPage(path: string) {
    console.log('Navigating to sub-page:', `/${path}`);
    this.router.navigate([`/${path}`]); // Use absolute navigation for flattened routes
  }
}
