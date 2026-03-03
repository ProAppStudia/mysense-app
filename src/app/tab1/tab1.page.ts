import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox, RefresherCustomEvent } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { register } from 'swiper/element/bundle';
import { AuthService, MySessionItem, UserProfile, UpdateProfilePayload } from '../services/auth.service'; // Import AuthService
import { DiaryEntryNormalized, DiaryService } from '../services/diary.service';
import { environment } from '../../environments/environment'; // Import environment for base URL
import { Subscription, interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, heart, checkmarkCircleOutline, walletOutline, copyOutline, createOutline, listOutline } from 'ionicons/icons';
import { Router, RouterLink, NavigationExtras } from '@angular/router';
import { TestsBlockComponent } from '../components/tests-block/tests-block.component';
import { PaymentFlowService, PaymentState } from '../services/payment-flow.service';
import { NewsListItem, NewsService } from '../services/news.service';

addIcons({ timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, walletOutline, copyOutline, createOutline, listOutline });
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
  status_id?: number;
  status_color?: string;
  doctor_name: string;
  doctor_image: string;
  time_range: string;
  session_date?: string;
  icon: string;
  order_id?: number;
  meet_id?: number;
  is_unpaid?: boolean;
  payment_link?: string;
  doctor_id?: number;
  doctor_user_id?: number;
  doctor_hash?: string;
  amount?: number;
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
  lateCancelConfirmOpen = signal(false);
  recentPsychologists: RecentPsychologist[] = [];
  selectedReserveDoctorUserId: number | null = null;
  private pendingReserveNavigationExtras: NavigationExtras | null = null;
  private pendingCancelSessionId: number | null = null;
  todayDiaryExists = signal(false);
  todayDiaryEntry = signal<DiaryEntryNormalized | null>(null);
  hasAnyDiaryEntry = signal(false);
  homeNews: NewsListItem[] = [];
  homeNewsLoading = false;
  activeArticleSlide = 0;
  homeClientName = signal('Головний');
  homeClientBalance = signal(0);
  homeClientAvatar = signal('');
  homeProfileEditorOpen = signal(false);
  homeProfileEditorLoading = signal(false);
  homeProfileEditorError = signal<string | null>(null);
  homeProfileEditorSuccess = signal<string | null>(null);
  homeProfilePhotoUploading = signal(false);
  homeProfilePhotoPreview = signal('');
  homeProfilePendingPhotoPath = signal('');

  homeProfileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/)]),
    password: new FormControl('', [Validators.minLength(6)]),
    confirm: new FormControl('')
  });

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

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private diaryService: DiaryService,
    private router: Router,
    private paymentFlowService: PaymentFlowService,
    private newsService: NewsService
  ) {
      addIcons({calendarOutline,arrowForwardOutline,closeOutline,addCircleOutline,chatbubblesOutline,checkmarkCircleOutline,bookOutline});}

  ngOnInit() {
    this.getHomepageData();
    this.loadHomeNews();
    this.isLoggedIn.set(this.authService.isAuthenticated());
    this.refreshDiaryState();
    if (this.isLoggedIn()) {
      this.loadUserRole();
    }
  }

  ionViewWillEnter() {
    this.syncHomeAuthState();
    this.refreshDiaryState();
    this.loadHomeSessionsIfLoggedIn();
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
    if (!this.canRescheduleHomeSession(session)) {
      window.alert('Перенесення доступне лише більш ніж за 24 години до початку сесії.');
      return;
    }

    const sessionId = Number(session.meet_id || session.id || 0);
    if (!sessionId) {
      return;
    }
    const extras: NavigationExtras = {
      queryParams: {
        session_id: sessionId,
        target_name: session.doctor_name,
        target_photo: session.doctor_image,
        session_type: session.type,
        doctor_id: session.doctor_id,
        doctor_user_id: session.doctor_user_id,
        doctor_hash: session.doctor_hash,
        amount: Number(session.amount ?? 0) > 0 ? String(session.amount) : ''
      }
    };
    void this.router.navigate(['/session-change'], extras);
  }

  cancelSession(session: Session) {
    if (!this.canCancelHomeSession(session)) {
      window.alert('Не можна скасувати сесію, яка вже пройшла.');
      return;
    }

    const sessionId = Number(session?.id || 0);
    if (!sessionId) {
      return;
    }

    if (this.shouldShowLateCancelConfirm(session)) {
      this.pendingCancelSessionId = sessionId;
      this.lateCancelConfirmOpen.set(true);
      return;
    }

    const ok = window.confirm('Скасувати цю сесію?');
    if (!ok) {
      return;
    }
    this.performCancelSession(sessionId);
  }

  closeLateCancelConfirm() {
    this.lateCancelConfirmOpen.set(false);
    this.pendingCancelSessionId = null;
  }

  continueLateCancel() {
    const sessionId = Number(this.pendingCancelSessionId || 0);
    this.closeLateCancelConfirm();
    if (!sessionId) {
      return;
    }
    this.performCancelSession(sessionId);
  }

  private shouldShowLateCancelConfirm(session: Session): boolean {
    const startAt = this.resolveSessionStartAt(session);
    if (!startAt) {
      return false;
    }
    const diff = startAt.getTime() - Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return diff > 0 && diff < dayMs;
  }

  private performCancelSession(sessionId: number) {
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

  async paySession(session: Session) {
    const paymentLink = session.payment_link || await this.resolvePaymentLink(session);
    if (!paymentLink) {
      window.alert('Посилання для оплати поки не доступне.');
      return;
    }

    session.payment_link = paymentLink;
    const orderId = Number(session.order_id ?? 0);
    const paymentState = await this.paymentFlowService.openPaymentAndCheck(orderId, paymentLink);
    this.navigateToPaymentResult(session, paymentState);
  }

  copyPaymentLink(session: Session) {
    const copy = (value: string) => {
      if (!navigator.clipboard?.writeText) {
        window.alert('Не вдалося скопіювати посилання.');
        return;
      }
      navigator.clipboard.writeText(value).then(() => {
        window.alert('Посилання на оплату скопійовано');
      }).catch(() => {
        window.alert('Не вдалося скопіювати посилання.');
      });
    };

    if (session.payment_link) {
      copy(session.payment_link);
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
        if (!freshLink) {
          window.alert('Посилання на оплату не отримано.');
          return;
        }
        session.payment_link = freshLink;
        copy(freshLink);
      },
      error: () => {
        window.alert('Не вдалося отримати посилання для копіювання.');
      }
    });
  }

  isPaidSession(session: Session): boolean {
    const text = String(session.status || '').toLowerCase();
    if (text.includes('оплач')) {
      return true;
    }
    return String(session.status_color || '').toLowerCase() === 'success';
  }

  private isCancelledSession(session: Session): boolean {
    const statusId = Number(session.status_id ?? 0);
    if (statusId === 9) {
      return true;
    }
    const text = String(session.status || '').toLowerCase();
    return text.includes('скасов') || text.includes('відмін');
  }

  showHomePaymentAction(session: Session): boolean {
    return !this.isPaidSession(session) && !this.isCancelledSession(session);
  }

  showHomeSessionActions(session: Session): boolean {
    return !this.isCancelledSession(session);
  }

  canCancelHomeSession(session: Session): boolean {
    if (this.isCancelledSession(session)) {
      return false;
    }
    const startAt = this.resolveSessionStartAt(session);
    if (!startAt) {
      return false;
    }
    return startAt.getTime() > Date.now();
  }

  canRescheduleHomeSession(session: Session): boolean {
    if (this.isCancelledSession(session)) {
      return false;
    }
    const startAt = this.resolveSessionStartAt(session);
    if (!startAt) {
      return false;
    }
    const minLeadMs = 24 * 60 * 60 * 1000;
    return (startAt.getTime() - Date.now()) > minLeadMs;
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
    this.syncHomeAuthState();
    this.getHomepageData();
    this.loadHomeNews();
    this.refreshDiaryState();
    this.loadHomeSessionsIfLoggedIn();

    // Keep refresher UX smooth while async sources refresh in background.
    setTimeout(() => {
      event.detail.complete();
    }, 700);
  }

  private loadUserRole() {
    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.applyHomeClientInfo(profile);
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

  private applyHomeClientInfo(profile: any): void {
    const firstName = String(profile?.firstname || '').trim();
    const fullName = String(profile?.fullname || '').trim();
    const fallback = 'Головний';
    const name = firstName || (fullName ? fullName.split(/\s+/)[0] : fallback);
    this.homeClientName.set(name || fallback);

    const avatarRaw = String(profile?.avatar || profile?.photo || '').trim();
    this.homeClientAvatar.set(avatarRaw);

    const extended = (profile && typeof profile.extended === 'object' && profile.extended) ? profile.extended : {};
    const balanceCandidates = [
      profile?.balance,
      profile?.wallet,
      profile?.user_balance,
      profile?.amount,
      extended?.balance,
      extended?.wallet,
      extended?.user_balance,
      extended?.amount
    ];
    const resolved = balanceCandidates
      .map((value) => Number(String(value ?? '').replace(',', '.')))
      .find((value) => Number.isFinite(value));
    this.homeClientBalance.set(Number.isFinite(resolved as number) ? Math.max(0, Number(resolved)) : 0);
  }

  get homeClientAvatarSrc(): string {
    const raw = String(this.homeClientAvatar() || '').trim();
    if (!raw) {
      return 'assets/icon/favicon.png';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `https://mysense.care${raw}`;
    }
    return `https://mysense.care/${raw}`;
  }

  private syncHomeAuthState() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    if (!this.isLoggedIn()) {
      this.isDoctor.set(false);
      this.userSessions = [];
      this.recentPsychologists = [];
    }
  }

  private loadHomeSessionsIfLoggedIn() {
    if (!this.isLoggedIn()) {
      return;
    }
    this.loadUserRole();
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

    this.pendingReserveNavigationExtras = {
      queryParams: {
        to_user_id: selected.doctor_user_id,
        doctor_user_id: selected.doctor_user_id,
        target_name: selected.fullname,
        target_photo: selected.photo
      }
    };
    this.closeReservePicker();
  }

  openProfileEditor() {
    this.homeProfileEditorError.set(null);
    this.homeProfileEditorSuccess.set(null);
    this.homeProfilePendingPhotoPath.set('');
    this.homeProfileEditorLoading.set(true);
    this.homeProfileEditorOpen.set(true);

    this.authService.getProfile().subscribe({
      next: (profile) => {
        this.homeProfileEditorLoading.set(false);
        if (!profile?.success) {
          this.homeProfileEditorError.set(profile?.error || 'Не вдалося завантажити профіль.');
          return;
        }
        this.patchHomeProfileForm(profile);
      },
      error: () => {
        this.homeProfileEditorLoading.set(false);
        this.homeProfileEditorError.set('Не вдалося завантажити профіль.');
      }
    });
  }

  closeHomeProfileEditor() {
    this.homeProfileEditorOpen.set(false);
    this.homeProfileEditorError.set(null);
    this.homeProfileEditorSuccess.set(null);
    this.homeProfilePhotoUploading.set(false);
    this.homeProfilePendingPhotoPath.set('');
    this.homeProfileForm.patchValue({ password: '', confirm: '' });
  }

  onHomeProfilePhotoClick(input: HTMLInputElement) {
    input.click();
  }

  onHomeProfilePhotoSelected(event: Event) {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) {
      return;
    }

    this.homeProfileEditorError.set(null);
    this.homeProfilePhotoUploading.set(true);

    this.authService.uploadProfilePhoto(file).subscribe({
      next: (response) => {
        this.homeProfilePhotoUploading.set(false);
        const uploadedPath = this.extractUploadedPath(response);
        if (!uploadedPath) {
          this.homeProfileEditorError.set(response?.error || 'Не вдалося завантажити фото.');
          return;
        }
        this.homeProfilePendingPhotoPath.set(uploadedPath);
        this.homeProfilePhotoPreview.set(this.resolveHomeProfilePhoto(uploadedPath));
      },
      error: () => {
        this.homeProfilePhotoUploading.set(false);
        this.homeProfileEditorError.set('Не вдалося завантажити фото.');
      }
    });
  }

  saveHomeProfileEditor() {
    if (this.homeProfileForm.invalid) {
      this.homeProfileForm.markAllAsTouched();
      return;
    }

    const { name, surname, email, phone, password, confirm } = this.homeProfileForm.value;
    const payload: UpdateProfilePayload = {
      name: String(name || '').trim(),
      surname: String(surname || '').trim(),
      email: String(email || '').trim(),
      phone: String(phone || '').trim()
    };

    if (password || confirm) {
      if (!password || !confirm || String(password) !== String(confirm)) {
        this.homeProfileEditorError.set('Паролі не співпадають.');
        return;
      }
      payload.password = String(password);
      payload.confirm = String(confirm);
    }

    const photoPath = String(this.homeProfilePendingPhotoPath() || '').trim();
    if (photoPath) {
      payload.photo = photoPath;
    }

    this.homeProfileEditorLoading.set(true);
    this.homeProfileEditorError.set(null);
    this.homeProfileEditorSuccess.set(null);

    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        this.homeProfileEditorLoading.set(false);
        if (response?.error) {
          this.homeProfileEditorError.set(response.error);
          return;
        }
        this.homeProfileEditorSuccess.set(response?.success || 'Профіль оновлено.');
        this.loadUserRole();
        this.homeProfileForm.patchValue({ password: '', confirm: '' });
      },
      error: () => {
        this.homeProfileEditorLoading.set(false);
        this.homeProfileEditorError.set('Не вдалося зберегти зміни.');
      }
    });
  }

  private patchHomeProfileForm(profile: UserProfile) {
    const firstName = String(profile?.firstname || '').trim();
    const lastName = String(profile?.lastname || '').trim();
    this.homeProfileForm.patchValue({
      name: firstName,
      surname: lastName,
      email: String(profile?.email || '').trim(),
      phone: String(profile?.phone || '').trim(),
      password: '',
      confirm: ''
    });
    const profilePhoto = String((profile as any)?.photo || (profile as any)?.avatar || '').trim();
    this.homeProfilePhotoPreview.set(this.resolveHomeProfilePhoto(profilePhoto));
  }

  private extractUploadedPath(response: any): string {
    const directPath = String(response?.path || '').trim();
    if (directPath) {
      return directPath;
    }
    const firstResultPath = String(response?.results?.[0]?.path || '').trim();
    if (firstResultPath) {
      return firstResultPath;
    }
    const firstFilePath = String(response?.files?.[0]?.path || '').trim();
    if (firstFilePath) {
      return firstFilePath;
    }
    return '';
  }

  private resolveHomeProfilePhoto(path: string): string {
    const raw = String(path || '').trim();
    if (!raw) {
      return 'assets/icon/favicon.png';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `https://mysense.care${raw}`;
    }
    return `https://mysense.care/${raw}`;
  }

  onReservePickerDidDismiss() {
    const extras = this.pendingReserveNavigationExtras;
    this.pendingReserveNavigationExtras = null;
    this.selectedReserveDoctorUserId = null;
    if (extras) {
      void this.router.navigate(['/tabs/session-request'], extras);
    }
  }

  private loadHomeSessions() {
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const { all } = this.extractSessionsFromResponse(resp);
        if (resp?.error && all.length === 0) {
          this.userSessions = [];
          this.recentPsychologists = [];
          return;
        }

        this.userSessions = all
          .map((item, index) => this.mapApiSession(item, index))
          .sort((a, b) => this.compareByOrderCreationDesc(a, b))
          .slice(0, this.isDoctor() ? 2 : all.length);

        this.recentPsychologists = this.extractRecentPsychologists(all).slice(0, 3);
      },
      error: () => {
        this.userSessions = [];
        this.recentPsychologists = [];
      }
    });
  }

  private extractSessionsFromResponse(resp: any): { all: MySessionItem[] } {
    const planned = Array.isArray(resp?.planned) ? resp.planned : [];
    const past = Array.isArray(resp?.past) ? resp.past : [];
    const combined = [...planned, ...past];
    if (combined.length) {
      return { all: combined };
    }

    const fallback = [resp?.sessions, resp?.results, resp?.items, resp?.list, resp?.data]
      .find((value) => Array.isArray(value));
    return { all: Array.isArray(fallback) ? fallback as MySessionItem[] : [] };
  }

  private resolveSessionId(item: any, index: number): number {
    const candidates = [item?.meet_id, item?.order_id, item?.id, item?.session_id, item?.orderId, item?.meetId];
    for (const candidate of candidates) {
      const parsed = Number(candidate ?? 0);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return index + 1;
  }

  private mapApiSession(item: MySessionItem & { status?: number | string; payment_link?: string }, index: number): Session {
    const typeMap: Record<string, Session['type']> = {
      'Індивідуальна': 'Індивідуальна сесія',
      'Сімейна/Парна': 'Сімейна сесія',
      'Дитяча': 'Дитяча сесія'
    };
    const sessionType = String(item.session_type ?? '');
    const type = typeMap[sessionType] ?? 'Індивідуальна сесія';
    const apiStatus = Number((item as any)?.status_id ?? (item as any)?.status ?? 5);
    const isUnpaid = apiStatus === 1;
    const fallbackStatus = isUnpaid ? 'Очікується' : 'Заброньована';
    const statusText = String((item as any)?.status_text ?? '').trim() || fallbackStatus;
    const statusColor = String((item as any)?.status_color ?? '').trim().toLowerCase();

    return {
      id: this.resolveSessionId(item as any, index),
      type,
      status: statusText,
      status_id: Number.isFinite(apiStatus) ? apiStatus : undefined,
      status_color: statusColor,
      doctor_name: String(item.fullname || 'Психолог'),
      doctor_image: this.normalizePhoto(item.photo),
      time_range: `${item.session_date || ''} о ${this.extractStartTime(item.session_time_period)}`,
      session_date: item.session_date || '',
      icon: 'videocam-outline',
      order_id: item.order_id,
      meet_id: item.meet_id,
      is_unpaid: isUnpaid,
      payment_link: String((item as any)?.payment_link ?? (item as any)?.checkout_url ?? '').trim(),
      doctor_id: Number((item as any)?.doctor_id ?? 0) || undefined,
      doctor_user_id: Number(item.doctor_user_id ?? 0) || undefined,
      doctor_hash: String((item as any)?.doctor_hash ?? (item as any)?.hash ?? '').trim() || undefined,
      amount: Number((item as any)?.amount ?? (item as any)?.session_amount ?? 0) || undefined
    };
  }

  statusColorClass(session: Session): string {
    const text = String(session.status || '').toLowerCase();
    if (text.includes('створ')) {
      return 'status-created';
    }
    if (text.includes('неусп') || text.includes('failed')) {
      return 'status-failed';
    }
    if (text.includes('оплач')) {
      return 'status-paid';
    }
    if (text.includes('пройд') || text.includes('минул') || text.includes('past')) {
      return 'status-past';
    }
    const color = String(session.status_color || '').toLowerCase();
    if (color === 'danger') {
      return 'status-failed';
    }
    if (color === 'success') {
      return 'status-paid';
    }
    if (color === 'primary') {
      return 'status-past';
    }
    return 'status-past';
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

  private compareByOrderCreationDesc(a: Session, b: Session): number {
    const aKey = this.getOrderCreationKey(a);
    const bKey = this.getOrderCreationKey(b);
    return bKey - aKey;
  }

  private getOrderCreationKey(session: Session): number {
    const orderId = Number(session.order_id ?? 0);
    if (Number.isFinite(orderId) && orderId > 0) {
      return orderId;
    }
    const fallbackId = Number(session.id ?? 0);
    return Number.isFinite(fallbackId) && fallbackId > 0 ? fallbackId : 0;
  }

  private resolveSessionStartAt(session: Session): Date | null {
    const parsed = this.formatSessionTime(String(session.time_range || ''));
    const datePart = String(parsed.date || session.session_date || '').trim();
    const timePart = String(parsed.time || '').trim();
    if (!datePart || !timePart) {
      return null;
    }

    const date = this.parseFlexibleDate(datePart);
    if (!date) {
      return null;
    }

    const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})$/);
    if (!timeMatch) {
      return null;
    }

    date.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseFlexibleDate(value: string): Date | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }

    const iso = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const dt = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const dotted = normalized.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotted) {
      const dt = new Date(Number(dotted[3]), Number(dotted[2]) - 1, Number(dotted[1]));
      return Number.isNaN(dt.getTime()) ? null : dt;
    }

    const text = normalized.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{4})$/i);
    if (text) {
      const day = Number(text[1]);
      const year = Number(text[3]);
      const month = this.parseMonthName(text[2]);
      if (month >= 0) {
        const dt = new Date(year, month, day);
        return Number.isNaN(dt.getTime()) ? null : dt;
      }
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private parseMonthName(raw: string): number {
    const monthMap: Record<string, number> = {
      січень: 0, січня: 0,
      лютий: 1, лютого: 1,
      березень: 2, березня: 2,
      квітень: 3, квітня: 3,
      травень: 4, травня: 4,
      червень: 5, червня: 5,
      липень: 6, липня: 6,
      серпень: 7, серпня: 7,
      вересень: 8, вересня: 8,
      жовтень: 9, жовтня: 9,
      листопад: 10, листопада: 10,
      грудень: 11, грудня: 11
    };
    return monthMap[String(raw || '').toLowerCase()] ?? -1;
  }

  private async resolvePaymentLink(session: Session): Promise<string> {
    return new Promise((resolve) => {
      this.authService.getMySessions().subscribe({
        next: (resp) => {
          const planned = Array.isArray(resp?.planned) ? resp.planned : [];
          const matched = planned.find((item: any) => {
            const orderIdMatch = session.order_id && Number(item?.order_id) === Number(session.order_id);
            const meetIdMatch = session.meet_id && Number(item?.meet_id) === Number(session.meet_id);
            return !!orderIdMatch || !!meetIdMatch;
          });

          const freshLink = String((matched as any)?.payment_link ?? (matched as any)?.checkout_url ?? '').trim();
          resolve(freshLink);
        },
        error: () => resolve('')
      });
    });
  }

  private navigateToPaymentResult(session: Session, status: PaymentState): void {
    const parsed = this.formatSessionTime(session.time_range || '');
    void this.router.navigate(['/tabs/payment-result'], {
      queryParams: {
        status,
        order_id: Number(session.order_id ?? 0) > 0 ? String(session.order_id) : '',
        doctor_fullname: session.doctor_name || '',
        date: parsed.date || '',
        time: parsed.time || '',
        payment_date: this.formatDateTimeForResult(new Date()),
        amount: ''
      }
    });
  }

  private formatDateTimeForResult(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`;
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
      this.hasAnyDiaryEntry.set(false);
      return;
    }

    const knownDates = this.getKnownDiaryDates();
    this.hasAnyDiaryEntry.set(knownDates.length > 0);

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.diaryService.getDiaryByDate(today).subscribe((entry) => {
      this.todayDiaryEntry.set(entry);
      this.todayDiaryExists.set(!!entry);
      if (entry) {
        this.storeKnownDiaryDate(today);
        this.hasAnyDiaryEntry.set(true);
      }
    });
  }

  private getKnownDiaryDatesStorageKey(): string {
    const token = String(this.authService.getToken() ?? '').trim();
    if (!token) {
      return 'known_diary_dates_v1_guest';
    }
    return `known_diary_dates_v1_${token.slice(0, 20)}`;
  }

  private getKnownDiaryDates(): string[] {
    try {
      const raw = localStorage.getItem(this.getKnownDiaryDatesStorageKey());
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date));
    } catch {
      return [];
    }
  }

  private storeKnownDiaryDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const known = new Set(this.getKnownDiaryDates());
    known.add(date);
    localStorage.setItem(this.getKnownDiaryDatesStorageKey(), JSON.stringify(Array.from(known)));
  }

  openDiaryFromHome(): void {
    if (!this.authService.isAuthenticated()) {
      window.alert('Щоб вести щоденник, потрібно авторизуватись.');
      return;
    }
    void this.router.navigate(['/tabs/diary']);
  }

  openTodayDiaryFromHome(): void {
    if (!this.authService.isAuthenticated()) {
      window.alert('Щоб вести щоденник, потрібно авторизуватись.');
      return;
    }
    const now = new Date();
    void this.router.navigate(['/tabs/diary-entry'], {
      queryParams: { date: this.toLocalDateString(now) }
    });
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  openNewsList(): void {
    void this.router.navigate(['/tabs/news']);
  }

  openNewsArticle(articleId: number): void {
    if (!articleId) {
      return;
    }
    void this.router.navigate(['/tabs/news', articleId]);
  }

  loadHomeNews(): void {
    this.homeNewsLoading = true;
    this.activeArticleSlide = 0;
    this.newsService.getNewsList(1).subscribe({
      next: (resp) => {
        const results = Array.isArray(resp?.results) ? resp.results : [];
        this.homeNews = results.slice(0, 6);
        this.activeArticleSlide = 0;
        this.homeNewsLoading = false;
      },
      error: () => {
        this.homeNews = [];
        this.activeArticleSlide = 0;
        this.homeNewsLoading = false;
      }
    });
  }

  goToArticleSlide(index: number): void {
    const swiper = this.getArticleSwiper();
    if (!swiper) {
      return;
    }
    if (typeof swiper.slideToLoop === 'function') {
      swiper.slideToLoop(index);
    } else {
      swiper.slideTo(index);
    }
    this.activeArticleSlide = index;
  }

  onArticleSwiperInit(): void {
    const swiper = this.getArticleSwiper();
    if (!swiper) {
      return;
    }
    this.activeArticleSlide = Number(swiper.realIndex ?? swiper.activeIndex ?? 0);
  }

  onArticleSwiperChange(event: any): void {
    const fromEvent = Number(event?.detail?.[0]?.realIndex ?? event?.detail?.realIndex ?? NaN);
    if (Number.isFinite(fromEvent)) {
      this.activeArticleSlide = fromEvent;
      return;
    }
    const swiper = this.getArticleSwiper();
    if (!swiper) {
      return;
    }
    this.activeArticleSlide = Number(swiper.realIndex ?? swiper.activeIndex ?? 0);
  }

  private getArticleSwiper(): any {
    return this.articlesSwiper?.nativeElement?.swiper ?? null;
  }
}
