import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel,
    IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox,
    CommonModule, FormsModule, ReactiveFormsModule
  ]
})
export class ProfilePage implements OnInit, OnDestroy {
  // Login Modal States
  loginOpen = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  isLoggedIn = signal(false);
  passwordVisible = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  // Register Modal States
  registerOpen = signal(false);
  registerLoading = signal(false);
  registerErrorMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  registerStep = signal<'form' | 'code'>('form');
  countdown = signal(0);
  canResend = signal(false);
  registerPasswordVisible = signal(false);
  private countdownSubscription: Subscription | null = null;

  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl(false, [Validators.requiredTrue]),
    code: new FormControl('', []) // Code field initially not required
  });

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  // Login Modal Methods
  openLoginModal() {
    this.loginOpen.set(true);
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
  }

  closeLoginModal() {
    this.loginOpen.set(false);
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
  }

  onSubmitLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.value;

    if (email && password) {
      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.isLoggedIn.set(true);
            this.closeLoginModal();
          } else {
            this.errorMsg.set(response.message || 'Login failed. Please try again.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set('An unexpected error occurred. Please try again later.');
          console.error('Login error:', err);
        }
      });
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn.set(false);
    console.log('User logged out');
  }

  togglePasswordVisibility() {
    this.passwordVisible.update(value => !value);
  }

  // Register Modal Methods
  openRegisterModal() {
    this.registerOpen.set(true);
    this.resetRegisterModalState();
  }

  closeRegisterModal() {
    this.registerOpen.set(false);
    this.resetRegisterModalState();
  }

  private resetRegisterModalState() {
    this.registerLoading.set(false);
    this.registerErrorMsg.set(null);
    this.infoMsg.set(null);
    this.registerStep.set('form');
    this.registerForm.reset();
    this.registerForm.get('confirm')?.setValue(false); // Ensure checkbox is reset
    this.registerForm.get('code')?.clearValidators(); // Clear code validators
    this.registerForm.get('code')?.updateValueAndValidity();
    this.stopCountdown();
    this.countdown.set(0);
    this.canResend.set(false);
    this.registerPasswordVisible.set(false);
  }

  onSubmitRegister() {
    if (this.registerStep() === 'form') {
      // Validate form fields for the first step
      this.registerForm.get('code')?.clearValidators(); // Ensure code is not validated on first step
      this.registerForm.get('code')?.updateValueAndValidity();

      if (this.registerForm.get('name')?.invalid ||
          this.registerForm.get('surname')?.invalid ||
          this.registerForm.get('email')?.invalid ||
          this.registerForm.get('phone')?.invalid ||
          this.registerForm.get('password')?.invalid ||
          this.registerForm.get('confirm')?.invalid) {
        this.registerForm.markAllAsTouched();
        return;
      }
    } else if (this.registerStep() === 'code') {
      // Validate code field for the second step
      this.registerForm.get('code')?.setValidators([Validators.required]);
      this.registerForm.get('code')?.updateValueAndValidity();

      if (this.registerForm.get('code')?.invalid) {
        this.registerForm.get('code')?.markAsTouched();
        return;
      }
    }

    this.registerLoading.set(true);
    this.registerErrorMsg.set(null);

    const { name, surname, email, phone, password, confirm, code } = this.registerForm.value;

    // Ensure confirm is always a boolean
    const isConfirmed = confirm ?? false;

    if (name && surname && email && phone && password && isConfirmed !== undefined) {
      const payload = {
        name,
        surname,
        email,
        phone,
        password,
        confirm: isConfirmed,
        code: this.registerStep() === 'code' ? code || '' : undefined // Only send code if on 'code' step
      };

      this.authService.register(payload).subscribe({
        next: (response) => {
          this.registerLoading.set(false);
          if (response.stage === 'awaiting_code') {
            this.registerStep.set('code');
            this.infoMsg.set(response.message);
            this.startCountdown(60);
            this.canResend.set(false);
            this.registerForm.get('code')?.setValue(''); // Clear code field for new input
          } else if (response.stage === 'done') {
            this.isLoggedIn.set(true);
            this.closeRegisterModal();
          } else if (response.stage === 'error') {
            this.registerErrorMsg.set(response.message);
            if (this.registerStep() === 'code') {
              this.canResend.set(true); // Allow resend on code error
            }
          }
        },
        error: (err) => {
          this.registerLoading.set(false);
          this.registerErrorMsg.set('An unexpected error occurred during registration. Please try again later.');
          console.error('Register error:', err);
          if (this.registerStep() === 'code') {
            this.canResend.set(true); // Allow resend on network error
          }
        }
      });
    }
  }

  resendCode() {
    this.registerForm.get('code')?.clearValidators(); // Clear code validators for resend
    this.registerForm.get('code')?.updateValueAndValidity();
    this.registerForm.get('code')?.setValue(''); // Clear code field
    this.canResend.set(false);
    this.registerPasswordVisible.set(false);
  }

  startCountdown(seconds: number) {
    this.stopCountdown(); // Clear any existing timer
    this.countdown.set(seconds);
    this.canResend.set(false);

    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown.update(value => value - 1);
      if (this.countdown() <= 0) {
        this.stopCountdown();
        this.canResend.set(true);
        this.infoMsg.set('Перевірте телефон та спробуйте ще раз');
        this.registerForm.get('code')?.setValue(''); // Clear code field after countdown
      }
    });
  }

  stopCountdown() {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
      this.countdownSubscription = null;
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${this.pad(minutes)}:${this.pad(remainingSeconds)}`;
  }

  private pad(num: number): string {
    return num < 10 ? '0' + num : '' + num;
  }

  toggleRegisterPasswordVisibility() {
    this.registerPasswordVisible.update(value => !value);
  }
}
