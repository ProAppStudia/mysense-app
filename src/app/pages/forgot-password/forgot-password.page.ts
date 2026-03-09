import { Component, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonContent, IonSpinner]
})
export class ForgotPasswordPage {
  loading = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
  });

  constructor(private authService: AuthService, private location: Location) {}

  goBack() {
    this.location.back();
  }

  submit() {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    const email = String(this.form.get('email')?.value ?? '').trim();

    this.authService.restorePassword(email).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response?.error) {
          this.errorMsg.set(String(response.error));
          return;
        }

        const successText =
          typeof response?.success === 'string'
            ? response.success
            : String(response?.message ?? 'Інструкції для відновлення пароля надіслані на пошту.');

        this.successMsg.set(successText);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Не вдалося виконати запит. Спробуйте пізніше.');
      }
    });
  }
}
