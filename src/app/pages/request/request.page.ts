import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { ChatService } from '../../services/chat.service';
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { AuthService } from '../../services/auth.service';

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
    private authService: AuthService
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
      const backendError = String(result?.response?.error ?? result?.error ?? '').trim();
      this.error.set(backendError || 'Не вдалося створити замовлення.');
      return;
    }

    const paymentLink = String(result?.response?.payment_link ?? '').trim();
    if (paymentLink) {
      this.clearPendingOrder();
      window.open(paymentLink, '_blank');
      return;
    }

    this.success.set(String(result?.response?.success ?? 'Замовлення створено.').trim());
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
