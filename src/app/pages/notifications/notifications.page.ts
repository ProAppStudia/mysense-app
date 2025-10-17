import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton, IonItem, IonLabel, IonToggle, IonText, IonSpinner } from '@ionic/angular/standalone';
import { PushNotifications } from '@capacitor/push-notifications';
import { addIcons } from 'ionicons';
import { notificationsOutline } from 'ionicons/icons';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule,
    IonButtons, IonBackButton, IonItem, IonLabel, IonToggle, IonText, IonSpinner
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class NotificationsPage implements OnInit {
  notificationsEnabled: boolean = false;
  permissionStatus: string = 'unknown'; // 'granted', 'denied', 'prompt', 'unknown'
  isLoading: boolean = true;
  error: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {
    addIcons({ notificationsOutline });
  }

  async ngOnInit() {
    await this.checkNotificationStatus();
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  async checkNotificationStatus() {
    try {
      const status = await PushNotifications.checkPermissions();
      this.permissionStatus = status.receive;
      this.notificationsEnabled = status.receive === 'granted';
    } catch (e) {
      this.error = 'Error checking notification permissions.';
      console.error('Error checking notification permissions:', e);
    }
  }

  async toggleNotifications() {
    if (this.notificationsEnabled) {
      // If notifications are currently enabled, and user wants to disable,
      // we can't directly disable via Capacitor. User must do it in OS settings.
      // For now, we'll just update the UI state.
      this.notificationsEnabled = false;
      this.permissionStatus = 'denied'; // Reflect UI change
      // Optionally, guide user to OS settings
      alert('To fully disable notifications, please go to your device settings.');
    } else {
      // Request permission
      try {
        const result = await PushNotifications.requestPermissions();
        this.permissionStatus = result.receive;
        this.notificationsEnabled = result.receive === 'granted';
      } catch (e) {
        this.error = 'Error requesting notification permissions.';
        console.error('Error requesting notification permissions:', e);
      }
    }
    this.cdr.detectChanges();
  }
}
