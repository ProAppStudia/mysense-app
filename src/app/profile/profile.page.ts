import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox } from '@ionic/angular/standalone';
import { AuthService, UserProfile, UpdateProfilePayload } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Subscription, interval } from 'rxjs';
import { Router, NavigationExtras } from '@angular/router';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { addIcons } from 'ionicons';
import {
  personCircleOutline, createOutline, calendarOutline, addCircleOutline, bookOutline, libraryOutline,
  informationCircleOutline, helpCircleOutline, notificationsOutline, headsetOutline, documentTextOutline,
  logOutOutline, warningOutline, closeOutline, eyeOffOutline, eyeOutline, personOutline
} from 'ionicons/icons';

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

  userSessions: any[] = [];
  doctors: DoctorCardView[] = [];
  userProfile = signal<UserProfile | null>(null);
  profileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/)]),
    password: new FormControl('', [Validators.minLength(6)]),
    confirm: new FormControl(''),
  });
  profileLoading = signal(false);
  profileErrorMsg = signal<string | null>(null);
  profileSuccessMsg = signal<string | null>(null);
  isEditing = signal(false);

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router
  ) {
    addIcons({
      personCircleOutline, createOutline, calendarOutline, addCircleOutline, bookOutline, libraryOutline,
      informationCircleOutline, helpCircleOutline, notificationsOutline, headsetOutline, documentTextOutline,
      logOutOutline, warningOutline, closeOutline, eyeOffOutline, eyeOutline, personOutline
    });
  }

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    if (this.isLoggedIn()) {
      this.loadProfile();
      this.doctorService.getPsychologists().subscribe(psychologists => {
        this.doctors = psychologists;
        this.userSessions = [
          {
            id: 1,
            type: 'Індивідуальна сесія',
            status: 'Заброньована',
            doctor_name: this.doctors[0].fullName,
            doctor_image: this.doctors[0].avatarUrl,
            time_range: '20 вересня о 14:00',
            icon: 'videocam-outline'
          },
          {
            id: 2,
            type: 'Сімейна сесія',
            status: 'Оплачена',
            doctor_name: this.doctors[1].fullName,
            doctor_image: this.doctors[1].avatarUrl,
            time_range: '22 вересня о 18:00',
            icon: 'videocam-outline'
          }
        ];
      });
    }
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

  viewAllSessions() {
    const navigationExtras: NavigationExtras = {
      state: {
        sessions: this.userSessions,
        doctors: this.doctors
      }
    };
    this.router.navigate(['/sessions'], navigationExtras);
  }

  loadProfile() {
    this.profileLoading.set(true);
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile.success) {
          this.userProfile.set(profile);
          this.profileForm.patchValue({
            name: profile.firstname,
            surname: profile.lastname,
            email: profile.email,
            phone: profile.phone
          });
        } else {
          this.profileErrorMsg.set(profile.error || 'Failed to load profile.');
        }
        this.profileLoading.set(false);
      },
      error: (err) => {
        this.profileErrorMsg.set('An error occurred while loading the profile.');
        this.profileLoading.set(false);
        console.error('Load profile error:', err);
      }
    });
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileLoading.set(true);
    this.profileErrorMsg.set(null);
    this.profileSuccessMsg.set(null);

    const { name, surname, email, phone, password, confirm } = this.profileForm.value;

    const payload: UpdateProfilePayload = {
      name: name || '',
      surname: surname || '',
      email: email || '',
      phone: phone || '',
    };

    if (password && confirm) {
      if (password !== confirm) {
        this.profileErrorMsg.set('Passwords do not match.');
        this.profileLoading.set(false);
        return;
      }
      payload.password = password;
      payload.confirm = confirm;
    }

    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        this.profileLoading.set(false);
        if (response.success) {
          this.profileSuccessMsg.set(response.success);
          this.loadProfile(); // Reload profile to get updated data
        } else {
          this.profileErrorMsg.set(response.error || 'Failed to update profile.');
        }
      },
      error: (err) => {
        this.profileLoading.set(false);
        this.profileErrorMsg.set('An unexpected error occurred. Please try again later.');
        console.error('Update profile error:', err);
      }
    });
  }

  toggleEditMode(save: boolean = false) {
    if (this.isEditing() && save) {
      this.onSubmitProfile();
    } else if (this.isEditing() && !save) {
      // Reset form to original values if canceling
      const profile = this.userProfile();
      if (profile) {
        this.profileForm.patchValue({
          name: profile.firstname,
          surname: profile.lastname,
          email: profile.email,
          phone: profile.phone,
          password: '',
          confirm: ''
        });
      }
    }
    this.isEditing.update(value => !value);
  }

  goToHowToUse() {
    this.router.navigate(['/how-to-use']);
  }
}
