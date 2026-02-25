import { Component, NgZone, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import type { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnDestroy {
  isPreloaderHiding = false;
  isPreloaderHidden = false;

  private hideTimer: ReturnType<typeof setTimeout>;
  private removeTimer: ReturnType<typeof setTimeout>;
  private appUrlOpenListener?: Promise<PluginListenerHandle>;

  constructor(
    private router: Router,
    private zone: NgZone
  ) {
    this.hideTimer = setTimeout(() => {
      this.isPreloaderHiding = true;
    }, 2200);

    this.removeTimer = setTimeout(() => {
      this.isPreloaderHidden = true;
    }, 2700);

    this.bindDeepLinks();
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.removeTimer);
    void this.unbindDeepLinks();
  }

  private bindDeepLinks(): void {
    this.appUrlOpenListener = App.addListener('appUrlOpen', (event) => {
      const link = this.parsePaymentDeepLink(event?.url ?? '');
      if (!link) {
        return;
      }

      this.zone.run(() => {
        void this.router.navigate(['/tabs/payment-result'], {
          queryParams: link
        });
      });

      // If we came back from an in-app payment page, close the browser overlay.
      void Browser.close().catch(() => undefined);
    });
  }

  private async unbindDeepLinks(): Promise<void> {
    if (!this.appUrlOpenListener) {
      return;
    }

    const listener = await this.appUrlOpenListener;
    await listener.remove();
    this.appUrlOpenListener = undefined;
  }

  private parsePaymentDeepLink(url: string): Record<string, string> | null {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);
      const host = String(parsed.host || '').toLowerCase();
      const path = String(parsed.pathname || '').toLowerCase();
      const isPaymentResult = host === 'payment-result' || path.includes('payment-result');
      if (!isPaymentResult) {
        return null;
      }

      const statusRaw = String(parsed.searchParams.get('status') || '').trim().toLowerCase();
      const status = this.normalizePaymentStatus(statusRaw);

      return {
        status,
        order_id: String(parsed.searchParams.get('order_id') || '').trim(),
        doctor_fullname: String(parsed.searchParams.get('doctor_fullname') || '').trim(),
        date: String(parsed.searchParams.get('date') || '').trim(),
        time: String(parsed.searchParams.get('time') || '').trim(),
        payment_date: String(parsed.searchParams.get('payment_date') || '').trim(),
        amount: String(parsed.searchParams.get('amount') || '').trim()
      };
    } catch {
      return null;
    }
  }

  private normalizePaymentStatus(status: string): string {
    if (status === 'paid' || status === 'pending' || status === 'failed' || status === 'cancelled') {
      return status;
    }
    if (status === 'success') {
      return 'paid';
    }
    if (status === 'rejected' || status === 'error') {
      return 'failed';
    }
    return 'unknown';
  }
}
