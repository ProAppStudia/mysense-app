import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonIcon, IonButton, IonSegment, IonSegmentButton, IonLabel } from '@ionic/angular/standalone';
import { AuthService, MySessionItem } from '../../services/auth.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, calendarOutline, arrowForwardOutline, closeOutline, walletOutline } from 'ionicons/icons';

interface Session {
  id: number;
  type: string;
  status: string;
  status_id?: number;
  status_color?: string;
  segment: 'planned' | 'past';
  doctor_name: string;
  doctor_image: string;
  time_range: string;
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
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonBackButton, IonIcon, IonButton,
    IonSegment, IonSegmentButton, IonLabel // Added these imports
  ]
})
export class SessionsPage implements OnInit {
  sessions: Session[] = [];
  filteredSessions: Session[] = [];
  selectedSegment: 'planned' | 'past' = 'planned';
  loading = false;
  actionLoading = false;
  emptyText = 'Порожньо';

  constructor(private authService: AuthService, private router: Router) {
    addIcons({calendarOutline,arrowForwardOutline,timeOutline,videocamOutline,closeOutline,walletOutline});
  }

  ngOnInit() {
    this.loadSessions();
  }

  private loadSessions() {
    this.loading = true;
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const raw = resp as any;
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const past = Array.isArray(resp?.past) ? resp.past : [];
        const fallback = [raw?.sessions, raw?.results, raw?.items, raw?.list, raw?.data]
          .find((value) => Array.isArray(value));
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
          ...allPlanned.map((item) => this.mapApiSession(item, 'planned')),
          ...allPast.map((item) => this.mapApiSession(item, 'past'))
        ];
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

  segmentChanged() {
    this.filterSessions();
  }

  filterSessions() {
    this.filteredSessions = this.sessions;
  }

  statusColorClass(session: Session): string {
    const color = String(session.status_color || '').toLowerCase();
    if (color === 'success' || color === 'danger' || color === 'primary') {
      return `status-${color}`;
    }
    return 'status-neutral';
  }

  private mapApiSession(item: MySessionItem, segment: 'planned' | 'past'): Session {
    const apiStatus = Number((item as any)?.status_id ?? (item as any)?.status ?? 5);
    const isUnpaid = segment === 'planned' && apiStatus === 1;
    const fallbackStatus = segment === 'planned'
      ? (isUnpaid ? 'Очікується' : 'Заброньована')
      : 'Пройдена';
    const statusText = String((item as any)?.status_text ?? '').trim() || fallbackStatus;
    const statusColor = String((item as any)?.status_color ?? '').trim().toLowerCase();

    return {
      id: item.meet_id || item.order_id || 0,
      type: item.session_type || 'Сесія',
      status: statusText,
      status_id: Number.isFinite(apiStatus) ? apiStatus : undefined,
      status_color: statusColor,
      segment,
      doctor_name: item.fullname || 'Психолог',
      doctor_image: this.normalizePhoto(item.photo),
      time_range: `${item.session_date || ''} о ${this.extractStartTime(item.session_time_period)}`,
      icon: 'videocam-outline',
      order_id: item.order_id,
      meet_id: item.meet_id,
      is_unpaid: isUnpaid,
      payment_link: String((item as any)?.payment_link ?? (item as any)?.checkout_url ?? '').trim()
    };
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
    return photo;
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
}
