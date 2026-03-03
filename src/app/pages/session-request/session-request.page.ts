import { ChangeDetectorRef, Component, NgZone, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonModal,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';
import { DoctorService } from '../../services/doctor.service';
import { ChatService } from '../../services/chat.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { Week } from '../../models/calendar.model';
import { PaymentFlowService } from '../../services/payment-flow.service';

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
    IonButton,
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
  sessionIdFromQuery = 0;
  fallbackAmount = 0;
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
  selectedDateTimeIso = '';
  doctorDatePickerOpen = false;
  doctorDateMinIso = '';
  private resolveSeq = 0;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private authService: AuthService,
    private doctorService: DoctorService,
    private chatService: ChatService,
    private paymentFlowService: PaymentFlowService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit(): void {
    this.form.date = '';
    this.form.time = 0;
    this.selectedDateTimeIso = '';
    this.doctorDateMinIso = this.getDoctorDateMinIso();

    this.route.queryParamMap.subscribe((params) => {
      const seq = ++this.resolveSeq;
      this.resetStateForNavigation();

      this.targetUserId = Number(params.get('to_user_id') || 0);
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      this.doctorHash = String(params.get('hash') || '').trim();
      this.doctorUserId = Number(params.get('doctor_user_id') || 0);
      this.doctorIdFromQuery = Number(params.get('doctor_id') || 0);
      this.sessionIdFromQuery = Number(params.get('session_id') || 0);
      this.fallbackAmount = Number(params.get('amount') || 0);
      const preType = Number(params.get('pre_type') || 0);
      const preFormat = String(params.get('pre_format') || '').trim().toLowerCase();
      const preDate = String(params.get('pre_date') || '').trim();
      const preTime = Number(params.get('pre_time') || 0);
      if ([1, 2, 3].includes(preType)) {
        this.form.type = preType;
      }
      if (preFormat === 'online' || preFormat === 'offline') {
        this.form.format = preFormat as 'online' | 'offline';
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(preDate) && preTime > 0) {
        this.form.date = preDate;
        this.form.time = preTime;
      }

      this.authService.getProfile().subscribe({
        next: (profile) => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          this.myProfile = profile;
          this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
          this.currentUserId = Number(profile?.user_id) || null;
          this.doctorId = this.doctorIdFromQuery || Number((profile as any)?.doctor_id ?? 0) || 0;
          if (!this.doctorHash) {
            this.doctorHash = String((profile as any)?.hash ?? (profile as any)?.doctor_hash ?? '').trim();
          }
          this.resolveDoctor(seq);
          this.resolveFallbackAmountFromSessions();
        },
        error: () => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          this.isDoctor = false;
          this.currentUserId = null;
          this.myProfile = null;
          this.resolveDoctor(seq);
          this.resolveFallbackAmountFromSessions();
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

  get showPairOnlineRequestBlock(): boolean {
    return Number(this.form.type) === 2 && this.form.format === 'online';
  }

  get showOfflineRequestBlock(): boolean {
    return this.form.format === 'offline';
  }

  get showContactRequestBlock(): boolean {
    return this.showPairOnlineRequestBlock || this.showOfflineRequestBlock;
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
    const fromDoctor = Number(
      doctor
        ? (Number(this.form.type) === 2 ? (doctor.priceFamily ?? 0) : (doctor.priceIndividual ?? 0))
        : 0
    );
    if (Number.isFinite(fromDoctor) && fromDoctor > 0) {
      return fromDoctor;
    }
    return Number(this.fallbackAmount || 0);
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
    if (!this.showContactRequestBlock && (!this.form.date || !this.form.time)) {
      this.error.set('Оберіть дату та час.');
      return;
    }
    if (!this.isDoctor && !this.showContactRequestBlock && !this.hasSelectedClientSlot()) {
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
      if (!this.isDoctor && this.isRecoverableCreateOrderError(result)) {
        const recoveredLink = await this.waitForPaymentLinkBySelection();
        if (recoveredLink) {
          const recoveredOrderId = this.resolveOrderId(undefined, recoveredLink);
          const paymentState = await this.paymentFlowService.openPaymentAndCheck(recoveredOrderId, recoveredLink);
          this.navigateToPaymentResult(paymentState, recoveredOrderId);
          return;
        }
      }
      const backendError = this.resolveOrderErrorMessage(result);
      this.error.set(backendError || 'Не вдалося створити бронювання.');
      return;
    }

    this.success.set(String(result?.response?.success ?? 'Бронювання успішно створено').trim());

    if (!this.isDoctor) {
      const orderId = this.resolveOrderId(result?.response);
      let paymentLink = this.resolvePaymentLink(result?.response);
      if (!paymentLink && orderId > 0) {
        paymentLink = await this.waitForPaymentLinkFromSessions(orderId);
      }
      if (paymentLink) {
        const resolvedOrderId = orderId > 0 ? orderId : this.resolveOrderId(result?.response, paymentLink);
        const paymentState = await this.paymentFlowService.openPaymentAndCheck(resolvedOrderId, paymentLink);
        this.navigateToPaymentResult(paymentState, resolvedOrderId);
        return;
      }
      this.error.set('Сесію створено, але не вдалося отримати посилання на оплату. Спробуйте оновити сторінку або зверніться в підтримку.');
    }
  }

  private navigateToPaymentResult(status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown', orderId: number): void {
    const date = this.formatDateForResult(this.form.date);
    const time = this.form.time ? `${String(this.form.time).padStart(2, '0')}:00` : '';

    this.router.navigate(['/tabs/payment-result'], {
      queryParams: {
        status,
        order_id: orderId > 0 ? String(orderId) : '',
        doctor_fullname: this.doctor()?.fullName || this.targetName || '',
        date,
        time,
        payment_date: this.formatDateTimeForResult(new Date()),
        amount: this.selectedPrice > 0 ? String(this.selectedPrice) : ''
      }
    });
  }

  private formatDateForResult(value: string): string {
    const trimmed = String(value || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return '';
    }
    const [y, m, d] = trimmed.split('-');
    return `${d}.${m}.${y}`;
  }

  private formatDateTimeForResult(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
  }

  private resolveOrderId(response: any, paymentLink?: string): number {
    const candidates = [
      response?.order_id,
      response?.id,
      response?.order?.id,
      response?.result?.order_id
    ];
    for (const candidate of candidates) {
      const n = Number(candidate ?? 0);
      if (Number.isFinite(n) && n > 0) {
        return n;
      }
    }

    const link = String(paymentLink ?? response?.payment_link ?? '').trim();
    if (link) {
      try {
        const parsed = new URL(link);
        const keys = ['order_id', 'orderId', 'invoice_id', 'invoiceId', 'payment_id', 'paymentId'];
        for (const key of keys) {
          const value = Number(parsed.searchParams.get(key) ?? 0);
          if (Number.isFinite(value) && value > 0) {
            return value;
          }
        }
      } catch {
        return 0;
      }
    }

    return 0;
  }

  private resolvePaymentLink(response: any): string {
    const candidates = [
      response?.payment_link,
      response?.checkout_url,
      response?.payment_url,
      response?.url,
      response?.result?.payment_link,
      response?.result?.checkout_url,
      response?.result?.payment_url,
      response?.data?.payment_link
    ];

    for (const candidate of candidates) {
      const link = String(candidate ?? '').trim();
      if (link.startsWith('http://') || link.startsWith('https://')) {
        return link;
      }
    }

    const raw = String(response?.raw ?? '').trim();
    if (raw) {
      const urlMatch = raw.match(/https?:\/\/[^\s"']+/i);
      if (urlMatch?.[0]) {
        return urlMatch[0].trim();
      }
    }

    return '';
  }

  private async resolvePaymentLinkFromSessions(orderId: number): Promise<string> {
    if (!orderId) {
      return '';
    }

    try {
      const response = await firstValueFrom(this.authService.getMySessions());
      const arrays = [
        Array.isArray((response as any)?.planned) ? (response as any).planned : [],
        Array.isArray((response as any)?.past) ? (response as any).past : [],
        Array.isArray((response as any)?.sessions) ? (response as any).sessions : [],
        Array.isArray((response as any)?.results) ? (response as any).results : [],
        Array.isArray((response as any)?.items) ? (response as any).items : [],
        Array.isArray((response as any)?.list) ? (response as any).list : [],
        Array.isArray((response as any)?.data) ? (response as any).data : []
      ];

      for (const list of arrays) {
        const found = list.find((item: any) => Number(item?.order_id ?? 0) === Number(orderId));
        const link = String(found?.payment_link ?? found?.checkout_url ?? '').trim();
        if (link.startsWith('http://') || link.startsWith('https://')) {
          return link;
        }
      }
    } catch {
      return '';
    }

    return '';
  }

  private async waitForPaymentLinkFromSessions(orderId: number): Promise<string> {
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
      const link = await this.resolvePaymentLinkFromSessions(orderId);
      if (link) {
        return link;
      }
      if (i < maxAttempts - 1) {
        await this.sleep(1200);
      }
    }
    return '';
  }

  private async waitForPaymentLinkBySelection(): Promise<string> {
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
      const link = await this.resolvePaymentLinkBySelection();
      if (link) {
        return link;
      }
      if (i < maxAttempts - 1) {
        await this.sleep(1200);
      }
    }
    return '';
  }

  private async resolvePaymentLinkBySelection(): Promise<string> {
    if (!this.form.date || !this.form.time) {
      return '';
    }

    try {
      const response = await firstValueFrom(this.authService.getMySessions());
      const arrays = [
        Array.isArray((response as any)?.planned) ? (response as any).planned : [],
        Array.isArray((response as any)?.past) ? (response as any).past : [],
        Array.isArray((response as any)?.sessions) ? (response as any).sessions : [],
        Array.isArray((response as any)?.results) ? (response as any).results : [],
        Array.isArray((response as any)?.items) ? (response as any).items : [],
        Array.isArray((response as any)?.list) ? (response as any).list : [],
        Array.isArray((response as any)?.data) ? (response as any).data : []
      ];

      const doctorId = Number(this.doctor()?.id ?? this.doctorId ?? 0);
      const date = String(this.form.date).trim();
      const time = Number(this.form.time);

      for (const list of arrays) {
        const match = list.find((item: any) => {
          const itemDate = String(item?.session_date ?? item?.date ?? '').trim();
          if (itemDate !== date) {
            return false;
          }

          const itemHour = this.extractHourFromSession(item);
          if (itemHour !== time) {
            return false;
          }

          if (doctorId > 0) {
            const itemDoctorId = Number(item?.doctor_id ?? 0);
            if (itemDoctorId > 0 && itemDoctorId !== doctorId) {
              return false;
            }
          }
          return true;
        });

        const link = String(match?.payment_link ?? match?.checkout_url ?? '').trim();
        if (link.startsWith('http://') || link.startsWith('https://')) {
          return link;
        }
      }
    } catch {
      return '';
    }

    return '';
  }

  private extractHourFromSession(item: any): number {
    const fromPeriod = String(item?.session_time_period ?? '').match(/(\d{1,2})[:.]/);
    if (fromPeriod?.[1]) {
      return Number(fromPeriod[1]);
    }
    const fromTime = String(item?.session_time ?? '').match(/(\d{1,2})[:.]/);
    if (fromTime?.[1]) {
      return Number(fromTime[1]);
    }
    return Number(item?.time ?? 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private resolveOrderErrorMessage(result: { response?: any; error?: any } | null | undefined): string {
    const response = result?.response;
    const errorObj = result?.error;

    const directCandidates = [
      response?.error,
      response?.message,
      response?.msg,
      response?.detail
    ];
    for (const candidate of directCandidates) {
      const text = String(candidate ?? '').trim();
      if (text) {
        return text;
      }
    }

    const raw = String(response?.raw ?? '').trim();
    if (raw) {
      const start = raw.lastIndexOf('{');
      const end = raw.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try {
          const parsed = JSON.parse(raw.slice(start, end + 1));
          const parsedText = String(parsed?.error ?? parsed?.message ?? '').trim();
          if (parsedText) {
            return parsedText;
          }
        } catch {
          // fallback to raw
        }
      }
      return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw;
    }

    const httpErrorText = String(errorObj?.error?.error ?? errorObj?.error?.message ?? errorObj?.message ?? '').trim();
    if (httpErrorText) {
      return httpErrorText;
    }

    return '';
  }

  private isRecoverableCreateOrderError(result: { response?: any; error?: any } | null | undefined): boolean {
    const text = this.resolveOrderErrorMessage(result).toLowerCase();
    return text.includes('непередб') || text.includes('support') || text.includes('підтримк');
  }

  private resolveDoctor(seq: number) {
    if (!this.isActualSeq(seq)) {
      return;
    }
    this.loading.set(true);
    this.error.set('');

    if (this.doctorHash) {
      this.doctorService.getDoctorProfileByHash(this.doctorHash).subscribe({
        next: (result) => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          if ((result as any)?.error) {
            this.resolveDoctorByIdOrDirectoryFallback(seq);
            return;
          }

          this.doctor.set(result as DoctorCardView);
          this.setupCalendarFromDoctor(result as DoctorCardView);
          this.applyDefaultsByDoctor();
          this.loading.set(false);
        },
        error: () => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          this.resolveDoctorByIdOrDirectoryFallback(seq);
        }
      });
      return;
    }

    this.resolveDoctorByIdOrDirectoryFallback(seq);
  }

  private resolveDoctorByIdOrDirectoryFallback(seq: number) {
    if (!this.isActualSeq(seq)) {
      return;
    }
    if (this.doctorId > 0) {
      this.doctorService.getDoctorProfile(this.doctorId).subscribe({
        next: (result) => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          if (!(result as any)?.error) {
            this.doctor.set(result as DoctorCardView);
            this.setupCalendarFromDoctor(result as DoctorCardView);
            this.applyDefaultsByDoctor();
            this.loading.set(false);
            return;
          }
          this.resolveDoctorByDirectoryFallback(seq);
        },
        error: () => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          this.resolveDoctorByDirectoryFallback(seq);
        }
      });
      return;
    }

    if (this.doctorUserId > 0) {
      this.doctorService.getDoctorProfileByUserId(this.doctorUserId).subscribe({
        next: (result) => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          if (!(result as any)?.error) {
            this.doctor.set(result as DoctorCardView);
            this.setupCalendarFromDoctor(result as DoctorCardView);
            this.applyDefaultsByDoctor();
            this.loading.set(false);
            return;
          }
          this.resolveDoctorByDirectoryFallback(seq);
        },
        error: () => {
          if (!this.isActualSeq(seq)) {
            return;
          }
          this.resolveDoctorByDirectoryFallback(seq);
        }
      });
      return;
    }

    this.resolveDoctorByDirectoryFallback(seq);
  }

  private resolveDoctorByDirectoryFallback(seq: number) {
    if (!this.isActualSeq(seq)) {
      return;
    }
    this.loading.set(true);

    this.doctorService.getPsychologists().subscribe({
      next: (doctors) => {
        if (!this.isActualSeq(seq)) {
          return;
        }
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
              if (!this.isActualSeq(seq)) {
                return;
              }
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
              if (!this.isActualSeq(seq)) {
                return;
              }
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
        if (!this.isActualSeq(seq)) {
          return;
        }
        this.loading.set(false);
        this.error.set('Не вдалося підвантажити дані психолога.');
      }
    });
  }

  private resetStateForNavigation(): void {
    this.loading.set(false);
    this.error.set('');
    this.success.set('');
    this.doctor.set(null);
    this.weeks = [];
    this.currentWeekIndex = 0;
  }

  private isActualSeq(seq: number): boolean {
    return seq === this.resolveSeq;
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

    if (this.showContactRequestBlock) {
      this.form.date = '';
      this.form.time = 0;
      return;
    }

    // Client should choose slot manually; keep preselected slot from profile if passed.
    if (!this.form.date || !this.form.time) {
      this.form.date = '';
      this.form.time = 0;
    }
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
    this.weeks = rawWeeks.sort((a, b) => {
      const aTime = new Date(String((a as any)?.['date-form'] ?? '')).getTime();
      const bTime = new Date(String((b as any)?.['date-form'] ?? '')).getTime();
      const safeA = Number.isNaN(aTime) ? Number.MAX_SAFE_INTEGER : aTime;
      const safeB = Number.isNaN(bTime) ? Number.MAX_SAFE_INTEGER : bTime;
      return safeA - safeB;
    });
    const activeIndex = this.weeks.findIndex((week) => !!week.active);
    this.currentWeekIndex = activeIndex >= 0 ? activeIndex : 0;
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
    return this.currentWeekIndex > 0;
  }

  canGoNextWeek(): boolean {
    return this.currentWeekIndex < this.weeks.length - 1;
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
    this.closeDoctorDatePicker();
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
    if (this.showContactRequestBlock) {
      return;
    }

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

  isHourBooked(dayKey: string, hour: number): boolean {
    const week = this.currentWeek;
    const slots = week?.days?.[dayKey]?.times;
    if (!Array.isArray(slots)) {
      return false;
    }
    const slot = slots.find((item: any) => Number(item?.time) === Number(hour));
    if (!slot) {
      return false;
    }
    const raw = (slot as any)?.disabled;
    return raw === true || raw === 1 || raw === '1';
  }

  getHourLabel(dayKey: string, hour: number): string {
    if (this.isHourAvailable(dayKey, hour)) {
      return `${hour}:00`;
    }
    return '';
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

  get isSelectedDoctorSlotAvailable(): boolean {
    if (!this.form.date || !this.form.time) {
      return false;
    }
    return this.isSlotAvailableByDateAndHour(this.form.date, Number(this.form.time));
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

  isSessionTypeSelected(typeValue: number): boolean {
    return Number(this.form.type) === Number(typeValue);
  }

  onSessionTypeSelect(typeValue: number): void {
    const normalizedType = Number.parseInt(String(typeValue), 10) as 1 | 2 | 3;
    if (![1, 2, 3].includes(normalizedType)) {
      return;
    }

    if (Number(this.form.type) === normalizedType) {
      return;
    }
    this.zone.run(() => {
      this.form = { ...this.form, type: normalizedType };
      this.onBookingModeChanged();
      this.cdr.detectChanges();
    });
  }

  onSessionFormatSelect(formatValue: 'online' | 'offline'): void {
    if (this.form.format === formatValue) {
      return;
    }
    this.zone.run(() => {
      this.form = { ...this.form, format: formatValue };
      this.onBookingModeChanged();
      this.cdr.detectChanges();
    });
  }

  openChatForSessionArrangement(): void {
    const doctor = this.doctor();
    if (!doctor) {
      return;
    }

    const queryParams: Record<string, string | number> = { type: 'write' };
    if (doctor.hash) {
      queryParams['hash'] = doctor.hash;
    }
    if (doctor.userId) {
      queryParams['to_user_id'] = Number(doctor.userId);
    }
    this.router.navigate(['/tabs/chat'], { queryParams });
  }

  private onBookingModeChanged(): void {
    this.error.set('');
    this.success.set('');

    if (this.isDoctor) {
      return;
    }

    if (this.showContactRequestBlock) {
      this.form.date = '';
      this.form.time = 0;
      return;
    }

    this.currentWeekIndex = 0;
  }

  private isSlotAvailableByDateAndHour(date: string, hour: number): boolean {
    if (!date || !hour) {
      return false;
    }

    for (const week of this.weeks) {
      const dayKeys = Object.keys(week?.days || {});
      for (const dayKey of dayKeys) {
        const day = (week as any)?.days?.[dayKey];
        const dayDate = String(day?.date || '').trim();
        if (dayDate !== date || !Array.isArray(day?.times)) {
          continue;
        }
        const slot = day.times.find((item: any) => Number(item?.time) === Number(hour));
        if (!slot) {
          return false;
        }
        const raw = (slot as any)?.disabled;
        return !(raw === true || raw === 1 || raw === '1');
      }
    }

    return false;
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

  private resolveFallbackAmountFromSessions(): void {
    if (this.fallbackAmount > 0 || !this.sessionIdFromQuery) {
      return;
    }

    this.authService.getMySessions().subscribe({
      next: (resp: any) => {
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const past = Array.isArray(resp?.past) ? resp.past : [];
        const fallback = [resp?.sessions, resp?.results, resp?.items, resp?.list, resp?.data]
          .find((value: any) => Array.isArray(value));
        const all = [...planned, ...past, ...(Array.isArray(fallback) ? fallback : [])];

        const match = all.find((item: any) => {
          const candidates = [item?.meet_id, item?.order_id, item?.id, item?.session_id];
          return candidates.some((candidate) => Number(candidate || 0) === Number(this.sessionIdFromQuery));
        });

        const amount = Number((match as any)?.amount ?? (match as any)?.session_amount ?? 0);
        if (Number.isFinite(amount) && amount > 0) {
          this.fallbackAmount = amount;
        }
      },
      error: () => {
        // Ignore fallback load errors.
      }
    });
  }
}
