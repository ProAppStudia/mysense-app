import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  IonSpinner
} from '@ionic/angular/standalone';
import { AuthService, DoctorStatsResponse } from '../../services/auth.service';

type StatsPeriod = 'day' | 'week' | 'month' | 'half_year';

@Component({
  selector: 'app-doctor-stats',
  templateUrl: './doctor-stats.page.html',
  styleUrls: ['./doctor-stats.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    CommonModule,
    FormsModule
  ]
})
export class DoctorStatsPage implements OnInit {
  period: StatsPeriod = 'week';
  loading = signal(false);
  stats = signal<DoctorStatsResponse | null>(null);
  error = signal<string | null>(null);

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.loading.set(true);
    this.error.set(null);

    this.authService.getMyDoctorStats(this.period).subscribe({
      next: (response) => {
        if (response?.error) {
          this.error.set(response.error);
          this.stats.set(null);
        } else {
          this.stats.set(response);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не вдалося завантажити статистику.');
        this.stats.set(null);
        this.loading.set(false);
      }
    });
  }

  onPeriodChange() {
    this.loadStats();
  }
}
