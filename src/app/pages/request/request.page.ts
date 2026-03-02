import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { AuthService } from '../../services/auth.service';
import { PaymentFlowService } from '../../services/payment-flow.service';

@Component({
  selector: 'app-request',
  templateUrl: './request.page.html',
  styleUrls: ['./request.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonIcon, CommonModule, FormsModule]
})
export class RequestPage implements OnInit {
  private readonly pendingOrderKey = 'request_pending_order';
  doctor = signal<DoctorCardView | null>(null);
  loading = signal(false);
  error = signal('');
  success = signal('');

  hash = '';
  doctorId = 0;
  doctorUserId = 0;
  targetName = '';
  targetPhoto = '';
  isAuthenticated = false;
  guestStep: 'form' | 'code' = 'form';
  guestInfo = '';
  guestError = '';
  guestForm = {
    name: '',
    surname: '',
    email: '',
    phone: '',
    confirm: true,
    code: '',
    messenger: 'telegram' as 'telegram' | 'email'
  };
  form = {
    type: 1,
    format: 'online' as 'online' | 'offline',
    date: '',
    time: 0,
    promo_code: ''
  };

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private doctorService: DoctorService,
    private chatService: ChatService,
    private authService: AuthService,
    private paymentFlowService: PaymentFlowService,
    private router: Router
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit(): void {
    this.isAuthenticated = this.authService.isAuthenticated();
    this.route.queryParamMap.subscribe((params) => {
      this.hash = String(params.get('hash') || '').trim();
      this.doctorId = Number(params.get('doctor_id') || 0);
      this.doctorUserId = Number(params.get('doctor_user_id') || 0);
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      const type = Number(params.get('pre_type') || 1);
      const format = String(params.get('pre_format') || 'online').trim().toLowerCase();
      const date = String(params.get('pre_date') || '').trim();
      const time = Number(params.get('pre_time') || 0);

      this.form.type = [1, 2, 3].includes(type) ? type : 1;
      this.form.format = format === 'offline' ? 'offline' : 'online';
      this.form.date = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
      this.form.time = time > 0 ? time : 0;

      this.loadDoctorProfile();
      this.tryAutoPayAfterAuth();
    });
  }

  goBack() {
    this.location.back();
  }

  get selectedTypeLabel(): string {
    if (this.form.type === 2) {
      return 'Для пари';
    }
    if (this.form.type === 3) {
      return 'Для дитини';
    }
    return 'Для мене';
  }

  get selectedFormatLabel(): string {
    return this.form.format === 'offline' ? 'Очно' : 'Онлайн';
  }

  get selectedPrice(): number {
    const doctor = this.doctor();
    if (!doctor) {
      return 0;
    }
    if (this.form.type === 2) {
      return Number(doctor.priceFamily ?? 0);
    }
    return Number(doctor.priceIndividual ?? 0);
  }

  get selectedDateTimeLabel(): string {
    if (!this.form.date || !this.form.time) {
      return 'Не обрано';
    }
    const [y, m, d] = this.form.date.split('-');
    return `${d}.${m}.${y}, ${this.form.time}.00`;
  }

  get cardName(): string {
    const fromQuery = this.targetName.trim();
    if (fromQuery) {
      return fromQuery;
    }
    return this.doctor()?.fullName || 'Психолог';
  }

  get cardPhoto(): string {
    const fromQuery = this.targetPhoto.trim();
    if (fromQuery) {
      return fromQuery;
    }
    return this.doctor()?.avatarUrl || 'assets/icon/favicon.png';
  }

  async pay(override?: {
    hash?: string;
    type?: number;
    format?: 'online' | 'offline';
    date?: string;
    time?: number;
    promo_code?: string;
    messenger?: 'telegram' | 'email';
  }) {
    this.error.set('');
    this.success.set('');
    this.guestError = '';

    const doctorHash = String(override?.hash ?? this.resolvedDoctorHash).trim();
    const type = Number(override?.type ?? this.form.type);
    const format = (override?.format ?? this.form.format) === 'offline' ? 'offline' : 'online';
    const date = String(override?.date ?? this.form.date).trim();
    const time = Number(override?.time ?? this.form.time);
    const promo_code = String(override?.promo_code ?? this.form.promo_code ?? '').trim();
    const messenger = (override?.messenger ?? this.guestForm.messenger) === 'email' ? 'email' : 'telegram';

    if (!doctorHash || !date || !time) {
      this.error.set('Не вистачає даних для бронювання.');
      return;
    }

    this.loading.set(true);
    const result = await this.chatService.createOrder({
      hash: doctorHash,
      type,
      format,
      date,
      time,
      messenger,
      promo_code: promo_code || undefined
    });
    this.loading.set(false);

    if (!result.ok) {
      if (this.isRecoverableCreateOrderError(result)) {
        const recoveredLink = await this.waitForPaymentLinkBySelection();
        if (recoveredLink) {
          const recoveredOrderId = this.resolveOrderId(undefined, recoveredLink);
          this.clearPendingOrder();
          const paymentState = await this.paymentFlowService.openPaymentAndCheck(recoveredOrderId, recoveredLink);
          this.navigateToPaymentResult(paymentState, recoveredOrderId);
          return;
        }
      }
      const backendError = this.resolveOrderErrorMessage(result);
      this.error.set(backendError || 'Не вдалося створити замовлення.');
      return;
    }

    const orderId = this.resolveOrderId(result?.response);
    let paymentLink = this.resolvePaymentLink(result?.response);
    if (!paymentLink && orderId > 0) {
      paymentLink = await this.waitForPaymentLinkFromSessions(orderId);
    }
    if (paymentLink) {
      const resolvedOrderId = orderId > 0 ? orderId : this.resolveOrderId(result?.response, paymentLink);
      this.clearPendingOrder();
      const paymentState = await this.paymentFlowService.openPaymentAndCheck(resolvedOrderId, paymentLink);
      this.navigateToPaymentResult(paymentState, resolvedOrderId);
      return;
    }

    this.error.set('Сесію створено, але не вдалося отримати посилання на оплату. Спробуйте оновити сторінку або зверніться в підтримку.');
    this.clearPendingOrder();
  }

  submitGuestRegister() {
    if (this.loading()) {
      return;
    }

    this.guestError = '';
    this.guestInfo = '';

    if (this.guestStep === 'form') {
      if (!this.guestForm.name.trim() || !this.guestForm.surname.trim() || !this.guestForm.email.trim() || !this.guestForm.phone.trim()) {
        this.guestError = 'Заповніть, будь ласка, всі обовʼязкові поля.';
        return;
      }
      if (!this.guestForm.confirm) {
        this.guestError = 'Підтвердіть, будь ласка, умови платформи.';
        return;
      }
      const hash = this.resolvedDoctorHash;
      if (!hash || !this.form.date || !this.form.time) {
        this.guestError = 'Не вистачає даних сесії для оплати.';
        return;
      }
    } else if (!this.guestForm.code.trim()) {
      this.guestError = 'Введіть код підтвердження.';
      return;
    }

    this.savePendingOrder();
    this.loading.set(true);
    this.authService.register({
      name: this.guestForm.name.trim(),
      surname: this.guestForm.surname.trim(),
      email: this.guestForm.email.trim(),
      phone: this.guestForm.phone.trim(),
      confirm: this.guestForm.confirm,
      code: this.guestStep === 'code' ? this.guestForm.code.trim() : undefined
    }).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.stage === 'awaiting_code') {
          this.guestStep = 'code';
          this.guestInfo = response.message || 'Введіть код з SMS/Email.';
          return;
        }
        if (response.stage === 'error') {
          this.guestError = response.message || 'Не вдалося завершити реєстрацію.';
        }
        // stage === done -> AuthService reload.
      },
      error: () => {
        this.loading.set(false);
        this.guestError = 'Не вдалося завершити реєстрацію.';
      }
    });
  }

  private get resolvedDoctorHash(): string {
    const fromQuery = String(this.hash || '').trim();
    if (fromQuery) {
      return fromQuery;
    }
    return String(this.doctor()?.hash || '').trim();
  }

  private savePendingOrder() {
    const hash = this.resolvedDoctorHash;
    if (!hash || !this.form.date || !this.form.time) {
      return;
    }

    const payload = {
      hash,
      type: this.form.type,
      format: this.form.format,
      date: this.form.date,
      time: this.form.time,
      promo_code: this.form.promo_code?.trim() || '',
      messenger: this.guestForm.messenger
    };

    sessionStorage.setItem(this.pendingOrderKey, JSON.stringify(payload));
  }

  private clearPendingOrder() {
    sessionStorage.removeItem(this.pendingOrderKey);
  }

  private navigateToPaymentResult(status: 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown', orderId: number): void {
    const date = this.formatDateForResult(this.form.date);
    const time = this.form.time ? `${String(this.form.time).padStart(2, '0')}:00` : '';

    this.router.navigate(['/tabs/payment-result'], {
      queryParams: {
        status,
        order_id: orderId > 0 ? String(orderId) : '',
        doctor_fullname: this.cardName,
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private tryAutoPayAfterAuth() {
    if (!this.isAuthenticated) {
      return;
    }

    const raw = sessionStorage.getItem(this.pendingOrderKey);
    if (!raw) {
      return;
    }

    let pending: {
      hash?: string;
      type?: number;
      format?: 'online' | 'offline';
      date?: string;
      time?: number;
      promo_code?: string;
      messenger?: 'telegram' | 'email';
    } = {};

    try {
      pending = JSON.parse(raw);
    } catch {
      this.clearPendingOrder();
      return;
    }

    if (!pending.hash || !pending.date || !pending.time) {
      this.clearPendingOrder();
      return;
    }

    setTimeout(() => {
      this.pay(pending);
    }, 0);
  }

  private loadDoctorProfile() {
    this.error.set('');
    this.doctor.set(null);

    if (this.hash) {
      this.doctorService.getDoctorProfileByHash(this.hash).subscribe((profile) => {
        if ((profile as any)?.error) {
          this.loadDoctorByIdOrUserId();
          return;
        }
        this.doctor.set(profile as DoctorCardView);
      });
      return;
    }

    this.loadDoctorByIdOrUserId();
  }

  private loadDoctorByIdOrUserId() {
    if (this.doctorId > 0) {
      this.doctorService.getDoctorProfile(this.doctorId).subscribe((profile) => {
        if ((profile as any)?.error) {
          this.loadDoctorByUserId();
          return;
        }
        this.doctor.set(profile as DoctorCardView);
      });
      return;
    }

    this.loadDoctorByUserId();
  }

  private loadDoctorByUserId() {
    if (this.doctorUserId > 0) {
      this.doctorService.getDoctorProfileByUserId(this.doctorUserId).subscribe((profile) => {
        if ((profile as any)?.error) {
          this.error.set('Не вдалося завантажити дані психолога.');
          this.doctor.set(null);
          return;
        }
        this.doctor.set(profile as DoctorCardView);
      });
      return;
    }

    this.error.set('Не вдалося визначити психолога.');
  }
}
