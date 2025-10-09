import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { register } from 'swiper/element/bundle';
import { AuthService } from '../services/auth.service'; // Import AuthService
import { environment } from '../../environments/environment'; // Import environment for base URL
import { Subscription, interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline } from 'ionicons/icons';
import { Router, RouterLink, NavigationExtras } from '@angular/router';

addIcons({ timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline });
register();

interface Doctor {
  img: string;
  firstname: string;
  lastname: string; // Added lastname
  practice_years_text: string;
}

interface Session {
  id: number;
  type: 'Індивідуальна сесія' | 'Сімейна сесія' | 'Дитяча сесія' ;
  status: string; // e.g., 'Waiting for call', 'Confirmed', 'Completed'
  doctor_name: string;
  doctor_image: string;
  time_range: string; // e.g., '4:00 PM-9:00 PM'
  icon: string; // e.g., 'videocam-outline' or 'person-outline'
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
    reviews: { text: string; date: string; user_name: string; showFullText?: boolean; truncatedText?: string }[];
  };
  section_10: {
    heading: string;
    items: { heading: string; content: string }[];
    text_button: string;
  };
  section_11: {
    heading: string;
    articles: { id: number; slug: string; img: string; title: string; short_description: string; date: string }[];
  };
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonButton, CommonModule, IonAccordionGroup, IonAccordion, IonItem, IonLabel, RouterLink,
    FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('articlesSwiper') articlesSwiper?: ElementRef;
  @ViewChild('reviewsSwiper') reviewsSwiper?: ElementRef;

  homepageData: HomepageData | null = null;
  readonly TRUNCATE_LENGTH = 100; // Define a constant for truncation length
  isLoggedIn = signal(false);
  userSessions: Session[] = [];

  // Login Modal States
  loginOpen = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
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

  constructor(private http: HttpClient, private authService: AuthService, private router: Router) {
      addIcons({calendarOutline,arrowForwardOutline,closeOutline,addCircleOutline,bookOutline,timeOutline,documentTextOutline,chatbubblesOutline,checkboxOutline,peopleOutline});}

  ngOnInit() {
    this.getHomepageData(); // Fetch homepage data first
    // For testing purposes, force isLoggedIn to true
    this.isLoggedIn.set(true);
    // Original line: this.isLoggedIn.set(this.authService.isAuthenticated());
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  formatSessionTime(timeRange: string): { date: string; time: string } {
    const parts = timeRange.split(' о ');
    if (parts.length === 2) {
      // Assuming timeRange is like "16 Жовтня 2025 о 14:00"
      // parts[0] will be "16 Жовтня 2025"
      // parts[1] will be "14:00"
      return { date: parts[0], time: parts[1] };
    }
    // Fallback if format is unexpected, try to extract date and time if possible
    const dateMatch = timeRange.match(/(\d{1,2}\s[А-Яа-я]+\s\d{4})/); // e.g., "16 Жовтня 2025"
    const timeMatch = timeRange.match(/(\d{1,2}:\d{2})/); // e.g., "14:00"

    return {
      date: dateMatch ? dateMatch[0] : timeRange,
      time: timeMatch ? timeMatch[0] : ''
    };
  }

  checkLoginStatus() {
    // For demonstration purposes, force isLoggedIn to true to display example sessions.
    // In a real application, this would be: this.isLoggedIn = this.authService.isAuthenticated();
    // This method is now redundant as isLoggedIn is a signal and updated in ngOnInit
    // this.isLoggedIn = true;
    if (this.isLoggedIn() && this.homepageData && this.homepageData.doctors && this.homepageData.doctors.length >= 2) {
      this.userSessions = [
        {
          id: 1,
          type: 'Індивідуальна сесія', // Changed to match interface
          status: 'Очікується', // Changed status to "Очікується"
          doctor_name: `${this.homepageData.doctors[0].firstname} ${this.homepageData.doctors[0].lastname}`,
          doctor_image: this.homepageData.doctors[0].img, // Use the image path directly from API
          time_range: '20 вересня 2025 о 14:00', // Changed time to "20 вересня 2025 о 14:00"
          icon: 'videocam-outline'
        },
        {
          id: 2,
          type: 'Сімейна сесія', // Changed to match interface
          status: 'Очікується', // Changed status to "Очікується"
          doctor_name: `${this.homepageData.doctors[1].firstname} ${this.homepageData.doctors[1].lastname}`,
          doctor_image: this.homepageData.doctors[1].img, // Use the image path directly from API
          time_range: '20 вересня 2025 о 14:00', // Changed time to "20 вересня 2025 о 14:00"
          icon: 'videocam-outline'
        }
      ];
      // In a real scenario, you would call getUserSessions() here
      // this.getUserSessions();
    }
  }

  toggleText(review: any) {
    review.showFullText = !review.showFullText;
  }

  ngAfterViewInit() {
    if (this.articlesSwiper) {
      this.articlesSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.articlesSwiper && this.articlesSwiper.nativeElement.swiper) {
          this.articlesSwiper.nativeElement.swiper.update();
        }
      });
    }

    if (this.reviewsSwiper) {
      this.reviewsSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
          this.reviewsSwiper.nativeElement.swiper.update();
        }
      });
    }
  }

  // getUserSessions() {
  //   const token = this.authService.getToken();
  //   if (token) {
  //     this.http.get<Session[]>(`${environment.baseUrl}/connector.php?action=get_user_sessions&token=${token}`).subscribe(
  //       (sessions) => {
  //         this.userSessions = sessions.map(session => ({
  //           ...session,
  //           icon: session.type === 'Video Consultation' ? 'videocam-outline' : 'person-outline'
  //         }));
  //         console.log('User Sessions:', this.userSessions);
  //       },
  //       (error) => {
  //         console.error('Error fetching user sessions:', error);
  //         // Handle error, e.g., clear token if it's invalid
  //         if (error.status === 401) { // Unauthorized
  //           this.authService.logout();
  //           this.isLoggedIn = false;
  //         }
  //       }
  //     );
  //   }
  // }

  getHomepageData() {
    this.http.get<HomepageData>(`${environment.baseUrl}/connector.php?action=get_homepage`).subscribe((data) => {
      this.homepageData = data;
      if (this.homepageData && this.homepageData.section_9 && this.homepageData.section_9.reviews) {
        this.homepageData.section_9.reviews = this.homepageData.section_9.reviews.map(review => ({
          ...review,
          showFullText: false,
          truncatedText: review.text.length > this.TRUNCATE_LENGTH ? review.text.substring(0, this.TRUNCATE_LENGTH) + '...' : review.text
        }));
      }
      console.log('Homepage Data:', this.homepageData);
      console.log('Doctors Data:', this.homepageData?.doctors); // Add this line to inspect doctors data
      this.checkLoginStatus(); // Call checkLoginStatus after homepageData is loaded
    });
  }

  rescheduleSession(sessionId: number) {
    console.log('Reschedule session:', sessionId);
    // Add your reschedule logic here
  }

  cancelSession(sessionId: number) {
    console.log('Cancel session:', sessionId);
    // Add your cancel logic here
  }

  viewAllSessions() {
    const navigationExtras: NavigationExtras = {
      state: {
        sessions: this.userSessions,
        doctors: this.homepageData?.doctors
      }
    };
    this.router.navigate(['/sessions'], navigationExtras);
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
