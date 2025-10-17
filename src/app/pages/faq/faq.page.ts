import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonSpinner, IonText } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';

interface FaqItem {
  heading: string;
  content: string;
}

interface HomepageData {
  section_10: {
    heading: string;
    items: FaqItem[];
    text_button: string;
  };
}

@Component({
  selector: 'app-faq',
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel,
    IonSpinner, IonText
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class FaqPage implements OnInit {
  faqItems: FaqItem[] = [];
  faqHeading: string = '';
  isLoading: boolean = true;
  error: string | null = null;

  constructor(private http: HttpClient) {
    addIcons({ addOutline });
  }

  ngOnInit() {
    this.loadFaqContent();
  }

  loadFaqContent() {
    this.http.get<HomepageData>(`${environment.baseUrl}/connector.php?action=get_homepage`).subscribe({
      next: (data) => {
        if (data && data.section_10 && data.section_10.items) {
          this.faqHeading = data.section_10.heading;
          this.faqItems = data.section_10.items;
          this.isLoading = false;
        } else {
          this.error = 'Failed to load FAQ content.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.error = 'Error fetching FAQ content.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }
}
