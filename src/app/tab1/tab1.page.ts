import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox, RefresherCustomEvent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { register } from 'swiper/element/bundle';
import { AuthService, MySessionItem } from '../services/auth.service'; // Import AuthService
import { DiaryEntryNormalized, DiaryService } from '../services/diary.service';
import { environment } from '../../environments/environment'; // Import environment for base URL
import { forkJoin, Subscription, interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, heart, checkmarkCircleOutline, walletOutline } from 'ionicons/icons';
import { Router, RouterLink, NavigationExtras } from '@angular/router';
import { TestsBlockComponent } from '../components/tests-block/tests-block.component';

addIcons({ timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, walletOutline });
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
  status: string;
  doctor_name: string;
  doctor_image: string;
  time_range: string;
  icon: string;
  order_id?: number;
  meet_id?: number;
  is_unpaid?: boolean;
  payment_link?: string;
  doctor_user_id?: number;
}

interface RecentPsychologist {
  doctor_user_id: number;
  fullname: string;
  photo: string;
}

interface HomepageData {
  section_1: {
    heading: string;
    sub_heading: string;
    button_test_text: string;
    text_choise_psyhologist: string;
    banner_description_for: string;
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
    FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox,
    TestsBlockComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('articlesSwiper') articlesSwiper?: ElementRef;
  @ViewChild('reviewsSwiper') reviewsSwiper?: ElementRef;
  @ViewChild('howItWorksSwiper') howItWorksSwiper?: ElementRef;
  @ViewChild('swiperButtonPrevCustom', { read: ElementRef }) swiperButtonPrevCustom?: ElementRef;
  @ViewChild('swiperButtonNextCustom', { read: ElementRef }) swiperButtonNextCustom?: ElementRef;

  homepageData: HomepageData | null = null;
  readonly TRUNCATE_LENGTH = 100; // Define a constant for truncation length
  isLoggedIn = signal(false);
  isDoctor = signal(false);
  userSessions: Session[] = [];
  reservePickerOpen = signal(false);
  recentPsychologists: RecentPsychologist[] = [];
  selectedReserveDoctorUserId: number | null = null;
  todayDiaryExists = signal(false);
  todayDiaryEntry = signal<DiaryEntryNormalized | null>(null);
  moodNameById: Record<string, string> = {};
  moodTypeById: Record<string, string> = {};
  moodIconById: Record<string, string> = {};
  bodyNameById: Record<string, string> = {};
  bodyIconById: Record<string, string> = {};
  weekMoodDots = signal<Array<{ col: number; row: number }>>([]);

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

  constructor(private http: HttpClient, private authService: AuthService, private diaryService: DiaryService, private router: Router) {
      addIcons({calendarOutline,arrowForwardOutline,closeOutline,addCircleOutline,chatbubblesOutline,checkmarkCircleOutline,bookOutline});}

  ngOnInit() {
    this.getHomepageData();
    this.isLoggedIn.set(this.authService.isAuthenticated());
    this.diaryService.getDiaryQuestions().subscribe((response) => {
      this.moodNameById = {};
      this.moodTypeById = {};
      this.moodIconById = {};
      this.bodyNameById = {};
      this.bodyIconById = {};
      (response.mood?.items ?? []).forEach((item) => {
        this.moodNameById[item.id] = item.name;
        this.moodTypeById[item.id] = item.type;
        this.moodIconById[item.id] = item.icon;
      });
      (response.body?.items ?? []).forEach((item) => {
        this.bodyNameById[item.id] = item.name;
        this.bodyIconById[item.id] = item.icon;
      });
      this.refreshDiaryState();
    });
    this.refreshDiaryState();
    if (this.isLoggedIn()) {
      this.loadUserRole();
    }
  }

  ionViewWillEnter() {
    this.refreshDiaryState();
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

    // No need to configure navigation params here, as we'll use direct methods
    if (this.reviewsSwiper) {
      this.reviewsSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
          this.reviewsSwiper.nativeElement.swiper.update();
        }
      });
    }

    if (this.howItWorksSwiper) {
      this.howItWorksSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
          this.howItWorksSwiper.nativeElement.swiper.update();
        }
      });
    }
  }

  slidePrevReviews() {
    if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
      this.reviewsSwiper.nativeElement.swiper.slidePrev();
    }
  }

  slideNextReviews() {
    if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
      this.reviewsSwiper.nativeElement.swiper.slideNext();
    }
  }

  slidePrevHowItWorks() {
    if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
      this.howItWorksSwiper.nativeElement.swiper.slidePrev();
    }
  }

  slideNextHowItWorks() {
    if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
      this.howItWorksSwiper.nativeElement.swiper.slideNext();
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
      if (this.isLoggedIn()) {
        this.loadHomeSessions();
      }
    });
  }

  get bannerDescriptionRaw(): string {
    const value = this.homepageData?.section_1.banner_description_for;

    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean).join(' • ');
    }

    return typeof value === 'string' ? value.trim() : '';
  }

  get bannerDescriptionItems(): string[] {
    const rawDescription = this.bannerDescriptionRaw;

    if (!rawDescription) {
      return [];
    }

    const parsedItems = rawDescription
      .replace(/\s{2,}/g, ' ')
      .split(/\s*(?:•|·|●|\||\/|,|;)\s*/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return parsedItems.length > 1 ? parsedItems : [];
  }

  rescheduleSession(session: Session) {
    const sessionId = Number(session.meet_id || session.id || 0);
    if (!sessionId) {
      return;
    }
    const extras: NavigationExtras = {
      queryParams: {
        session_id: sessionId,
        target_name: session.doctor_name,
        target_photo: session.doctor_image,
        session_type: session.type
      }
    };
    void this.router.navigate(['/session-change'], extras);
  }

  cancelSession(sessionId: number) {
    if (!sessionId) {
      return;
    }
    const ok = window.confirm('Скасувати цю сесію?');
    if (!ok) {
      return;
    }
    this.authService.deleteSession(sessionId).subscribe({
      next: (resp) => {
        if (resp?.error) {
          window.alert(resp.error);
          return;
        }
        this.loadHomeSessions();
      }
    });
  }

  paySession(session: Session) {
    if (session.payment_link) {
      window.open(session.payment_link, '_blank');
      return;
    }
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const matched = planned.find((item: any) => {
          const orderIdMatch = session.order_id && Number(item?.order_id) === Number(session.order_id);
          const meetIdMatch = session.meet_id && Number(item?.meet_id) === Number(session.meet_id);
          return !!orderIdMatch || !!meetIdMatch;
        });

        const freshLink = String((matched as any)?.payment_link ?? (matched as any)?.checkout_url ?? '').trim();
        if (freshLink) {
          session.payment_link = freshLink;
          window.open(freshLink, '_blank');
          return;
        }

        window.alert('Посилання для оплати поки не доступне.');
      },
      error: () => {
        window.alert('Не вдалося отримати посилання для оплати.');
      }
    });
  }

  viewAllSessions() {
    void this.router.navigate(['/sessions']);
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
            this.loadUserRole();
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
            this.loadUserRole();
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

  handleRefresh(event: RefresherCustomEvent) {
    window.location.reload(); // Perform a full page reload
    event.detail.complete(); // Complete the refresher animation
  }

  private loadUserRole() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.isDoctor.set(
          !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1')
        );
        this.loadHomeSessions();
      },
      error: () => {
        this.isDoctor.set(false);
        this.userSessions = [];
      }
    });
  }

  openBookSession() {
    if (this.isDoctor()) {
      void this.router.navigate(['/tabs/chat']);
      return;
    }

    if (!this.recentPsychologists.length) {
      void this.router.navigate(['/tabs/filter']);
      return;
    }

    this.selectedReserveDoctorUserId = this.recentPsychologists[0]?.doctor_user_id ?? null;
    this.reservePickerOpen.set(true);
  }

  closeReservePicker() {
    this.reservePickerOpen.set(false);
    this.selectedReserveDoctorUserId = null;
  }

  selectReserveDoctor(doctorUserId: number) {
    this.selectedReserveDoctorUserId = doctorUserId;
  }

  continueReserveWithSelectedDoctor() {
    if (!this.selectedReserveDoctorUserId) {
      return;
    }

    const selected = this.recentPsychologists.find((item) => item.doctor_user_id === this.selectedReserveDoctorUserId);
    if (!selected) {
      return;
    }

    this.reservePickerOpen.set(false);
    const extras: NavigationExtras = {
      queryParams: {
        to_user_id: selected.doctor_user_id,
        doctor_user_id: selected.doctor_user_id,
        target_name: selected.fullname,
        target_photo: selected.photo
      }
    };
    void this.router.navigate(['/tabs/session-request'], extras);
  }

  private loadHomeSessions() {
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        if (resp?.error) {
          this.userSessions = [];
          this.recentPsychologists = [];
          return;
        }

        const planned = Array.isArray(resp?.planned) ? resp.planned : [];
        const past = Array.isArray(resp?.past) ? resp.past : [];
        const all = [...planned, ...past];

        this.userSessions = all
          .map((item, index) => this.mapApiSession(item, index))
          .filter((item) => !!item.id)
          .slice(0, this.isDoctor() ? 2 : all.length);

        this.recentPsychologists = this.extractRecentPsychologists(all).slice(0, 3);
      },
      error: () => {
        this.userSessions = [];
        this.recentPsychologists = [];
      }
    });
  }

  private mapApiSession(item: MySessionItem & { status?: number | string; payment_link?: string }, index: number): Session {
    const typeMap: Record<string, Session['type']> = {
      'Індивідуальна': 'Індивідуальна сесія',
      'Сімейна/Парна': 'Сімейна сесія',
      'Дитяча': 'Дитяча сесія'
    };
    const sessionType = String(item.session_type ?? '');
    const type = typeMap[sessionType] ?? 'Індивідуальна сесія';
    const apiStatus = Number((item as any)?.status ?? 5);
    const isUnpaid = apiStatus === 1;

    return {
      id: Number(item.meet_id || item.order_id || 0),
      type,
      status: isUnpaid ? 'Очікується' : 'Заброньована',
      doctor_name: String(item.fullname || 'Психолог'),
      doctor_image: this.normalizePhoto(item.photo),
      time_range: `${item.session_date || ''} о ${this.extractStartTime(item.session_time_period)}`,
      icon: 'videocam-outline',
      order_id: item.order_id,
      meet_id: item.meet_id,
      is_unpaid: isUnpaid,
      payment_link: String((item as any)?.payment_link ?? (item as any)?.checkout_url ?? '').trim(),
      doctor_user_id: item.doctor_user_id
    };
  }

  private normalizePhoto(photo?: string): string {
    if (!photo) {
      return 'assets/icon/favicon.png';
    }
    if (photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    if (photo.startsWith('/')) {
      return `https://mysense.care${photo}`;
    }
    return `https://mysense.care/${photo.replace(/^\/+/, '')}`;
  }

  private extractStartTime(period?: string): string {
    if (!period) {
      return '';
    }
    return period.split('-')[0].trim();
  }

  private extractRecentPsychologists(items: Array<MySessionItem>): RecentPsychologist[] {
    const unique = new Map<number, RecentPsychologist>();
    for (const item of items) {
      const doctorUserId = Number(item.doctor_user_id || 0);
      if (!doctorUserId || unique.has(doctorUserId)) {
        continue;
      }
      unique.set(doctorUserId, {
        doctor_user_id: doctorUserId,
        fullname: String(item.fullname || 'Психолог'),
        photo: this.normalizePhoto(item.photo)
      });
      if (unique.size >= 3) {
        break;
      }
    }
    return Array.from(unique.values());
  }

  private refreshDiaryState() {
    if (!this.authService.isAuthenticated()) {
      this.todayDiaryEntry.set(null);
      this.todayDiaryExists.set(false);
      this.weekMoodDots.set([]);
      return;
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.diaryService.getDiaryByDate(today).subscribe((entry) => {
      this.todayDiaryEntry.set(entry);
      this.todayDiaryExists.set(!!entry);
    });
    this.loadWeekMoodDots(now);
  }

  openDiaryFromHome(): void {
    if (!this.authService.isAuthenticated()) {
      window.alert('Щоб вести щоденник, потрібно авторизуватись.');
      return;
    }
    void this.router.navigate(['/tabs/diary']);
  }

  todayDiaryMoodLabel(): string {
    const moodId = this.todayDiaryEntry()?.mood?.[0];
    if (!moodId) {
      return 'Запис готовий';
    }
    return this.moodNameById[moodId] ?? moodId;
  }

  todayDiaryBodyLabel(): string {
    const bodyId = this.todayDiaryEntry()?.body?.[0];
    if (!bodyId) {
      return '';
    }
    return this.bodyNameById[bodyId] ?? bodyId;
  }

  todayDiaryMoodIcon(): string {
    const moodId = this.todayDiaryEntry()?.mood?.[0];
    return moodId ? (this.moodIconById[moodId] ?? '') : '';
  }

  todayDiaryBodyIcon(): string {
    const bodyId = this.todayDiaryEntry()?.body?.[0];
    return bodyId ? (this.bodyIconById[bodyId] ?? '') : '';
  }

  private resolveMoodRow(moodId: string): number {
    if (!moodId) {
      return 3;
    }

    const severeNegative = ['panicked', 'desperate', 'furious', 'awful', 'distressed'];
    const mildNegative = ['indifferent', 'melancholic', 'worried', 'nervous', 'annoyed', 'anxious', 'frustrated', 'agitated', 'irritated', 'pessimistic'];
    const highPositive = ['ecstatic', 'euphoric', 'amazing', 'joyful', 'excited', 'inspired'];
    const calmPositive = ['happy', 'hopeful', 'calm', 'great', 'proud', 'motivated', 'confident', 'loved', 'energetic'];

    if (severeNegative.includes(moodId)) {
      return 5;
    }
    if (mildNegative.includes(moodId)) {
      return 4;
    }
    if (highPositive.includes(moodId)) {
      return 1;
    }
    if (calmPositive.includes(moodId)) {
      return 2;
    }

    return this.moodTypeById[moodId] === 'negative' ? 4 : 2;
  }

  private loadWeekMoodDots(baseDate: Date): void {
    const monday = this.startOfWeekMonday(baseDate);
    const dayRequests = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return this.diaryService.getDiaryByDate(this.toLocalDateString(date));
    });

    forkJoin(dayRequests).subscribe((entries) => {
      const dots: Array<{ col: number; row: number }> = [];
      entries.forEach((entry, col) => {
        const moodId = entry?.mood?.[0] ?? '';
        if (!moodId) {
          return;
        }
        dots.push({ col, row: this.resolveMoodRow(moodId) });
      });
      this.weekMoodDots.set(dots);
    });
  }

  private startOfWeekMonday(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon
    const diffToMonday = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diffToMonday);
    return d;
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
