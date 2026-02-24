import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

type PaymentResultStatus = 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.page.html',
  styleUrls: ['./payment-result.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule]
})
export class PaymentResultPage {
  status: PaymentResultStatus = 'unknown';
  orderId = '';
  doctorFullname = '';
  sessionDate = '';
  sessionTime = '';
  paymentDate = '';
  amount = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      const rawStatus = String(params.get('status') || '').trim().toLowerCase();
      this.status = this.normalizeStatus(rawStatus);
      this.orderId = String(params.get('order_id') || '').trim();
      this.doctorFullname = String(params.get('doctor_fullname') || '').trim();
      this.sessionDate = String(params.get('date') || '').trim();
      this.sessionTime = String(params.get('time') || '').trim();
      this.paymentDate = String(params.get('payment_date') || '').trim();
      this.amount = String(params.get('amount') || '').trim();
    });
  }

  get isError(): boolean {
    return this.status === 'failed' || this.status === 'cancelled';
  }

  get statusTitle(): string {
    if (this.status === 'paid') {
      return 'Ваш платіж пройшов успішно';
    }
    if (this.status === 'pending') {
      return 'Оплата в процесі обробки';
    }
    if (this.status === 'failed') {
      return 'Під час оплати виникла помилка';
    }
    if (this.status === 'cancelled') {
      return 'Оплату скасовано';
    }
    return 'Статус оплати уточнюється';
  }

  get statusText(): string {
    if (this.status === 'pending') {
      return 'Щойно ми отримаємо підтвердження оплати, сесія зʼявиться у ваших сесіях.';
    }
    if (this.status === 'failed') {
      return 'Спробуйте створити нове замовлення або зверніться в службу підтримки.';
    }
    if (this.status === 'cancelled') {
      return 'Ви можете повернутися та повторити оплату в будь-який час.';
    }
    if (this.status === 'unknown') {
      return 'Оновіть сторінку пізніше або перевірте статус у розділі "Мої сесії".';
    }
    return '';
  }

  goSessions(): void {
    this.router.navigate(['/sessions']);
  }

  goHome(): void {
    this.router.navigate(['/tabs/home']);
  }

  private normalizeStatus(value: string): PaymentResultStatus {
    if (value === 'paid' || value === 'pending' || value === 'failed' || value === 'cancelled') {
      return value;
    }
    return 'unknown';
  }
}
