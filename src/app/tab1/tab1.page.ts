import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  IonContent,
  IonButton,
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonModal,
  IonInput,
  IonSpinner,
  IonText,
  IonButtons,
  IonCheckbox,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, NavigationExtras } from '@angular/router';
import { register } from 'swiper/element/bundle';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  videocamOutline,
  personOutline,
  addCircleOutline,
  calendarOutline,
  chatbubblesOutline,
  searchOutline,
  peopleOutline,
  bookOutline,
  checkboxOutline,
  documentTextOutline,
  closeOutline,
  eyeOffOutline,
  eyeOutline,
  addOutline,
  arrowForwardOutline,
  checkmarkDoneOutline,
  heart,
  checkmarkCircleOutline,
  walletOutline,
} from 'ionicons/icons';
import { Subscription, interval } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

register();
addIcons({
  timeOutline,
  videocamOutline,
  personOutline,
  addCircleOutline,
  calendarOutline,
  chatbubblesOutline,
  searchOutline,
  peopleOutline,
  bookOutline,
  checkboxOutline,
  documentTextOutline,
  closeOutline,
  eyeOffOutline,
  eyeOutline,
  addOutline,
  arrowForwardOutline,
  checkmarkDoneOutline,
  heart,
  checkmarkCircleOutline,
  walletOutline,
});

interface Doctor {
  img: string;
  firstname: string;
  lastname: string;
  practice_years_text: string;
}

interface Session {
  id: number;
  type: 'Індивідуальна сесія' | 'Сімейна сесія' | 'Дитяча сесія';
  status: string;
  doctor_name: string;
  doctor_image: string;
  time_range: string;
  icon: string;
}

interface HomepageData {
  section_1: {
    heading: string;
    sub_heading: string;
    button_test_text: string;
    text_choise_psyhologist: string;
  };
  doctors: Doctor[];
  section_3: {
    heading_acquaintance: string;
    text_acquaintance: string;
  };
  section_8: {
    heading: string;
    sub_heading: string;
    cities: { name: string }[];
    img: string;
  };
  section_9: {
    heading: string;
    reviews: {
      text: string;
      date: string;
      user_name: string;
      showFullText?: boolean;
      truncatedText?: string;
    }[];
  };
  section_10: {
    heading: string;
    items: { heading: string; content: string }[];
    text_button: string;
  };
  section_11: {
    heading: string;
    articles: {
      id: number;
      slug: string;
      img: string;
      title: string;
      short_description: string;
      date: string;
    }[];
  };
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonButton, CommonModule, IonAccordionGroup, IonAccordion, IonItem, IonLabel, RouterLink,
    FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox,
    TestsBlockComponent
    IonContent,
    IonButton,
    CommonModule,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonModal,
    IonInput,
    IonSpinner,
    IonText,
    IonButtons,
    IonCheckbox,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('articlesSwiper') articlesSwiper?: ElementRef;
  @ViewChild('reviewsSwiper') reviewsSwiper?: ElementRef;

  homepageData: HomepageData | null = null;
  readonly TRUNCATE_LENGTH = 100;

  // auth
  isLoggedIn = signal(false);
  private authSub?: Subscription;

  // sessions (плейсхолдер)
  userSessions: Session[] = [];

  // Login modal state
  loginOpen = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  passwordVisible = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  // Register modal state
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
    phone: new FormControl('', [
      Validators.required,
      Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/),
    ]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl(false, [Validators.requiredTrue]),
    code: new FormControl('', []),
  });

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  // ---------- LIFECYCLE ----------
  ngOnInit() {
    // 1) стартові дані
    this.getHomepageData();
    this.isLoggedIn.set(this.authService.isAuthenticated());

    // 2) реагуємо на логін/логаут (без перезавантаження додатку)
    this.authSub = this.authService.authState$.subscribe((state) => {
      this.isLoggedIn.set(state);
      // Після зміни авторизації — підвантажити домашні дані ще раз,
      // щоб з’явились/зникли персоналізовані шматки.
      this.getHomepageData();
    });
  }

  ngAfterViewInit() {
    if (this.articlesSwiper) {
      this.articlesSwiper.nativeElement.addEventListener('swiperinit', () => {
        this.articlesSwiper?.nativeElement?.swiper?.update?.();
      });
    }
    if (this.reviewsSwiper) {
      this.reviewsSwiper.nativeElement.addEventListener('swiperinit', () => {
        this.reviewsSwiper?.nativeElement?.swiper?.update?.();
      });
    }
  }

  ngOnDestroy() {
    this.stopCountdown();
    this.authSub?.unsubscribe();
  }

  // ---------- HELPERS ----------
  formatSessionTime(timeRange: string): { date: string; time: string } {
    const parts = timeRange.split(' о ');
    if (parts.length === 2) {
      return { date: parts[0], time: parts[1] };
    }
    const dateMatch = timeRange.match(/(\d{1,2}\s[А-Яа-яІіЇїЄє]+?\s\d{4})/);
    const timeMatch = timeRange.match(/(\d{1,2}:\d{2})/);
    return {
      date: dateMatch ? dateMatch[0] : timeRange,
      time: timeMatch ? timeMatch[0] : '',
    };
  }

  private setupMockSessionsIfLoggedIn() {
    if (this.isLoggedIn() && this.homepageData?.doctors?.length! >= 2) {
      this.userSessions = [
        {
          id: 1,
          type: 'Індивідуальна сесія',
          status: 'Очікується',
          doctor_name: `${this.homepageData!.doctors[0].firstname} ${this.homepageData!.doctors[0].lastname}`,
          doctor_image: this.homepageData!.doctors[0].img,
          time_range: '20 вересня 2025 о 14:00',
          icon: 'videокam-outline',
        } as Session,
        {
          id: 2,
          type: 'Сімейна сесія',
          status: 'Очікується',
          doctor_name: `${this.homepageData!.doctors[1].firstname} ${this.homepageData!.doctors[1].lastname}`,
          doctor_image: this.homepageData!.doctors[1].img,
          time_range: '20 вересня 2025 о 14:00',
          icon: 'videокam-outline',
        } as Session,
      ];
    } else {
      this.userSessions = [];
    }
  }

  toggleText(review: any) {
    review.showFullText = !review.showFullText;
  }

  // ---------- DATA ----------
  getHomepageData() {
    this.http
      .get<HomepageData>(`${environment.baseUrl}/connector.php?action=get_homepage`)
      .subscribe((data) => {
        this.homepageData = data;

        // обрізаємо довгі тексти відгуків
        if (this.homepageData?.section_9?.reviews) {
          this.homepageData.section_9.reviews = this.homepageData.section_9.reviews.map(
            (review) => ({
              ...review,
              showFullText: false,
              truncatedText:
                review.text.length > this.TRUNCATE_LENGTH
                  ? review.text.substring(0, this.TRUNCATE_LENGTH) + '...'
                  : review.text,
            })
          );
        }

        // підставляємо «мої сесії» (плейсхолдер)
        this.setupMockSessionsIfLoggedIn();

        console.log('BASE_URL at runtime:', environment.baseUrl);
        console.log('Homepage Data:', this.homepageData);
        console.log('Doctors Data:', this.homepageData?.doctors);
      });
  }

  // ---------- SESSIONS (плейсхолдер дій) ----------
  rescheduleSession(sessionId: number) {
    console.log('Reschedule session:', sessionId);
  }
  cancelSession(sessionId: number) {
    console.log('Cancel session:', sessionId);
  }
  paySession(sessionId: number) {
    console.log('Pay for session:', sessionId);
  }
  viewAllSessions() {
    const navigationExtras: NavigationExtras = {
      state: {
        sessions: this.userSessions,
        doctors: this.homepageData?.doctors,
      },
    };
    this.router.navigate(['/sessions'], navigationExtras);
  }

  // ---------- LOGIN MODAL ----------
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
            this.closeLoginModal(); // authState$ сам перевантажить дані
          } else {
            this.errorMsg.set(response.message || 'Login failed. Please try again.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set('An unexpected error occurred. Please try again later.');
          console.error('Login error:', err);
        },
      });
    }
  }
  togglePasswordVisibility() {
    this.passwordVisible.update((v) => !v);
  }

  // ---------- REGISTER MODAL ----------
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
    this.registerForm.get('confirm')?.setValue(false);
    this.registerForm.get('code')?.clearValidators();
    this.registerForm.get('code')?.updateValueAndValidity();
    this.stopCountdown();
    this.countdown.set(0);
    this.canResend.set(false);
    this.registerPasswordVisible.set(false);
  }
  onSubmitRegister() {
    if (this.registerStep() === 'form') {
      this.registerForm.get('code')?.clearValidators();
      this.registerForm.get('code')?.updateValueAndValidity();

      if (
        this.registerForm.get('name')?.invalid ||
        this.registerForm.get('surname')?.invalid ||
        this.registerForm.get('email')?.invalid ||
        this.registerForm.get('phone')?.invalid ||
        this.registerForm.get('password')?.invalid ||
        this.registerForm.get('confirm')?.invalid
      ) {
        this.registerForm.markAllAsTouched();
        return;
      }
    } else if (this.registerStep() === 'code') {
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
    const isConfirmed = confirm ?? false;

    if (name && surname && email && phone && password && isConfirmed !== undefined) {
      const payload = {
        name,
        surname,
        email,
        phone,
        password,
        confirm: isConfirmed,
        code: this.registerStep() === 'code' ? code || '' : undefined,
      };

      this.authService.register(payload).subscribe({
        next: (response) => {
          this.registerLoading.set(false);
          if (response.stage === 'awaiting_code') {
            this.registerStep.set('code');
            this.infoMsg.set(response.message);
            this.startCountdown(60);
            this.canResend.set(false);
            this.registerForm.get('code')?.setValue('');
          } else if (response.stage === 'done') {
            this.isLoggedIn.set(true);
            this.closeRegisterModal(); // authState$ сам підвантажить дані
          } else if (response.stage === 'error') {
            this.registerErrorMsg.set(response.message);
            if (this.registerStep() === 'code') {
              this.canResend.set(true);
            }
          }
        },
        error: (err) => {
          this.registerLoading.set(false);
          this.registerErrorMsg.set(
            'An unexpected error occurred during registration. Please try again later.'
          );
          console.error('Register error:', err);
          if (this.registerStep() === 'code') {
            this.canResend.set(true);
          }
        },
      });
    }
  }
  resendCode() {
    this.registerForm.get('code')?.clearValidators();
    this.registerForm.get('code')?.updateValueAndValidity();
    this.registerForm.get('code')?.setValue('');
    this.canResend.set(false);
    this.registerPasswordVisible.set(false);
  }
  startCountdown(seconds: number) {
    this.stopCountdown();
    this.countdown.set(seconds);
    this.canResend.set(false);

    this.countdownSubscription = interval(1000).subscribe(() => {
      this.countdown.update((v) => v - 1);
      if (this.countdown() <= 0) {
        this.stopCountdown();
        this.canResend.set(true);
        this.infoMsg.set('Перевірте телефон та спробуйте ще раз');
        this.registerForm.get('code')?.setValue('');
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
    this.registerPasswordVisible.update((v) => !v);
  }

  // ---------- PULL TO REFRESH ----------
  handleRefresh(event: RefresherCustomEvent) {
    // без повного reload – просто підтягнемо дані ще раз
    this.getHomepageData();
    event.detail.complete();
  }
}
