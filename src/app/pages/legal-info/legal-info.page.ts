import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonSpinner, IonText } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  documentTextOutline,
  shieldCheckmarkOutline,
  globeOutline,
  refreshCircleOutline
} from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LegalInformationItem {
  id: number;
  title: string;
  isPdf: boolean;
}

@Component({
  selector: 'app-legal-info',
  templateUrl: './legal-info.page.html',
  styleUrls: ['./legal-info.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton, IonList, IonItem, IonLabel, IonIcon, IonSpinner, IonText
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class LegalInfoPage implements OnInit {
  informations = signal<LegalInformationItem[]>([]);
  loading = signal(false);
  errorText = signal('');

  constructor(
    private router: Router,
    private http: HttpClient
  ) {
    addIcons({
      documentTextOutline,
      shieldCheckmarkOutline,
      globeOutline,
      refreshCircleOutline,
      chevronForwardOutline
    });
  }

  ngOnInit(): void {
    this.loadInformations();
  }

  openInformation(item: LegalInformationItem): void {
    if (!item?.id) {
      return;
    }
    void this.router.navigate(['/legal-info', item.id]);
  }

  private loadInformations(): void {
    this.loading.set(true);
    this.errorText.set('');

    this.http.get<any>(`${environment.baseUrl}/connector.php?action=get_informations`).subscribe({
      next: (response) => {
        this.loading.set(false);
        const rawItems = this.extractItems(response);
        const mapped = rawItems
          .map((item) => this.mapInformation(item))
          .filter((item): item is LegalInformationItem => !!item)
          .filter((item) => item.id !== 106);

        this.informations.set(mapped);
      },
      error: () => {
        this.loading.set(false);
        this.errorText.set('Не вдалося завантажити правову інформацію.');
      }
    });
  }

  private extractItems(response: any): any[] {
    if (Array.isArray(response)) {
      return response;
    }
    const candidates = [
      response?.results,
      response?.items,
      response?.informations,
      response?.information,
      response?.data
    ];
    const found = candidates.find((item) => Array.isArray(item));
    return Array.isArray(found) ? found : [];
  }

  private mapInformation(item: any): LegalInformationItem | null {
    const id = Number(item?.information_id ?? item?.id ?? 0);
    if (!id) {
      return null;
    }
    const title = String(item?.title ?? item?.name ?? item?.heading ?? `Документ №${id}`).trim();
    const isPdf = this.toBool(item?.is_pdf);

    return { id, title, isPdf };
  }

  getItemIcon(title: string): string {
    const t = (title || '').toLowerCase();
    if (t.includes('оферт')) {
      return 'document-text-outline';
    }
    if (t.includes('конфіденц')) {
      return 'shield-checkmark-outline';
    }
    if (t.includes('доступ') || t.includes('веб') || t.includes('сайт')) {
      return 'globe-outline';
    }
    if (t.includes('повернен')) {
      return 'refresh-circle-outline';
    }
    return 'document-text-outline';
  }

  private toBool(value: any): boolean {
    if (value === true || value === 1 || value === '1') {
      return true;
    }
    return String(value ?? '').toLowerCase() === 'true';
  }
}
