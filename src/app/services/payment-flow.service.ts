import { Injectable } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { firstValueFrom } from 'rxjs';
import { AuthService, MySessionItem } from './auth.service';

export type PaymentState = 'paid' | 'pending' | 'failed' | 'cancelled' | 'unknown';

@Injectable({
  providedIn: 'root'
})
export class PaymentFlowService {
  constructor(private authService: AuthService) {}

  async openPaymentAndCheck(orderId: number, paymentUrl: string): Promise<PaymentState> {
    const opened = await this.openPaymentBrowser(paymentUrl);
    if (!opened) {
      return 'unknown';
    }

    const resolvedOrderId = orderId > 0 ? orderId : this.extractOrderIdFromPaymentUrl(paymentUrl);
    return this.waitForFinalState(resolvedOrderId, paymentUrl, 20, 3000);
  }

  async waitForFinalState(
    orderId: number,
    paymentUrl: string,
    maxAttempts: number,
    intervalMs: number
  ): Promise<PaymentState> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const state = await this.getOrderState(orderId, paymentUrl);
      if (state === 'paid' || state === 'failed' || state === 'cancelled') {
        return state;
      }

      if (attempt < maxAttempts - 1) {
        await this.sleep(intervalMs);
      }
    }

    return 'pending';
  }

  private async openPaymentBrowser(url: string): Promise<boolean> {
    if (!url) {
      return false;
    }

    try {
      await this.openCapacitorBrowser(url);
      return true;
    } catch {
      return this.openWebWindow(url);
    }
  }

  private async openCapacitorBrowser(url: string): Promise<void> {
    await Browser.removeAllListeners();

    let finished = false;
    await Browser.addListener('browserFinished', () => {
      finished = true;
    });

    await Browser.open({ url, presentationStyle: 'fullscreen' });

    while (!finished) {
      await this.sleep(250);
    }

    await Browser.removeAllListeners();
  }

  private async openWebWindow(url: string): Promise<boolean> {
    const popup = window.open(url, '_blank');
    if (!popup) {
      return false;
    }

    while (!popup.closed) {
      await this.sleep(300);
    }

    return true;
  }

  private async getOrderState(orderId: number, paymentUrl?: string): Promise<PaymentState> {
    try {
      const response = await firstValueFrom(this.authService.getMySessions());
      const item = this.findOrder(response, orderId, paymentUrl);
      if (!item) {
        return 'unknown';
      }
      return this.detectState(item);
    } catch {
      return 'unknown';
    }
  }

  private findOrder(response: any, orderId: number, paymentUrl?: string): MySessionItem | null {
    const planned = Array.isArray(response?.planned) ? response.planned : [];
    const past = Array.isArray(response?.past) ? response.past : [];
    const fallback = [response?.sessions, response?.results, response?.items, response?.list, response?.data]
      .find((value) => Array.isArray(value));
    const combined = [...planned, ...past, ...(Array.isArray(fallback) ? fallback : [])] as MySessionItem[];

    if (orderId > 0) {
      const byOrderId = combined.find((item: any) => Number(item?.order_id ?? 0) === orderId);
      if (byOrderId) {
        return byOrderId;
      }
    }

    const normalizedPaymentUrl = String(paymentUrl || '').trim();
    if (normalizedPaymentUrl) {
      const byPaymentUrl = combined.find((item: any) => {
        const link = String(item?.payment_link ?? (item as any)?.checkout_url ?? '').trim();
        return !!link && link === normalizedPaymentUrl;
      });
      if (byPaymentUrl) {
        return byPaymentUrl;
      }
    }

    return null;
  }

  private detectState(item: MySessionItem): PaymentState {
    const statusId = Number((item as any)?.status_id ?? (item as any)?.status ?? 0);
    const statusText = String((item as any)?.status_text ?? (item as any)?.status ?? '').toLowerCase();
    const color = String((item as any)?.status_color ?? '').toLowerCase();

    if (statusId === 5 || color === 'success' || statusText.includes('оплач') || statusText.includes('успіш')) {
      return 'paid';
    }
    if (statusId === 4 || statusText.includes('failed') || statusText.includes('помил')) {
      return 'failed';
    }
    if (statusId === 9 || statusText.includes('скас') || statusText.includes('cancel') || statusText.includes('відмін')) {
      return 'cancelled';
    }
    if (statusId === 1 || statusText.includes('оброб') || statusText.includes('pending')) {
      return 'pending';
    }

    return 'unknown';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractOrderIdFromPaymentUrl(url: string): number {
    const raw = String(url || '').trim();
    if (!raw) {
      return 0;
    }

    try {
      const parsed = new URL(raw);
      const directCandidates = ['order_id', 'orderId', 'invoice_id', 'invoiceId', 'payment_id', 'paymentId'];
      for (const key of directCandidates) {
        const value = parsed.searchParams.get(key);
        const parsedValue = Number(value ?? 0);
        if (Number.isFinite(parsedValue) && parsedValue > 0) {
          return parsedValue;
        }
      }
    } catch {
      return 0;
    }

    return 0;
  }
}
