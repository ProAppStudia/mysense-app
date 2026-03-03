import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonDatetime, IonModal } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { Week } from '../../models/calendar.model';

@Component({
  selector: 'app-session-change',
  templateUrl: './session-change.page.html',
  styleUrls: ['./session-change.page.scss'],
  standalone: true,
  imports: [IonContent, IonDatetime, IonModal, CommonModule, FormsModule]
})
export class SessionChangePage implements OnInit {
  isDoctor = false;
  currentUserId: number | null = null;
  sessionId = 0;
  doctorId = 0;
  doctorUserId = 0;
  doctorHash = '';
  targetName = '';
  targetPhoto = '';
  sessionType = '';
  doctor: DoctorCardView | null = null;
  fallbackAmount = 0;

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
  readonly weekHourOptions = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00 - 21:00
  weeks: Week[] = [];
  currentWeekIndex = 0;
  selectedDateTimeIso = '';
  doctorDatePickerOpen = false;
  doctorDateMinIso = '';

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private authService: AuthService,
    private doctorService: DoctorService
  ) {}

  get selectedPrice(): number {
    const doctor = this.doctor;
    const isFamily = String(this.sessionType || '').toLowerCase().includes('сім')
      || String(this.sessionType || '').toLowerCase().includes('пар');
    const fromDoctor = Number(doctor ? (isFamily ? (doctor.priceFamily ?? 0) : (doctor.priceIndividual ?? 0)) : 0);
    if (Number.isFinite(fromDoctor) && fromDoctor > 0) {
      return fromDoctor;
    }
    return Number(this.fallbackAmount || 0);
  }

  ngOnInit(): void {
    this.form.date = this.getDefaultDate();
    this.doctorDateMinIso = this.getDoctorDateMinIso();

    this.route.queryParamMap.subscribe((params) => {
      this.didFallbackFromSessions = false;
      this.sessionId = Number(params.get('session_id') || 0);
      this.doctorId = Number(params.get('doctor_id') || 0);
      this.doctorUserId = Number(params.get('doctor_user_id') || 0);
      this.doctorHash = String(params.get('doctor_hash') || '').trim();
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      this.sessionType = String(params.get('session_type') || '').trim();
      this.fallbackAmount = Number(params.get('amount') || 0);
      this.selectedDateTimeIso = this.form.date && this.form.time
        ? `${this.form.date}T${String(this.form.time).padStart(2, '0')}:00:00`
        : '';

      if (!this.sessionId) {
        this.error.set('Не вдалося визначити сесію для перенесення.');
        return;
      }
      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
          this.currentUserId = Number(profile?.user_id) || null;
          this.loadDoctorCalendar();
        },
        error: () => {
          this.isDoctor = false;
          this.currentUserId = null;
          this.loadDoctorCalendar();
        }
      });
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

  get currentWeek(): Week | null {
    return this.weeks[this.currentWeekIndex] ?? null;
  }

  onDoctorDateTimeChange(value: string | string[] | null | undefined) {
    const iso = Array.isArray(value) ? (value[0] || '') : (value || '');
    if (!iso) {
      return;
    }
    this.error.set('');
    this.success.set('');
    this.selectedDateTimeIso = iso;
    this.form.date = iso.slice(0, 10);
    this.form.time = Number(iso.slice(11, 13));
  }

  openDoctorDatePicker() {
    this.doctorDatePickerOpen = true;
  }

  closeDoctorDatePicker() {
    this.doctorDatePickerOpen = false;
  }

  get currentWeekDayKeys(): string[] {
    const week = this.currentWeek;
    return week ? Object.keys(week.days) : [];
  }

  prevWeek() {
    if (this.canGoPrevWeek()) {
      this.currentWeekIndex--;
      this.ensureValidSelectedTime();
    }
  }

  nextWeek() {
    if (this.canGoNextWeek()) {
      this.currentWeekIndex++;
      this.ensureValidSelectedTime();
    }
  }

  canGoPrevWeek(): boolean {
    return this.currentWeekIndex > 0;
  }

  canGoNextWeek(): boolean {
    return this.currentWeekIndex < this.weeks.length - 1;
  }

  get currentWeekLabel(): string {
    const week = this.currentWeek as any;
    if (!week) {
      return '';
    }

    const fromRaw = String(week['date-form'] ?? '').trim();
    const toRaw = String(week['date-to'] ?? '').trim();
    const from = fromRaw ? new Date(fromRaw) : null;
    const to = toRaw ? new Date(toRaw) : null;

    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return String(week.week ?? '');
    }

    const fromDay = String(from.getDate()).padStart(2, '0');
    const toDay = String(to.getDate()).padStart(2, '0');
    let month = to.toLocaleDateString('uk-UA', { month: 'long' });
    month = month.charAt(0).toUpperCase() + month.slice(1);
    const year = to.getFullYear();

    return `${fromDay} - ${toDay} ${month}, ${year}`;
  }

  onClientSlotSelect(dayKey: string, hour: number) {
    const date = this.resolveDayDate(dayKey);
    if (!date) {
      return;
    }
    if (!this.isHourAvailable(dayKey, hour)) {
      return;
    }
    this.form.date = date;
    this.form.time = Number(hour);
    this.selectedDateTimeIso = `${date}T${String(hour).padStart(2, '0')}:00:00`;
  }

  isSelectedClientSlot(dayKey: string, hour: number): boolean {
    const date = this.resolveDayDate(dayKey);
    return this.form.date === date && Number(this.form.time) === Number(hour);
  }

  isHourAvailable(dayKey: string, hour: number): boolean {
    const date = this.resolveDayDate(dayKey);
    if (!date) {
      return false;
    }
    const slots = this.availableSlotsByDate()[date] || [];
    return slots.some((value) => Number(value) === Number(hour));
  }

  getDayLabel(dayKey: string): string {
    const week = this.currentWeek;
    return week?.days[dayKey]?.day_name ?? '';
  }

  getDayNumber(dayKey: string): string {
    const week = this.currentWeek;
    return week?.days[dayKey]?.day_no ?? '';
  }

  get selectedDateTimeLabel(): string {
    if (!this.form.date || !this.form.time) {
      return 'Натисніть, щоб обрати дату та час';
    }
    return `${this.form.date} ${String(this.form.time).padStart(2, '0')}:00`;
  }

  get hasSelectedDoctorDateTime(): boolean {
    return !!(this.form.date && this.form.time);
  }

  private getDefaultDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getDoctorDateMinIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:00`;
  }

  private loadDoctorCalendar() {
    this.loadingSlots.set(true);
    this.error.set('');

    const applyDoctor = (doctor: DoctorCardView | null) => {
      this.doctor = doctor;
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
    this.weeks = weeks.sort((a, b) => {
      const aTime = new Date(String((a as any)?.['date-form'] ?? '')).getTime();
      const bTime = new Date(String((b as any)?.['date-form'] ?? '')).getTime();
      const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
      const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
      return safeA - safeB;
    });

    const byDate: Record<string, number[]> = {};

    for (const week of this.weeks) {
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
      this.form.date = '';
      return;
    }

    const currentDate = String(this.form.date || '').trim();
    if (!currentDate || !byDate[currentDate]?.length) {
      this.form.date = availableDates[0];
    }

    const weekIndex = this.findWeekIndexByDate(this.form.date);
    this.currentWeekIndex = weekIndex >= 0 ? weekIndex : 0;

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

  private resolveDayDate(dayKey: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return dayKey;
    }
    const week = this.currentWeek;
    const dayAny = week?.days?.[dayKey] as any;
    if (dayAny?.date && /^\d{4}-\d{2}-\d{2}$/.test(dayAny.date)) {
      return dayAny.date;
    }
    return '';
  }

  private findWeekIndexByDate(date: string): number {
    if (!date) {
      return -1;
    }
    return this.weeks.findIndex((week: any) => {
      const fromRaw = String(week?.['date-form'] ?? '').trim();
      const toRaw = String(week?.['date-to'] ?? '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fromRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(toRaw)) {
        return false;
      }
      return date >= fromRaw && date <= toRaw;
    });
  }

  private ensureValidSelectedTime() {
    const date = String(this.form.date || '').trim();
    const options = date ? (this.availableSlotsByDate()[date] || []) : [];
    if (!options.length) {
      this.form.time = 0;
      this.selectedDateTimeIso = '';
      return;
    }
    const selected = Number(this.form.time);
    if (!options.includes(selected)) {
      this.form.time = options[0];
    }
    this.selectedDateTimeIso = `${date}T${String(this.form.time).padStart(2, '0')}:00:00`;
  }

  private blurActiveElement() {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
  }
}
