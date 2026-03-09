import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonIcon, IonButton, IonModal } from '@ionic/angular/standalone';
import { AuthService, MySessionItem } from '../../services/auth.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, calendarOutline, arrowForwardOutline, closeOutline, walletOutline, copyOutline } from 'ionicons/icons';
import { PaymentFlowService, PaymentState } from '../../services/payment-flow.service';

interface Session {
  id: number;
  type: string;
  status: string;
  status_id?: number;
  status_color?: string;
  source_segment: 'planned' | 'past';
  doctor_name: string;
  doctor_image: string;
  time_range: string;
  session_date?: string;
  icon: string;
  order_id?: number;
  meet_id?: number;
  is_unpaid?: boolean;
  payment_link?: string;
  doctor_id?: number;
  doctor_user_id?: number;
  doctor_hash?: string;
  amount?: number;
}

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, IonButtons, IonIcon, IonButton, IonModal
  ]
})
export class SessionsPage implements OnInit {
  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  selectedSegment: 'planned' | 'past' | 'archive' = 'planned';
  isDoctor = false;
  loading = false;
  actionLoading = false;
  emptyText = 'Порожньо';
  lateCancelConfirmOpen = false;
  lateCancelIsUrgent = false;
  private pendingCancelSessionId = 0;

  constructor(
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private paymentFlowService: PaymentFlowService
  ) {
    addIcons({ calendarOutline, arrowForwardOutline, timeOutline, videocamOutline, closeOutline, walletOutline, copyOutline });
  }


  ngOnInit() {
    this.loadRole();
    this.loadSessions();
  }

  private loadRole() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.isDoctor = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
      },
      error: () => {
        this.isDoctor = false;
      }
    });
  }

  private loadSessions() {
    this.loading = true;
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const raw = resp as any;
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const past = Array.isArray(resp?.past) ? resp.past : [];
        const fallback = [raw?.sessions, raw?.results, raw?.items, raw?.list, raw?.data].find((value: any) => Array.isArray(value));
        const fallbackAll = Array.isArray(fallback) ? (fallback as MySessionItem[]) : [];
        const hasAny = planned.length > 0 || past.length > 0 || fallbackAll.length > 0;

        if (resp?.error && !hasAny) {
          this.loading = false;
          this.sessions = [];
          this.filteredSessions = [];
          this.emptyText = resp.error;
          return;
        }

        const allPlanned = planned.length || past.length ? planned : fallbackAll;
        const allPast = planned.length || past.length ? past : [];
        this.emptyText = resp?.empty_text || 'Порожньо';

        this.sessions = [
          ...allPlanned.map((item, index) => this.mapApiSession(item, 'planned', index)),
          ...allPast.map((item, index) => this.mapApiSession(item, 'past', index + allPlanned.length))
        ];

        const hasPlanned = this.sessions.some((session) => !this.isPastSession(session) && !this.isArchiveSession(session));
        const hasPast = this.sessions.some((session) => this.isPastSession(session) && !this.isArchiveSession(session));
        const hasArchive = this.sessions.some((session) => this.isArchiveSession(session));
        if (this.selectedSegment === 'planned' && !hasPlanned) {
          if (hasPast) {
            this.selectedSegment = 'past';
          } else if (hasArchive) {
            this.selectedSegment = 'archive';
          }
        }
        if (this.selectedSegment === 'past' && !hasPast && hasArchive) {
          this.selectedSegment = 'archive';
        }
        if (this.selectedSegment === 'archive' && !hasArchive && hasPast) {
          this.selectedSegment = 'past';
        }

        this.loading = false;
        this.filterSessions();
      },
      error: () => {
        this.loading = false;
        this.sessions = [];
        this.filteredSessions = [];
        this.emptyText = 'Не вдалося завантажити сесії';
      }
    });
  }

  setSegment(segment: 'planned' | 'past' | 'archive') {
    this.selectedSegment = segment;
    this.filterSessions();
  }

  filterSessions() {
    this.filteredSessions = this.sessions.filter((session) => {
      const archive = this.isArchiveSession(session);
      const past = this.isPastSession(session) && !archive;

      if (this.selectedSegment === 'archive') {
        return archive;
      }
      if (this.selectedSegment === 'past') {
        return past;
      }
      return !past && !archive;
    }).sort((a, b) => this.compareByOrderCreationDesc(a, b));
  }

  showActions(session: Session): boolean {
    return !this.isPastSession(session) && !this.isFailedSession(session) && !this.isArchiveSession(session);
  }

  canRescheduleSession(session: Session): boolean {
    if (!this.showActions(session)) {
      return false;
    }
    const startAt = this.resolveSessionStartAt(session);
    if (!startAt) {
      return false;
    }
    const minLeadMs = 24 * 60 * 60 * 1000;
    return (startAt.getTime() - Date.now()) > minLeadMs;
  }

  isPastSession(session: Session): boolean {
    if (this.isFailedSession(session)) {
      return true;
    }
    if (this.isArchiveSession(session)) {
      return false;
    }
    if (session.source_segment === 'past') {
      return true;
    }

    const date = this.parseSessionDate(session.session_date || '');
    if (!date) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  isFailedSession(session: Session): boolean {
    const text = String(session.status || '').toLowerCase();
    return text.includes('неусп') || text.includes('failed');
  }

  isArchiveSession(session: Session): boolean {
    const text = String(session.status || '').toLowerCase();
    if (text.includes('скас') || text.includes('відмін') || text.includes('cancel') || text.includes('неусп') || text.includes('failed')) {
      return true;
    }
    const statusId = Number(session.status_id ?? 0);
    return statusId === 9 || statusId === 4;
  }

  isPaidSession(session: Session): boolean {
    const text = String(session.status || '').toLowerCase();
    if (text.includes('оплач')) {
      return true;
    }
    return String(session.status_color || '').toLowerCase() === 'success';
  }

  statusColorClass(session: Session): string {
    if (this.isArchiveSession(session)) {
      return 'status-failed';
    }
    if (this.isFailedSession(session)) {
      return 'status-failed';
    }
    if (this.isPastSession(session)) {
      return 'status-past';
    }

    const text = String(session.status || '').toLowerCase();
    if (text.includes('створ')) {
      return 'status-created';
    }
    if (text.includes('заброн')) {
      return 'status-paid';
    }
    if (text.includes('проведен')) {
      return 'status-past';
    }
    if (text.includes('неусп') || text.includes('failed')) {
      return 'status-failed';
    }
    if (text.includes('оплач')) {
      return 'status-paid';
    }

    const color = String(session.status_color || '').toLowerCase();
    if (color === 'danger') {
      return 'status-failed';
    }
    if (color === 'success') {
      return 'status-paid';
    }
    if (color === 'primary') {
      return 'status-past';
    }

    return 'status-past';
  }

  emptyStateText(): string {
    if (this.selectedSegment === 'planned') {
      return this.emptyText || 'У вас ще немає запланованих сесій.';
    }
    if (this.selectedSegment === 'past') {
      return this.emptyText || 'У вас ще немає минулих сесій.';
    }
    return this.emptyText || 'У вас ще немає скасованих сесій.';
  }

  private mapApiSession(item: MySessionItem, segment: 'planned' | 'past', index: number): Session {
    const apiStatus = Number((item as any)?.status_id ?? (item as any)?.status ?? 5);
    const rawStatusText = String((item as any)?.status_text ?? '').trim() || (segment === 'past' ? 'Пройдена' : 'Заброньована');
    const statusColor = String((item as any)?.status_color ?? '').trim().toLowerCase();
    const statusText = this.normalizeSessionStatusLabel(rawStatusText, apiStatus, statusColor, segment);

    return {
      id: this.resolveSessionId(item as any, index),
      type: item.session_type || 'Сесія',
      status: statusText,
      status_id: Number.isFinite(apiStatus) ? apiStatus : undefined,
      status_color: statusColor,
      source_segment: segment,
      doctor_name: item.fullname || 'Психолог',
      doctor_image: this.normalizePhoto(item.photo),
      time_range: `${item.session_date || ''} о ${this.extractStartTime(item.session_time_period)}`,
      session_date: item.session_date || '',
      icon: 'videocam-outline',
      order_id: item.order_id,
      meet_id: item.meet_id,
      is_unpaid: apiStatus === 1,
      payment_link: String((item as any)?.payment_link ?? (item as any)?.checkout_url ?? '').trim(),
      doctor_id: Number((item as any)?.doctor_id ?? 0) || undefined,
      doctor_user_id: Number((item as any)?.doctor_user_id ?? 0) || undefined,
      doctor_hash: String((item as any)?.doctor_hash ?? (item as any)?.hash ?? '').trim() || undefined,
      amount: Number((item as any)?.amount ?? (item as any)?.session_amount ?? 0) || undefined
    };
  }

  private normalizeSessionStatusLabel(
    rawStatusText: string,
    statusId: number,
    statusColor: string,
    segment: 'planned' | 'past'
  ): string {
    const text = String(rawStatusText || '').trim().toLowerCase();

    if (
      statusId === 9 ||
      statusId === 4 ||
      text.includes('скас') ||
      text.includes('відмін') ||
      text.includes('cancel') ||
      text.includes('неусп') ||
      text.includes('failed')
    ) {
      return 'Скасована';
    }

    if (text.includes('створ') || text.includes('очіку') || statusId === 1) {
      return 'Створена';
    }

    if (text.includes('успіш') || text.includes('пройд') || text.includes('минул') || text.includes('past') || segment === 'past') {
      return 'Проведена';
    }

    if (text.includes('оплач') || text.includes('заброн') || statusColor === 'success') {
      return 'Заброньована';
    }

    return 'Заброньована';
  }

  private resolveSessionId(item: any, index: number): number {
    const candidates = [item?.meet_id, item?.order_id, item?.id, item?.session_id, item?.orderId, item?.meetId];
    for (const candidate of candidates) {
      const parsed = Number(candidate ?? 0);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return index + 1;
  }

  private compareByOrderCreationDesc(a: Session, b: Session): number {
    const aKey = this.getOrderCreationKey(a);
    const bKey = this.getOrderCreationKey(b);
    return bKey - aKey;
  }

  private getOrderCreationKey(session: Session): number {
    const orderId = Number(session.order_id ?? 0);
    if (Number.isFinite(orderId) && orderId > 0) {
      return orderId;
    }
    const fallbackId = Number(session.id ?? 0);
    return Number.isFinite(fallbackId) && fallbackId > 0 ? fallbackId : 0;
  }

  private normalizePhoto(photo?: string): string {
    if (!photo) {
      return 'assets/icon/favicon.png';
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    if (photo.startsWith('/')) {
      return `https://mysense.care${photo}`;
    }
    return `https://mysense.care/${photo.replace(/^\/+/, '')}`;
  }

  private parseSessionDate(dateString: string): Date | null {
    const normalized = String(dateString || '').trim();
    if (!normalized) {
      return null;
    }

    const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
      dt.setHours(0, 0, 0, 0);
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  private resolveSessionStartAt(session: Session): Date | null {
    const parsed = this.formatSessionTime(String(session.time_range || ''));
    const datePart = String(parsed.date || session.session_date || '').trim();
    const timePart = String(parsed.time || '').trim();
    if (!datePart || !timePart) {
      return null;
    }

    const date = this.parseFlexibleDate(datePart);
    if (!date) {
      return null;
    }

    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      return null;
    }

    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseFlexibleDate(value: string): Date | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const dotted = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotted) {
      const dt = new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const text = normalized.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/i);
    if (text) {
      const day = Number(text[1]);
      const year = Number(text[3]);
      const month = this.parseMonthName(text[2]);
      if (month >= 0) {
        const dt = new Date(year, month, day);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseMonthName(raw: string): number {
    const monthMap: Record<string, number> = {
      січень: 0, січня: 0,
      лютий: 1, лютого: 1,
      березень: 2, березня: 2,
      квітень: 3, квітня: 3,
      травень: 4, травня: 4,
      червень: 5, червня: 5,
      липень: 6, липня: 6,
      серпень: 7, серпня: 7,
      вересень: 8, вересня: 8,
      жовтень: 9, жовтня: 9,
      листопад: 10, листопада: 10,
      грудень: 11, грудня: 11
    };
    return monthMap[String(raw || '').toLowerCase()] ?? -1;
  }

  private extractStartTime(period?: string): string {
    if (!period) {
      return '';
    }
    return period.split('-')[0].trim();
  }

  formatSessionTime(timeRange: string): { date: string; time: string } {
    const parts = timeRange.split(' о ');
    if (parts.length === 2) {
      return { date: parts[0], time: parts[1] };
    }
    const dateMatch = timeRange.match(/(\d{1,2}\s[А-Яа-я]+\s\d{4})/);
    const timeMatch = timeRange.match(/(\d{1,2}:\d{2})/);

    return {
      date: dateMatch ? dateMatch[0] : timeRange,
      time: timeMatch ? timeMatch[0] : ''
    };
  }

  rescheduleSession(session: Session) {
    if (!this.canRescheduleSession(session)) {
      window.alert('Перенесення доступне лише більш ніж за 24 години до початку сесії.');
      return;
    }

    const sessionId = Number(session.meet_id || session.id || 0);
    if (!sessionId) {
      window.alert('Не вдалося визначити сесію для перенесення.');
      return;
    }

    void this.router.navigate(['/session-change'], {
      queryParams: {
        session_id: sessionId,
        target_name: session.doctor_name,
        target_photo: session.doctor_image,
        session_type: session.type,
        doctor_id: session.doctor_id,
        doctor_user_id: session.doctor_user_id,
        doctor_hash: session.doctor_hash,
        amount: Number(session.amount ?? 0) > 0 ? String(session.amount) : ''
      }
    });
  }

  cancelSession(session: Session) {
    const sessionId = Number(session?.id || 0);
    if (!sessionId) {
      window.alert('Не вдалося визначити сесію для скасування.');
      return;
    }

    this.pendingCancelSessionId = sessionId;
    this.lateCancelIsUrgent = this.shouldShowLateCancelConfirm(session);
    this.lateCancelConfirmOpen = true;
  }

  closeLateCancelConfirm() {
    this.lateCancelConfirmOpen = false;
    this.lateCancelIsUrgent = false;
    this.pendingCancelSessionId = 0;
  }

  continueLateCancel() {
    const sessionId = Number(this.pendingCancelSessionId || 0);
    this.closeLateCancelConfirm();
    if (!sessionId) {
      return;
    }
    this.performCancel(sessionId);
  }

  private shouldShowLateCancelConfirm(session: Session): boolean {
    const startAt = this.resolveSessionStartAt(session);
    if (!startAt) {
      return false;
    }
    const diff = startAt.getTime() - Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return diff > 0 && diff < dayMs;
  }

  private performCancel(sessionId: number) {
    this.actionLoading = true;
    this.authService.deleteSession(sessionId).subscribe({
      next: (resp) => {
        this.actionLoading = false;
        if (resp?.error) {
          window.alert(resp.error);
          return;
        }

        const text = [resp?.success, resp?.return_money_text].filter(Boolean).join('\n');
        window.alert(text || 'Сесію скасовано');
        this.loadSessions();
      },
      error: () => {
        this.actionLoading = false;
        window.alert('Не вдалося скасувати сесію');
      }
    });
  }

  async paySession(session: Session) {
    const paymentLink = session.payment_link || await this.resolvePaymentLink(session);
    if (!paymentLink) {
      window.alert('Посилання на оплату не отримано. Зверніться в підтримку.');
      return;
    }

    session.payment_link = paymentLink;
    const orderId = Number(session.order_id ?? 0);
    const paymentState = await this.paymentFlowService.openPaymentAndCheck(orderId, paymentLink);
    this.navigateToPaymentResult(session, paymentState);
  }

  copyPaymentLink(session: Session) {
    const copyText = (value: string) => {
      if (!navigator.clipboard?.writeText) {
        window.alert('Не вдалося скопіювати посилання.');
        return;
      }
      navigator.clipboard.writeText(value).then(() => {
        window.alert('Посилання на оплату скопійовано');
      }).catch(() => {
        window.alert('Не вдалося скопіювати посилання.');
      });
    };

    if (session.payment_link) {
      copyText(session.payment_link);
      return;
    }

    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const matched = planned.find((item: any) => {
          const orderIdMatch = session.order_id && Number(item?.order_id) === Number(session.order_id);
          const meetIdMatch = session.meet_id && Number(item?.meet_id) === Number(session.meet_id);
          return !!orderIdMatch || !!meetIdMatch;
        });

        const freshLink = String((matched as any)?.payment_link ?? (matched as any)?.checkout_url ?? '').trim();
        if (!freshLink) {
          window.alert('Посилання на оплату не отримано.');
          return;
        }

        session.payment_link = freshLink;
        copyText(freshLink);
      },
      error: () => {
        window.alert('Не вдалося отримати посилання для копіювання.');
      }
    });
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    void this.router.navigate(['/tabs/home']);
  }

  private async resolvePaymentLink(session: Session): Promise<string> {
    return new Promise((resolve) => {
      this.authService.getMySessions().subscribe({
        next: (resp) => {
          const planned = Array.isArray(resp?.planned) ? resp.planned : [];
          const matched = planned.find((item: any) => {
            const orderIdMatch = session.order_id && Number(item?.order_id) === Number(session.order_id);
            const meetIdMatch = session.meet_id && Number(item?.meet_id) === Number(session.meet_id);
            return !!orderIdMatch || !!meetIdMatch;
          });

          const freshLink = String((matched as any)?.payment_link ?? (matched as any)?.checkout_url ?? '').trim();
          resolve(freshLink);
        },
        error: () => resolve('')
      });
    });
  }

  private navigateToPaymentResult(session: Session, status: PaymentState): void {
    const parsed = this.formatSessionTime(session.time_range || '');
    void this.router.navigate(['/tabs/payment-result'], {
      queryParams: {
        status,
        order_id: Number(session.order_id ?? 0) > 0 ? String(session.order_id) : '',
        doctor_fullname: session.doctor_name || '',
        date: parsed.date || session.session_date || '',
        time: parsed.time || '',
        payment_date: this.formatDateTimeForResult(new Date()),
        amount: ''
      }
    });
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
}
