import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButtons, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-session-change',
  templateUrl: './session-change.page.html',
  styleUrls: ['./session-change.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonIcon, CommonModule, FormsModule]
})
export class SessionChangePage implements OnInit {
  sessionId = 0;
  targetName = '';
  targetPhoto = '';
  sessionType = '';

  loading = signal(false);
  error = signal('');
  success = signal('');

  form = {
    date: '',
    time: 10
  };

  readonly reserveTimeOptions = Array.from({ length: 17 }, (_, i) => i + 7);

  constructor(
    private route: ActivatedRoute,
    private location: Location,
    private router: Router,
    private authService: AuthService
  ) {
    addIcons({ arrowBackOutline });
  }

  ngOnInit(): void {
    this.form.date = this.getDefaultDate();

    this.route.queryParamMap.subscribe((params) => {
      this.sessionId = Number(params.get('session_id') || 0);
      this.targetName = String(params.get('target_name') || '').trim();
      this.targetPhoto = String(params.get('target_photo') || '').trim();
      this.sessionType = String(params.get('session_type') || '').trim();

      if (!this.sessionId) {
        this.error.set('Не вдалося визначити сесію для перенесення.');
      }
    });
  }

  goBack() {
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
          void this.router.navigate(['/sessions']);
        }, 700);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Не вдалося перенести сесію.');
      }
    });
  }

  private getDefaultDate(): string {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
