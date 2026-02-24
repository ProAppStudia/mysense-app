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

    if (!orderId) {
      return 'pending';
    }

    return this.pollOrderState(orderId, 10, 3000);
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

  private async pollOrderState(orderId: number, maxAttempts: number, intervalMs: number): Promise<PaymentState> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const state = await this.getOrderState(orderId);
      if (state === 'paid' || state === 'failed' || state === 'cancelled') {
        return state;
      }

      if (attempt < maxAttempts - 1) {
        await this.sleep(intervalMs);
      }
    }

    return 'pending';
  }

  private async getOrderState(orderId: number): Promise<PaymentState> {
    try {
      const response = await firstValueFrom(this.authService.getMySessions());
      const item = this.findOrderById(response, orderId);
      if (!item) {
        return 'unknown';
      }
      return this.detectState(item);
    } catch {
      return 'unknown';
    }
  }

  private findOrderById(response: any, orderId: number): MySessionItem | null {
    const planned = Array.isArray(response?.planned) ? response.planned : [];
    const past = Array.isArray(response?.past) ? response.past : [];
    const fallback = [response?.sessions, response?.results, response?.items, response?.list, response?.data]
      .find((value) => Array.isArray(value));
    const combined = [...planned, ...past, ...(Array.isArray(fallback) ? fallback : [])] as MySessionItem[];

    return combined.find((item: any) => Number(item?.order_id ?? 0) === orderId) ?? null;
  }

  private detectState(item: MySessionItem): PaymentState {
    const statusId = Number((item as any)?.status_id ?? (item as any)?.status ?? 0);
    const statusText = String((item as any)?.status_text ?? (item as any)?.status ?? '').toLowerCase();
    const color = String((item as any)?.status_color ?? '').toLowerCase();

    if (statusId === 5 || color === 'success' || statusText.includes('оплач')) {
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
}
