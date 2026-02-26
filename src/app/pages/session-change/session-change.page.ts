import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';

@Component({
  selector: 'app-session-change',
  templateUrl: './session-change.page.html',
  styleUrls: ['./session-change.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonIcon, CommonModule, FormsModule]
})
export class SessionChangePage implements OnInit {
  sessionId = 0;
  doctorId = 0;
  doctorUserId = 0;
  doctorHash = '';
  targetName = '';
  targetPhoto = '';
  sessionType = '';

  loading = signal(false);
  loadingSlots = signal(false);
  error = signal('');
  success = signal('');
  availableSlotsByDate = signal<Record<string, number[]>>({});
  private didFallbackFromSessions = false;

  form = {
    date: '',
    time: 0
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private doctorService: DoctorService
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit(): void {
    this.form.date = this.getDefaultDate();

    this.route.queryParamMap.subscribe((params) => {
      this.didFallbackFromSessions = false;
      this.sessionId = Number(params.get('session_id') || 0);
      this.doctorId = Number(params.get('doctor_id') || 0);
      this.doctorUserId = Number(params.get('doctor_user_id') || 0);
      this.doctorHash = String(params.get('doctor_hash') || '').trim();
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      this.sessionType = String(params.get('session_type') || '').trim();

      if (!this.sessionId) {
        this.error.set('Не вдалося визначити сесію для перенесення.');
        return;
      }

      this.loadDoctorCalendar();
    });
  }

  goBack() {
    this.blurActiveElement();
    this.location.back();
  }

  async submit() {
    if (this.loading()) {
      return;
    }

    this.error.set('');
    this.success.set('');

    if (!this.sessionId) {
      this.error.set('Не вдалося визначити сесію для перенесення.');
      return;
    }

    if (!this.form.date || !this.form.time) {
      this.error.set('Оберіть дату та час.');
      return;
    }

    this.loading.set(true);

    this.authService.changeSession({
      session_id: this.sessionId,
      date: this.form.date,
      time: Number(this.form.time)
    }).subscribe({
      next: (resp) => {
        if (resp?.error) {
          this.loading.set(false);
          this.error.set(resp.error);
          return;
        }

        if (resp?.confirm && resp?.show_modal) {
          const ok = window.confirm(
            `Підтвердити перенос сесії на ${resp.date || this.form.date} ${resp.time || `${this.form.time}:00`} для клієнта ${resp.client_name || ''}?`
          );

          if (!ok) {
            this.loading.set(false);
            return;
          }

          this.authService.changeSession({
            session_id: this.sessionId,
            date: this.form.date,
            time: Number(this.form.time),
            confirm_change: 1
          }).subscribe({
            next: (confirmResp) => {
              this.loading.set(false);
              if (confirmResp?.error) {
                this.error.set(confirmResp.error);
                return;
              }
              this.success.set(confirmResp?.success || 'Сесію успішно перенесено.');
              setTimeout(() => {
                this.blurActiveElement();
                void this.router.navigate(['/sessions']);
              }, 700);
            },
            error: () => {
              this.loading.set(false);
              this.error.set('Не вдалося перенести сесію.');
            }
          });
          return;
        }

        this.loading.set(false);
        this.success.set(resp?.success || 'Сесію успішно перенесено.');
        setTimeout(() => {
          this.blurActiveElement();
          void this.router.navigate(['/sessions']);
        }, 700);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Не вдалося перенести сесію.');
      }
    });
  }

  get reserveTimeOptions(): number[] {
    const date = String(this.form.date || '').trim();
    if (!date) {
      return [];
    }
    const slots = this.availableSlotsByDate()[date] || [];
    return [...slots].sort((a, b) => a - b);
  }

  onDateChange() {
    this.ensureValidSelectedTime();
  }

  private getDefaultDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private loadDoctorCalendar() {
    this.loadingSlots.set(true);
    this.error.set('');

    const applyDoctor = (doctor: DoctorCardView | null) => {
      this.applyCalendarFromDoctor(doctor);
      this.loadingSlots.set(false);
    };

    if (this.doctorHash) {
      this.doctorService.getDoctorProfileByHash(this.doctorHash).subscribe({
        next: (doctor) => {
          if ((doctor as any)?.error) {
            this.resolveDoctorByIdsOrSessions();
            return;
          }
          applyDoctor(doctor as DoctorCardView);
        },
        error: () => this.resolveDoctorByIdsOrSessions()
      });
      return;
    }

    this.resolveDoctorByIdsOrSessions();
  }

  private resolveDoctorByIdsOrSessions() {
    const applyByUserId = () => {
      if (!this.doctorUserId) {
        if (this.didFallbackFromSessions) {
          this.loadingSlots.set(false);
          this.availableSlotsByDate.set({});
          this.form.time = 0;
          return;
        }
        this.resolveDoctorFromSessions();
        return;
      }
      this.doctorService.getDoctorProfileByUserId(this.doctorUserId).subscribe({
        next: (doctor) => {
          if ((doctor as any)?.error) {
            this.resolveDoctorFromSessions();
            return;
          }
          this.applyCalendarFromDoctor(doctor as DoctorCardView);
          this.loadingSlots.set(false);
        },
        error: () => this.resolveDoctorFromSessions()
      });
    };

    if (!this.doctorId) {
      applyByUserId();
      return;
    }

    this.doctorService.getDoctorProfile(this.doctorId).subscribe({
      next: (doctor) => {
        if ((doctor as any)?.error) {
          applyByUserId();
          return;
        }
        this.applyCalendarFromDoctor(doctor as DoctorCardView);
        this.loadingSlots.set(false);
      },
      error: () => applyByUserId()
    });
  }

  private resolveDoctorFromSessions() {
    this.didFallbackFromSessions = true;
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const past = Array.isArray(resp?.past) ? resp.past : [];
        const all = [...planned, ...past];
        const match = all.find((item: any) => {
          const candidates = [item?.meet_id, item?.order_id, item?.id, item?.session_id];
          return candidates.some((candidate) => Number(candidate || 0) === Number(this.sessionId));
        });

        this.doctorId = Number((match as any)?.doctor_id || 0);
        this.doctorUserId = Number((match as any)?.doctor_user_id || 0);
        this.doctorHash = String((match as any)?.doctor_hash ?? (match as any)?.hash ?? '').trim();

        if (this.doctorHash || this.doctorId || this.doctorUserId) {
          this.resolveDoctorByIdsOrSessions();
          return;
        }

        this.loadingSlots.set(false);
        this.availableSlotsByDate.set({});
        this.form.time = 0;
      },
      error: () => {
        this.loadingSlots.set(false);
        this.availableSlotsByDate.set({});
        this.form.time = 0;
      }
    });
  }

  private applyCalendarFromDoctor(doctor: DoctorCardView | null) {
    const weeks = doctor?.calendar?.weeks ? Object.values(doctor.calendar.weeks) : [];
    const byDate: Record<string, number[]> = {};

    for (const week of weeks) {
      const days = (week as any)?.days ?? {};
      for (const dayKey of Object.keys(days)) {
        const day = days[dayKey] as any;
        const date = this.resolveCalendarDate(dayKey, day);
        if (!date) {
          continue;
        }
        const slots = Array.isArray(day?.times) ? day.times : [];
        for (const slot of slots) {
          const rawDisabled = slot?.disabled;
          const disabled = rawDisabled === true || rawDisabled === 1 || rawDisabled === '1';
          if (disabled) {
            continue;
          }

          const hour = Number(slot?.time);
          if (!Number.isFinite(hour) || hour < 0) {
            continue;
          }

          if (!byDate[date]) {
            byDate[date] = [];
          }
          if (!byDate[date].includes(hour)) {
            byDate[date].push(hour);
          }
        }
      }
    }

    for (const date of Object.keys(byDate)) {
      byDate[date].sort((a, b) => a - b);
    }

    this.availableSlotsByDate.set(byDate);

    const availableDates = Object.keys(byDate).sort((a, b) => a.localeCompare(b));
    if (availableDates.length === 0) {
      this.form.time = 0;
      return;
    }

    const currentDate = String(this.form.date || '').trim();
    if (!currentDate || !byDate[currentDate]?.length) {
      this.form.date = availableDates[0];
    }

    this.ensureValidSelectedTime();
  }

  private resolveCalendarDate(dayKey: string, day: any): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return dayKey;
    }
    const fromDay = String(day?.date || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(fromDay)) {
      return fromDay;
    }
    return '';
  }

  private ensureValidSelectedTime() {
    const options = this.reserveTimeOptions;
    if (!options.length) {
      this.form.time = 0;
      return;
    }
    const selected = Number(this.form.time);
    if (!options.includes(selected)) {
      this.form.time = options[0];
    }
  }

  private blurActiveElement() {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
  }
}
