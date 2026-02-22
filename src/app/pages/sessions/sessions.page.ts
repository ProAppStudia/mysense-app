import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton } from '@ionic/angular/standalone';
import { AuthService, MySessionItem } from '../../services/auth.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, calendarOutline, arrowForwardOutline, closeOutline, walletOutline, copyOutline } from 'ionicons/icons';

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
}

@Component({
  selector: 'app-sessions',
  templateUrl: './sessions.page.html',
  styleUrls: ['./sessions.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, IonButtons, IonBackButton, IonIcon, IonButton
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

  constructor(private authService: AuthService, private router: Router) {
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
    });
  }

  showActions(session: Session): boolean {
    return !this.isPastSession(session) && !this.isFailedSession(session) && !this.isArchiveSession(session);
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
    if (text.includes('скас') || text.includes('відмін') || text.includes('cancel')) {
      return true;
    }
    return Number(session.status_id) === 9;
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
    return this.emptyText || 'У вас ще немає сесій в архіві.';
  }

  private mapApiSession(item: MySessionItem, segment: 'planned' | 'past', index: number): Session {
    const apiStatus = Number((item as any)?.status_id ?? (item as any)?.status ?? 5);
    const statusText = String((item as any)?.status_text ?? '').trim() || (segment === 'past' ? 'Пройдена' : 'Заброньована');
    const statusColor = String((item as any)?.status_color ?? '').trim().toLowerCase();

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
      payment_link: String((item as any)?.payment_link ?? (item as any)?.checkout_url ?? '').trim()
    };
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
        session_type: session.type
      }
    });
  }

  cancelSession(sessionId: number) {
    if (!sessionId) {
      window.alert('Не вдалося визначити сесію для скасування.');
      return;
    }

    const ok = window.confirm('Скасувати цю сесію?');
    if (!ok) {
      return;
    }

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

  paySession(session: Session) {
    if (session.payment_link) {
      window.open(session.payment_link, '_blank');
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
        if (freshLink) {
          session.payment_link = freshLink;
          window.open(freshLink, '_blank');
          return;
        }

        window.alert('Посилання на оплату не отримано. Зверніться в підтримку.');
      },
      error: () => {
        window.alert('Не вдалося отримати посилання для оплати.');
      }
    });
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
}
