import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { ChatService } from '../../services/chat.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { Week } from '../../models/calendar.model';

@Component({
  selector: 'app-session-request',
  templateUrl: './session-request.page.html',
  styleUrls: ['./session-request.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonIcon,
    IonDatetime,
    IonModal,
    CommonModule,
    FormsModule
  ]
})
export class SessionRequestPage implements OnInit {
  isDoctor = false;
  currentUserId: number | null = null;
  targetUserId = 0;
  targetName = '';
  targetPhoto = '';
  doctorHash = '';
  doctorUserId = 0;
  doctorId = 0;
  doctorIdFromQuery = 0;
  private myProfile: any = null;

  doctor = signal<DoctorCardView | null>(null);
  loading = signal(false);
  error = signal('');
  success = signal('');

  form = {
    type: 1,
    format: 'online' as 'online' | 'offline',
    date: '',
    time: 0
  };

  readonly reserveTimeOptions = Array.from({ length: 17 }, (_, i) => i + 7);
  readonly weekHourOptions = Array.from({ length: 13 }, (_, i) => i + 9); // 9:00 - 21:00
  weeks: Week[] = [];
  currentWeekIndex = 0;
  initialWeekIndex = 0;
  selectedDateTimeIso = '';
  doctorDatePickerOpen = false;
  doctorDateMinIso = '';

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private authService: AuthService,
    private doctorService: DoctorService,
    private chatService: ChatService
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit(): void {
    this.form.date = '';
    this.form.time = 0;
    this.selectedDateTimeIso = '';
    this.doctorDateMinIso = this.getDoctorDateMinIso();

    this.route.queryParamMap.subscribe((params) => {
      this.targetUserId = Number(params.get('to_user_id') || 0);
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      this.doctorHash = String(params.get('hash') || '').trim();
      this.doctorUserId = Number(params.get('doctor_user_id') || 0);
      this.doctorIdFromQuery = Number(params.get('doctor_id') || 0);

      this.authService.getProfile().subscribe({
        next: (profile) => {
          this.myProfile = profile;
          this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
          this.currentUserId = Number(profile?.user_id) || null;
          this.doctorId = this.doctorIdFromQuery || Number((profile as any)?.doctor_id ?? 0) || 0;
          if (!this.doctorHash) {
            this.doctorHash = String((profile as any)?.hash ?? (profile as any)?.doctor_hash ?? '').trim();
          }
          this.resolveDoctor();
        },
        error: () => {
          this.isDoctor = false;
          this.currentUserId = null;
          this.myProfile = null;
          this.resolveDoctor();
        }
      });
    });
  }

  goBack() {
    this.location.back();
  }

  get targetLabel(): string {
    return this.isDoctor ? 'Клієнт' : 'Психолог';
  }

  get availableSessionTypes(): Array<{ value: number; label: string }> {
    const doctor = this.doctor();
    if (!doctor) {
      return [];
    }

    const options: Array<{ value: number; label: string }> = [];
    const hasType = (value: number) => options.some((item) => item.value === value);
    const pushType = (value: number, label: string) => {
      if (!hasType(value)) {
        options.push({ value, label });
      }
    };
    const ids = Array.isArray(doctor.therapyTypeIds) ? doctor.therapyTypeIds : [];

    if (ids.length) {
      if (ids.includes(1)) {
        pushType(1, 'Індивідуальна');
      }
      if (ids.includes(2)) {
        pushType(2, 'Сімейна');
      }
      if (ids.includes(3)) {
        pushType(3, 'Дитяча');
      }
    }

    // Fallback/augmentation by available prices and tags.
    if (doctor.priceIndividual) {
      pushType(1, 'Індивідуальна');
    }
    if (doctor.priceFamily) {
      pushType(2, 'Сімейна');
    }
    if (Array.isArray(doctor.workWithTypes) && doctor.workWithTypes.some((item) => String(item).toLowerCase().includes('діт'))) {
      pushType(3, 'Дитяча');
    }

    return options.sort((a, b) => a.value - b.value);
  }

  get availableFormats(): Array<{ value: 'online' | 'offline'; label: string }> {
    const doctor = this.doctor();
    if (!doctor) {
      return [];
    }

    const options: Array<{ value: 'online' | 'offline'; label: string }> = [];
    if (doctor.online) {
      options.push({ value: 'online', label: 'Онлайн' });
    }
    if (doctor.inPerson) {
      options.push({ value: 'offline', label: 'Очно' });
    }
    return options;
  }

  get selectedTypeLabel(): string {
    return this.availableSessionTypes.find((item) => item.value === Number(this.form.type))?.label || '';
  }

  get currentWeek(): Week | null {
    return this.weeks[this.currentWeekIndex] ?? null;
  }

  get currentWeekDayKeys(): string[] {
    const week = this.currentWeek;
    return week ? Object.keys(week.days) : [];
  }

  get selectedPrice(): number {
    const doctor = this.doctor();
    if (!doctor) {
      return 0;
    }
    if (Number(this.form.type) === 2) {
      return Number(doctor.priceFamily ?? 0);
    }
    return Number(doctor.priceIndividual ?? 0);
  }

  async submit() {
    if (this.loading()) {
      return;
    }

    this.error.set('');
    this.success.set('');

    const doctor = this.doctor();
    const hash = String(doctor?.hash || this.doctorHash || '').trim();
    if (!hash) {
      this.error.set('Не вдалося визначити психолога для бронювання.');
      return;
    }
    if (!this.availableSessionTypes.length || !this.availableFormats.length) {
      this.error.set('Для цього психолога недоступні потрібні параметри сесії.');
      return;
    }
    if (!this.form.date || !this.form.time) {
      this.error.set('Оберіть дату та час.');
      return;
    }
    if (!this.isDoctor && !this.hasSelectedClientSlot()) {
      this.error.set('Оберіть доступний час із графіка психолога.');
      return;
    }

    const payload: {
      hash: string;
      type: number;
      format: 'online' | 'offline';
      date: string;
      time: number;
      messenger: 'email' | 'telegram';
      doctor_reserve?: boolean;
      to_user_id?: number;
    } = {
      hash,
      type: Number(this.form.type),
      format: this.form.format,
      date: this.form.date,
      time: Number(this.form.time),
      messenger: 'telegram'
    };

    if (this.isDoctor) {
      if (!this.targetUserId) {
        this.error.set('Не визначено клієнта для бронювання.');
        return;
      }
      payload.doctor_reserve = true;
      payload.to_user_id = this.targetUserId;
    }

    this.loading.set(true);
    const result = await this.chatService.createOrder(payload);
    this.loading.set(false);

    if (!result.ok) {
      const backendError = String(result?.response?.error ?? '').trim();
      this.error.set(backendError || 'Не вдалося створити бронювання.');
      return;
    }

    this.success.set(String(result?.response?.success ?? 'Бронювання успішно створено').trim());

    if (!this.isDoctor) {
      const paymentLink = String(result?.response?.payment_link ?? '').trim();
      if (paymentLink) {
        window.open(paymentLink, '_blank');
      }
    }
  }

  private resolveDoctor() {
    this.loading.set(true);
    this.error.set('');

    if (this.doctorHash) {
      this.doctorService.getDoctorProfileByHash(this.doctorHash).subscribe({
        next: (result) => {
          if ((result as any)?.error) {
            this.resolveDoctorByIdOrDirectoryFallback();
            return;
          }

          this.doctor.set(result as DoctorCardView);
          this.setupCalendarFromDoctor(result as DoctorCardView);
          this.applyDefaultsByDoctor();
          this.loading.set(false);
        },
        error: () => {
          this.resolveDoctorByIdOrDirectoryFallback();
        }
      });
      return;
    }

    this.resolveDoctorByIdOrDirectoryFallback();
  }

  private resolveDoctorByIdOrDirectoryFallback() {
    if (this.doctorId > 0) {
      this.doctorService.getDoctorProfile(this.doctorId).subscribe({
        next: (result) => {
          if (!(result as any)?.error) {
            this.doctor.set(result as DoctorCardView);
            this.setupCalendarFromDoctor(result as DoctorCardView);
            this.applyDefaultsByDoctor();
            this.loading.set(false);
            return;
          }
          this.resolveDoctorByDirectoryFallback();
        },
        error: () => {
          this.resolveDoctorByDirectoryFallback();
        }
      });
      return;
    }

    if (this.doctorUserId > 0) {
      this.doctorService.getDoctorProfileByUserId(this.doctorUserId).subscribe({
        next: (result) => {
          if (!(result as any)?.error) {
            this.doctor.set(result as DoctorCardView);
            this.setupCalendarFromDoctor(result as DoctorCardView);
            this.applyDefaultsByDoctor();
            this.loading.set(false);
            return;
          }
          this.resolveDoctorByDirectoryFallback();
        },
        error: () => {
          this.resolveDoctorByDirectoryFallback();
        }
      });
      return;
    }

    this.resolveDoctorByDirectoryFallback();
  }

  private resolveDoctorByDirectoryFallback() {
    this.loading.set(true);

    this.doctorService.getPsychologists().subscribe({
      next: (doctors) => {
        const normalized = doctors || [];
        const foundByHash = this.doctorHash
          ? normalized.find((doctor) => String(doctor.hash ?? '').trim() === this.doctorHash)
          : undefined;

        let found = foundByHash;
        if (!found && this.doctorUserId > 0) {
          found = normalized.find((doctor) => Number(doctor.userId) === this.doctorUserId);
        }
        if (!found && this.isDoctor && this.currentUserId) {
          found = normalized.find((doctor) => Number(doctor.userId) === Number(this.currentUserId));
        }

        if (!found && this.isDoctor) {
          found = this.buildDoctorFromProfile(this.myProfile);
        }

        this.doctor.set(found ?? null);

        // Directory list can contain a lightweight doctor object without full calendar.
        // If we have doctor id, reload full profile to get available slots.
        const fallbackDoctorId = Number((found as any)?.id ?? 0);
        if (fallbackDoctorId > 0) {
          this.doctorService.getDoctorProfile(fallbackDoctorId).subscribe({
            next: (fullDoctor) => {
              if (!(fullDoctor as any)?.error) {
                this.doctor.set(fullDoctor as DoctorCardView);
                this.setupCalendarFromDoctor(fullDoctor as DoctorCardView);
              } else if (found) {
                this.setupCalendarFromDoctor(found as DoctorCardView);
              }
              this.applyDefaultsByDoctor();
              this.loading.set(false);
            },
            error: () => {
              if (found) {
                this.setupCalendarFromDoctor(found as DoctorCardView);
              }
              this.applyDefaultsByDoctor();
              this.loading.set(false);
            }
          });
        } else {
          if (found) {
            this.setupCalendarFromDoctor(found as DoctorCardView);
          }
          this.applyDefaultsByDoctor();
          this.loading.set(false);
        }

        if (!found) {
          this.error.set('Не вдалося підвантажити налаштування психолога для бронювання.');
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Не вдалося підвантажити дані психолога.');
      }
    });
  }

  private applyDefaultsByDoctor() {
    const types = this.availableSessionTypes;
    const formats = this.availableFormats;

    if (types.length > 0 && !types.some((item) => item.value === Number(this.form.type))) {
      this.form.type = types[0].value;
    }

    if (formats.length > 0 && !formats.some((item) => item.value === this.form.format)) {
      this.form.format = formats[0].value;
    }

    if (this.isDoctor) {
      this.selectedDateTimeIso = this.form.date && this.form.time
        ? `${this.form.date}T${String(this.form.time).padStart(2, '0')}:00:00`
        : '';
      return;
    }

    // Client should choose slot manually; no auto-selection.
    this.form.date = '';
    this.form.time = 0;
  }

  private getDefaultDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private setupCalendarFromDoctor(doctor: DoctorCardView) {
    const rawWeeks = doctor?.calendar?.weeks ? Object.values(doctor.calendar.weeks) : [];
    this.weeks = rawWeeks;
    const activeIndex = this.weeks.findIndex((week) => !!week.active);
    this.currentWeekIndex = activeIndex >= 0 ? activeIndex : 0;
    this.initialWeekIndex = this.currentWeekIndex;
  }

  prevWeek() {
    if (this.canGoPrevWeek()) {
      this.currentWeekIndex--;
    }
  }

  nextWeek() {
    if (this.canGoNextWeek()) {
      this.currentWeekIndex++;
    }
  }

  canGoPrevWeek(): boolean {
    // Don't allow going to weeks before the initial (current) week.
    return this.currentWeekIndex > this.initialWeekIndex;
  }

  canGoNextWeek(): boolean {
    const maxForwardIndex = Math.min(this.weeks.length - 1, this.initialWeekIndex + 4);
    return this.currentWeekIndex < maxForwardIndex;
  }

  onDoctorDateTimeChange(value: string | string[] | null | undefined) {
    const iso = Array.isArray(value) ? (value[0] || '') : (value || '');
    if (!iso) {
      return;
    }
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

  private getDoctorDateMinIso(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:00`;
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
  }

  isSelectedClientSlot(dayKey: string, hour: number): boolean {
    const date = this.resolveDayDate(dayKey);
    return this.form.date === date && Number(this.form.time) === Number(hour);
  }

  getAvailableSlotsForDay(dayKey: string): Array<{ time: number; disabled: boolean }> {
    const week = this.currentWeek;
    if (!week || !week.days[dayKey]?.times) {
      return [];
    }
    return week.days[dayKey].times.filter((slot: any) => {
      const raw = slot?.disabled;
      if (raw === true || raw === 1 || raw === '1') {
        return false;
      }
      return true; // false / 0 / '0' / null / undefined => enabled
    });
  }

  isHourAvailable(dayKey: string, hour: number): boolean {
    const slots = this.getAvailableSlotsForDay(dayKey);
    return slots.some((slot) => Number(slot.time) === Number(hour));
  }

  getDayLabel(dayKey: string): string {
    const week = this.currentWeek;
    return week?.days[dayKey]?.day_name ?? '';
  }

  getDayNumber(dayKey: string): string {
    const week = this.currentWeek;
    return week?.days[dayKey]?.day_no ?? '';
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
    return this.form.date;
  }

  private hasSelectedClientSlot(): boolean {
    const week = this.currentWeek;
    if (!week) {
      return false;
    }
    for (const dayKey of Object.keys(week.days)) {
      const date = this.resolveDayDate(dayKey);
      const slots = this.getAvailableSlotsForDay(dayKey);
      if (this.form.date === date && slots.some((slot) => Number(slot.time) === Number(this.form.time))) {
        return true;
      }
    }
    return false;
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

  private buildDoctorFromProfile(profile: any): DoctorCardView | undefined {
    if (!profile || !this.isDoctor) {
      return undefined;
    }

    const therapyTypeIds = this.parseTherapyTypeIds(
      profile?.therapy_type ?? profile?.therapy_types ?? profile?.therapy_type_ids
    );
    const workType = this.parseWorkType(profile?.work_type ?? profile?.format ?? profile?.work_format);
    const hash = String(profile?.hash ?? '').trim();

    return {
      id: Number(profile?.doctor_id ?? 0) || 0,
      userId: Number(profile?.user_id ?? this.currentUserId ?? 0) || 0,
      hash,
      fullName: String(profile?.firstname ?? '') + ' ' + String(profile?.lastname ?? ''),
      online: workType.online,
      inPerson: workType.inPerson,
      therapyTypeIds,
      priceIndividual: Number(profile?.session_amount ?? profile?.price_individual ?? 0),
      priceFamily: Number(profile?.family_session_amount ?? profile?.price_family ?? 0),
      workWithTypes: Array.isArray(profile?.types) ? profile.types : []
    };
  }

  private parseWorkType(source: any): { online: boolean; inPerson: boolean } {
    const raw = String(source ?? '').toLowerCase();
    if (!raw) {
      return { online: false, inPerson: false };
    }

    const normalized = raw.replace(/\s|_/g, '').replace('-', '');
    const both = normalized.includes('both') || normalized.includes('обидва') || normalized.includes('усі');
    const online = both || normalized.includes('online') || normalized.includes('онлайн');
    const inPerson = both || normalized.includes('offline') || normalized.includes('очно') || normalized.includes('офлайн');
    return { online, inPerson };
  }

  private parseTherapyTypeIds(source: any): number[] {
    if (!source) {
      return [];
    }

    const ids = new Set<number>();
    const put = (value: any) => {
      const n = Number(value);
      if (Number.isFinite(n) && [1, 2, 3].includes(n)) {
        ids.add(n);
        return;
      }
      const text = String(value ?? '').toLowerCase();
      if (text.includes('індив') || text.includes('индив') || text.includes('individual')) ids.add(1);
      if (text.includes('сім') || text.includes('сем') || text.includes('пар') || text.includes('family')) ids.add(2);
      if (text.includes('дит') || text.includes('child')) ids.add(3);
    };

    if (Array.isArray(source)) {
      source.forEach(put);
    } else if (typeof source === 'object') {
      Object.values(source).forEach(put);
    } else if (typeof source === 'string') {
      const raw = source.trim();
      try {
        const parsed = JSON.parse(raw);
        return this.parseTherapyTypeIds(parsed);
      } catch {
        raw.split(',').forEach(put);
      }
    } else {
      put(source);
    }

    return Array.from(ids).sort((a, b) => a - b);
  }
}
