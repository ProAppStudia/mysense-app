import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { AuthService, DoctorWorkScheduleResponse, WorkScheduleDay } from '../../services/auth.service';

@Component({
  selector: 'app-doctor-work-schedule',
  templateUrl: './doctor-work-schedule.page.html',
  styleUrls: ['./doctor-work-schedule.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonSpinner,
    CommonModule,
    FormsModule
  ]
})
export class DoctorWorkSchedulePage implements OnInit {
  loading = signal(false);
  error = signal<string | null>(null);
  data = signal<DoctorWorkScheduleResponse | null>(null);

  weekIndex = 0;
  weeks: WorkScheduleDay[][] = [];

  statusValue: number | null = null;
  notBookingValue: number | null = null;
  isGoogleSyncEnabled = false;
  hasAdditionalCalendar = false;

  readonly hours = Array.from({ length: 17 }, (_, i) => i + 7); // 7..23

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.authService.getMyWorkSchedule().subscribe({
      next: (resp) => {
        if (resp?.error) {
          this.error.set(resp.error);
          this.data.set(null);
          this.loading.set(false);
          return;
        }

        this.data.set(resp);
        this.statusValue = Number(resp.status ?? 0);
        this.notBookingValue = Number(resp.not_booking_time ?? 0);
        this.isGoogleSyncEnabled = !!resp.google_clandar;
        this.hasAdditionalCalendar = Array.isArray(resp.additional_calendars) && resp.additional_calendars.length > 0;

        this.buildWeeks(resp.calendar || {});
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не вдалося завантажити робочий графік');
        this.loading.set(false);
      }
    });
  }

  get currentWeek(): WorkScheduleDay[] {
    return this.weeks[this.weekIndex] || [];
  }

  get weekLabel(): string {
    const week = this.currentWeek;
    if (!week.length) {
      return '';
    }
    const start = week[0];
    const end = week[week.length - 1];
    return `${start.day_no} ${start.month_name} - ${end.day_no} ${end.month_name}`;
  }

  prevWeek() {
    if (this.weekIndex > 0) {
      this.weekIndex -= 1;
    }
  }

  nextWeek() {
    if (this.weekIndex < this.weeks.length - 1) {
      this.weekIndex += 1;
    }
  }

  isWork(day: WorkScheduleDay, hour: number): boolean {
    const slot = day.times?.find((t) => Number(t.time_int) === hour);
    return !!slot?.is_work;
  }

  statusOptions() {
    const variants = this.data()?.status_variants || {};
    return Object.values(variants);
  }

  notBookingOptions() {
    const variants = this.data()?.not_booking_time_variants || {};
    return Object.values(variants);
  }

  private buildWeeks(calendarMap: Record<string, WorkScheduleDay>) {
    const days = Object.values(calendarMap).sort((a, b) => a.date.localeCompare(b.date));
    this.weeks = [];

    for (let i = 0; i < days.length; i += 7) {
      this.weeks.push(days.slice(i, i + 7));
    }

    const today = this.data()?.current_date;
    if (today) {
      const idx = this.weeks.findIndex((w) => w.some((d) => d.date === today));
      this.weekIndex = idx >= 0 ? idx : 0;
    } else {
      this.weekIndex = 0;
    }
  }
}
