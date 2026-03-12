import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox, IonTitle, IonIcon, RefresherCustomEvent } from '@ionic/angular/standalone';
import { Animation, createAnimation } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { register } from 'swiper/element/bundle';
import { AuthService, MySessionItem, UserProfile, UpdateProfilePayload } from '../services/auth.service'; // Import AuthService
import { DiaryEntryNormalized, DiaryService } from '../services/diary.service';
import { environment } from '../../environments/environment'; // Import environment for base URL
import { Subscription, interval } from 'rxjs';
import { addIcons } from 'ionicons';
import { timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, checkmarkDoneOutline, heart, checkmarkCircleOutline, walletOutline, copyOutline, createOutline, listOutline, attachOutline, trashOutline } from 'ionicons/icons';
import { Router, RouterLink, NavigationExtras } from '@angular/router';
import { TestsBlockComponent } from '../components/tests-block/tests-block.component';
import { PaymentFlowService, PaymentState } from '../services/payment-flow.service';
import { NewsListItem, NewsService } from '../services/news.service';
import { ChatService } from '../services/chat.service';

addIcons({ timeOutline, videocamOutline, personOutline, addCircleOutline, calendarOutline, chatbubblesOutline, searchOutline, peopleOutline, bookOutline, checkboxOutline, documentTextOutline, closeOutline, eyeOffOutline, eyeOutline, addOutline, arrowForwardOutline, walletOutline, copyOutline, createOutline, listOutline, attachOutline, trashOutline });
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
    FormsModule, ReactiveFormsModule, IonHeader, IonToolbar, IonModal, IonInput, IonSpinner, IonText, IonButtons, IonCheckbox, IonTitle, IonIcon,
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
  lateCancelIsUrgent = signal(false);
  recentPsychologists: RecentPsychologist[] = [];
  pickerPsychologists: RecentPsychologist[] = [];
  selectedPickerDoctorUserId: number | null = null;
  pickerMode: 'reserve' | 'chat' = 'reserve';
  private pendingPickerNavigation: { commands: any[]; extras?: NavigationExtras } | null = null;
  private pendingCancelSessionId: number | null = null;
  private homeCurrentUserId = 0;
  todayDiaryExists = signal(false);
  todayDiaryEntry = signal<DiaryEntryNormalized | null>(null);
  hasAnyDiaryEntry = signal(false);
  hasHomeTasks = signal(false);
  homeNews: NewsListItem[] = [];
  homeNewsLoading = false;
  private homeNewsInFlight = false;
  private homeNewsLoadedAt = 0;
  private homeHomepageInFlight = false;
  private homeHomepageLoadedAt = 0;
  private homeHomepageRateLimitedUntil = 0;
  private homeNewsRateLimitedUntil = 0;
  private readonly homeDataCacheTtlMs = 30000;
  activeArticleSlide = 0;
  homeClientName = signal('Головний');
  homeClientBalance = signal(0);
  homeClientAvatar = signal('');
  doctorHomeTab = signal<'clients' | 'sessions' | 'profile' | 'stats' | 'schedule'>('clients');
  doctorChats: any[] = [];
  doctorSelectedChat: any = null;
  doctorMessages: any[] = [];
  doctorTasks: any[] = [];
  doctorActiveChatTab: 'chat' | 'tasks' = 'chat';
  doctorNewMessage = '';
  doctorIsSending = false;
  doctorSelectedTaskFiles: File[] = [];
  hasSuccessfulClientSession = signal(false);
  hasAnyClientSession = signal(false);
  homeProfileEditorOpen = signal(false);
  homeProfileEditorLoading = signal(false);
  homeProfileEditorError = signal<string | null>(null);
  homeProfileEditorSuccess = signal<string | null>(null);
  homeProfilePhotoUploading = signal(false);
  homeProfilePhotoPreview = signal('');
  homeProfilePendingPhotoPath = signal('');

  loginModalEnterAnimation = (baseEl: HTMLElement): Animation => {
    const root = baseEl.shadowRoot;
    const backdrop = root?.querySelector('ion-backdrop');
    const wrapper = root?.querySelector('.modal-wrapper, .ion-overlay-wrapper');

    const backdropAnimation = createAnimation();
    if (backdrop) {
      backdropAnimation
        .addElement(backdrop as any)
        .fromTo('opacity', '0', '1');
    }

    const wrapperAnimation = createAnimation();
    if (wrapper) {
      wrapperAnimation
        .addElement(wrapper as any)
        .beforeStyles({ opacity: '1' })
        .keyframes([
          { offset: 0, opacity: '0', transform: 'scale(0.98)' },
          { offset: 1, opacity: '1', transform: 'scale(1)' }
        ]);
    }

    return createAnimation()
      .addElement(baseEl)
      .duration(180)
      .easing('cubic-bezier(0.2, 0, 0, 1)')
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

  loginModalLeaveAnimation = (baseEl: HTMLElement): Animation => {
    const root = baseEl.shadowRoot;
    const backdrop = root?.querySelector('ion-backdrop');
    const wrapper = root?.querySelector('.modal-wrapper, .ion-overlay-wrapper');

    const backdropAnimation = createAnimation();
    if (backdrop) {
      backdropAnimation
        .addElement(backdrop as any)
        .fromTo('opacity', '1', '0');
    }

    const wrapperAnimation = createAnimation();
    if (wrapper) {
      wrapperAnimation
        .addElement(wrapper as any)
        .beforeStyles({ opacity: '1' })
        .keyframes([
          { offset: 0, opacity: '1', transform: 'scale(1)' },
          { offset: 1, opacity: '0', transform: 'scale(0.98)' }
        ]);
    }

    return createAnimation()
      .addElement(baseEl)
      .duration(140)
      .easing('cubic-bezier(0.4, 0, 1, 1)')
      .addAnimation([backdropAnimation, wrapperAnimation]);
  };

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
  authLoginStep = signal<'login' | 'forgot'>('login');
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  passwordVisible = signal(false);
  forgotLoading = signal(false);
  forgotErrorMsg = signal<string | null>(null);
  forgotSuccessMsg = signal<string | null>(null);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  forgotPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email])
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
  private authModalSwitchTimer: ReturnType<typeof setTimeout> | null = null;

  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('380', [Validators.required, Validators.pattern(/^[0-9]{7,15}$/)]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirm: new FormControl(false, [Validators.requiredTrue]),
    code: new FormControl('', []) // Code field initially not required
  });

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private chatService: ChatService,
    private diaryService: DiaryService,
    private router: Router,
    private paymentFlowService: PaymentFlowService,
    private newsService: NewsService
  ) {
      addIcons({createOutline,trashOutline,attachOutline,addOutline,calendarOutline,arrowForwardOutline,closeOutline,addCircleOutline,chatbubblesOutline,checkmarkCircleOutline,bookOutline});}

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
    this.clearAuthModalSwitchTimer();
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

  getHomepageData(force = false) {
    const now = Date.now();
    if (!force && now < this.homeHomepageRateLimitedUntil) {
      return;
    }
    if (this.homeHomepageInFlight) {
      return;
    }
    if (!force && this.homepageData && (now - this.homeHomepageLoadedAt) < this.homeDataCacheTtlMs) {
      return;
    }

    this.homeHomepageInFlight = true;
    this.http.get<HomepageData>(`${environment.baseUrl}/connector.php?action=get_homepage`).subscribe({
      next: (data) => {
        this.homepageData = data;
        if (this.homepageData && this.homepageData.section_9 && this.homepageData.section_9.reviews) {
          this.homepageData.section_9.reviews = this.homepageData.section_9.reviews.map(review => ({
            ...review,
            showFullText: false,
            truncatedText: review.text.length > this.TRUNCATE_LENGTH ? review.text.substring(0, this.TRUNCATE_LENGTH) + '...' : review.text
          }));
        }
        this.homeHomepageLoadedAt = Date.now();
        if (this.isLoggedIn()) {
          this.loadHomeSessions();
        }
      },
      error: (error: any) => {
        if (error?.status === 429) {
          this.homeHomepageRateLimitedUntil = Date.now() + 15000;
        }
        this.homeHomepageInFlight = false;
        // Keep stale data if available and avoid aggressive retries under 429.
      },
      complete: () => {
        this.homeHomepageInFlight = false;
      },
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

    this.pendingCancelSessionId = sessionId;
    this.lateCancelIsUrgent.set(this.shouldShowLateCancelConfirm(session));
    this.lateCancelConfirmOpen.set(true);
  }

  closeLateCancelConfirm() {
    this.lateCancelConfirmOpen.set(false);
    this.lateCancelIsUrgent.set(false);
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

  openDoctorHomeSection(section: 'clients' | 'sessions' | 'profile' | 'stats') {
    if (section === 'clients') {
      this.doctorHomeTab.set('clients');
      this.loadDoctorHomeChats();
      return;
    }

    this.doctorHomeTab.set(section as 'sessions' | 'profile' | 'stats');
    if (section === 'sessions') {
      void this.router.navigate(['/sessions']);
      return;
    }
    if (section === 'profile') {
      void this.router.navigate(['/tabs/profile']);
      return;
    }
    void this.router.navigate(['/tabs/doctor-stats']);
  }

  openDoctorScheduleFromHome() {
    this.doctorHomeTab.set('schedule');
    void this.router.navigate(['/tabs/doctor-work-schedule']);
  }

  logoutFromDoctorHome() {
    this.authService.logout();
    this.syncHomeAuthState();
    void this.router.navigate(['/tabs/home']);
  }

  // Login Modal Methods
  openLoginModal() {
    this.loginOpen.set(true);
    this.authLoginStep.set('login');
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
    this.forgotPasswordForm.reset();
    this.forgotLoading.set(false);
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);
  }

  closeLoginModal() {
    this.loginOpen.set(false);
    this.authLoginStep.set('login');
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
    this.forgotPasswordForm.reset();
    this.forgotLoading.set(false);
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);
  }

  switchToRegisterModal(event?: Event) {
    event?.preventDefault();
    this.clearAuthModalSwitchTimer();
    this.closeLoginModal();
    this.authModalSwitchTimer = setTimeout(() => {
      this.openRegisterModal();
      this.authModalSwitchTimer = null;
    }, 140);
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
            this.getHomepageData(true);
            this.loadHomeNews(true);
            this.refreshDiaryState();
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

  openForgotPasswordStep(event?: Event) {
    event?.preventDefault();
    this.authLoginStep.set('forgot');
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);
  }

  backToLoginStep(event?: Event) {
    event?.preventDefault();
    this.authLoginStep.set('login');
    this.forgotLoading.set(false);
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);
  }

  onSubmitForgotPassword() {
    if (this.forgotLoading()) {
      return;
    }

    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }

    this.forgotLoading.set(true);
    this.forgotErrorMsg.set(null);
    this.forgotSuccessMsg.set(null);

    const email = String(this.forgotPasswordForm.get('email')?.value ?? '').trim();

    this.authService.restorePassword(email).subscribe({
      next: (response) => {
        this.forgotLoading.set(false);
        if (response?.error) {
          this.forgotErrorMsg.set(String(response.error));
          return;
        }

        const successText =
          typeof response?.success === 'string'
            ? response.success
            : String(response?.message ?? 'Інструкції для відновлення пароля надіслано на пошту.');
        this.forgotSuccessMsg.set(successText);
      },
      error: () => {
        this.forgotLoading.set(false);
        this.forgotErrorMsg.set('Не вдалося виконати запит. Спробуйте пізніше.');
      }
    });
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

  private clearAuthModalSwitchTimer() {
    if (this.authModalSwitchTimer) {
      clearTimeout(this.authModalSwitchTimer);
      this.authModalSwitchTimer = null;
    }
  }

  private resetRegisterModalState() {
    this.registerLoading.set(false);
    this.registerErrorMsg.set(null);
    this.infoMsg.set(null);
    this.registerStep.set('form');
    this.registerForm.reset({
      name: '',
      surname: '',
      email: '',
      phone: '380',
      password: '',
      confirm: false,
      code: ''
    });
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

    const payload = this.buildRegisterPayload(this.registerStep() === 'code');
    if (!payload) {
      this.registerLoading.set(false);
      this.registerErrorMsg.set('Заповніть, будь ласка, всі обовʼязкові поля.');
      return;
    }

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
          this.getHomepageData(true);
          this.loadHomeNews(true);
          this.refreshDiaryState();
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

  resendCode() {
    if (this.registerLoading()) {
      return;
    }

    const payload = this.buildRegisterPayload(false);
    if (!payload) {
      this.registerErrorMsg.set('Заповніть, будь ласка, всі обовʼязкові поля.');
      return;
    }

    this.registerLoading.set(true);
    this.registerErrorMsg.set(null);
    this.infoMsg.set(null);
    this.canResend.set(false);
    this.registerPasswordVisible.set(false);
    this.registerForm.get('code')?.setValue('');
    this.registerForm.get('code')?.clearValidators();
    this.registerForm.get('code')?.updateValueAndValidity();

    this.authService.register(payload).subscribe({
      next: (response) => {
        this.registerLoading.set(false);
        if (response.stage === 'awaiting_code') {
          this.infoMsg.set(response.message);
          this.startCountdown(60);
          return;
        }
        if (response.stage === 'error') {
          this.registerErrorMsg.set(response.message || 'Не вдалося надіслати код повторно.');
          this.canResend.set(true);
        }
      },
      error: (err) => {
        this.registerLoading.set(false);
        this.registerErrorMsg.set('Не вдалося надіслати код повторно. Спробуйте ще раз.');
        this.canResend.set(true);
        console.error('Resend code error:', err);
      }
    });
  }

  private buildRegisterPayload(includeCode: boolean): {
    name: string;
    surname: string;
    email: string;
    phone: string;
    password: string;
    confirm: boolean;
    code?: string;
  } | null {
    const { name, surname, email, phone, password, confirm, code } = this.registerForm.value;
    const normalizedPhone = this.normalizePhoneDigits(phone);
    if (!name || !surname || !email || !phone || !password) {
      return null;
    }

    const payload: {
      name: string;
      surname: string;
      email: string;
      phone: string;
      password: string;
      confirm: boolean;
      code?: string;
    } = {
      name,
      surname,
      email,
      phone: normalizedPhone,
      password,
      confirm: !!confirm
    };

    if (includeCode && code) {
      payload.code = code;
    }

    return payload;
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

  onRegisterPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) {
      return;
    }

    const digits = this.normalizePhoneDigits(input.value);
    if (digits !== input.value) {
      input.value = digits;
    }
    this.registerForm.get('phone')?.setValue(digits, { emitEvent: false });
    this.registerForm.get('phone')?.markAsDirty();
    this.registerForm.get('phone')?.updateValueAndValidity({ emitEvent: false });
  }

  private normalizePhoneDigits(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '');
  }

  toggleRegisterPasswordVisibility() {
    this.registerPasswordVisible.update(value => !value);
  }

  handleRefresh(event: RefresherCustomEvent) {
    this.syncHomeAuthState();
    this.getHomepageData(true);
    this.loadHomeNews(true);
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
        const isDoctorProfile = !!(profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1');
        this.isDoctor.set(isDoctorProfile);
        this.doctorHomeTab.set('clients');
        if (!isDoctorProfile) {
          const currentUserId = Number(profile?.user_id) || 0;
          this.homeCurrentUserId = currentUserId;
          this.loadHomeTasksPresence(currentUserId);
        } else {
          this.homeCurrentUserId = Number(profile?.user_id) || 0;
          this.hasHomeTasks.set(false);
          this.loadDoctorHomeChats();
        }
        this.loadHomeSessions();
      },
      error: () => {
        this.isDoctor.set(false);
        this.homeCurrentUserId = 0;
        this.hasHomeTasks.set(false);
        this.userSessions = [];
        this.hasAnyClientSession.set(false);
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
      this.homeCurrentUserId = 0;
      this.hasHomeTasks.set(false);
      this.userSessions = [];
      this.recentPsychologists = [];
      this.pickerPsychologists = [];
      this.doctorChats = [];
      this.doctorSelectedChat = null;
      this.doctorMessages = [];
      this.doctorTasks = [];
      this.hasAnyClientSession.set(false);
    }
  }

  private loadHomeTasksPresence(currentUserId: number) {
    this.hasHomeTasks.set(false);
    if (!this.isLoggedIn() || this.isDoctor()) {
      return;
    }

    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        const chats = Array.isArray(data) ? data : (Array.isArray(data?.chats) ? data.chats : []);
        if (!chats.length) {
          this.hasHomeTasks.set(false);
          return;
        }

        const checkNext = (index: number) => {
          if (index >= chats.length) {
            this.hasHomeTasks.set(false);
            return;
          }

          const peerId = this.getHomeTaskPeerId(chats[index], currentUserId);
          if (!peerId) {
            checkNext(index + 1);
            return;
          }

          this.chatService.getMyTasks(peerId).subscribe({
            next: (resp: any) => {
              const tasks = Array.isArray(resp?.tasks) ? resp.tasks : [];
              if (tasks.length > 0) {
                this.hasHomeTasks.set(true);
                return;
              }
              checkNext(index + 1);
            },
            error: () => {
              checkNext(index + 1);
            }
          });
        };

        checkNext(0);
      },
      error: () => {
        this.hasHomeTasks.set(false);
      }
    });
  }

  private getHomeTaskPeerId(chat: any, currentUserId: number): number {
    const candidates = [
      Number(chat?.from_user_id),
      Number(chat?.to_user_id),
      Number(chat?.user_id)
    ].filter((value) => Number.isFinite(value) && value > 0);

    if (!candidates.length) {
      return 0;
    }

    if (currentUserId > 0) {
      const peer = candidates.find((id) => id !== currentUserId);
      if (peer) {
        return peer;
      }
    }

    return candidates[0];
  }

  private loadHomeSessionsIfLoggedIn() {
    if (!this.isLoggedIn()) {
      return;
    }
    this.loadUserRole();
    if (this.isDoctor()) {
      this.loadDoctorHomeChats();
    }
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

    this.pickerMode = 'reserve';
    this.pickerPsychologists = [...this.recentPsychologists];
    this.selectedPickerDoctorUserId = this.pickerPsychologists[0]?.doctor_user_id ?? null;
    this.reservePickerOpen.set(true);
  }

  openWriteToChat() {
    if (this.isDoctor()) {
      void this.router.navigate(['/tabs/chat']);
      return;
    }

    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        const chatPsychologists = this.extractRecentPsychologistsFromChats(data);
        if (!chatPsychologists.length) {
          void this.router.navigate(['/tabs/chat']);
          return;
        }

        this.pickerMode = 'chat';
        this.pickerPsychologists = chatPsychologists;
        this.selectedPickerDoctorUserId = this.pickerPsychologists[0]?.doctor_user_id ?? null;
        this.reservePickerOpen.set(true);
      },
      error: () => {
        void this.router.navigate(['/tabs/chat']);
      }
    });
  }

  closeReservePicker() {
    this.reservePickerOpen.set(false);
  }

  selectReserveDoctor(doctorUserId: number) {
    this.selectedPickerDoctorUserId = doctorUserId;
  }

  continueReserveWithSelectedDoctor() {
    if (!this.selectedPickerDoctorUserId) {
      return;
    }

    const selected = this.pickerPsychologists.find((item) => item.doctor_user_id === this.selectedPickerDoctorUserId);
    if (!selected) {
      return;
    }

    if (this.pickerMode === 'chat') {
      this.pendingPickerNavigation = {
        commands: ['/tabs/chat'],
        extras: {
          queryParams: {
            to_user_id: selected.doctor_user_id,
            doctor_user_id: selected.doctor_user_id,
            target_name: selected.fullname,
            target_photo: selected.photo
          }
        }
      };
    } else {
      this.pendingPickerNavigation = {
        commands: ['/tabs/session-request'],
        extras: {
          queryParams: {
            to_user_id: selected.doctor_user_id,
            doctor_user_id: selected.doctor_user_id,
            target_name: selected.fullname,
            target_photo: selected.photo
          }
        }
      }
    }
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
    const pendingNavigation = this.pendingPickerNavigation;
    this.pendingPickerNavigation = null;
    this.selectedPickerDoctorUserId = null;
    this.pickerPsychologists = [];
    if (pendingNavigation) {
      void this.router.navigate(pendingNavigation.commands, pendingNavigation.extras);
    }
  }

  private loadHomeSessions() {
    this.authService.getMySessions().subscribe({
      next: (resp) => {
        const { all } = this.extractSessionsFromResponse(resp);
        if (resp?.error && all.length === 0) {
          this.userSessions = [];
          this.recentPsychologists = [];
          this.hasSuccessfulClientSession.set(false);
          this.hasAnyClientSession.set(false);
          return;
        }

        const mappedSessions = all
          .map((item, index) => this.mapApiSession(item, index));

        this.hasAnyClientSession.set(mappedSessions.length > 0);

        this.hasSuccessfulClientSession.set(
          mappedSessions.some((session) => this.isSuccessfulClientSession(session))
        );

        const normalizedHomeSessions = mappedSessions
          .map((session) => this.normalizeHomeSessionForDisplay(session))
          .filter((session): session is Session => session !== null);

        this.userSessions = normalizedHomeSessions
          .sort((a, b) => this.compareByOrderCreationDesc(a, b))
          .slice(0, this.isDoctor() ? 2 : normalizedHomeSessions.length);

        this.recentPsychologists = this.extractRecentPsychologists(all).slice(0, 3);
      },
      error: () => {
        this.userSessions = [];
        this.recentPsychologists = [];
        this.hasSuccessfulClientSession.set(false);
        this.hasAnyClientSession.set(false);
      }
    });
  }

  showClientPromoContent(): boolean {
    if (this.isDoctor()) {
      return false;
    }
    if (!this.isLoggedIn()) {
      return true;
    }
    return !this.hasSuccessfulClientSession();
  }

  private isSuccessfulClientSession(session: Session): boolean {
    const statusId = Number(session.status_id ?? 0);
    const statusText = String(session.status || '').toLowerCase();
    const statusColor = String(session.status_color || '').toLowerCase();
    return statusId === 5 || statusText.includes('успіш') || statusColor === 'success';
  }

  private normalizeHomeSessionForDisplay(session: Session): Session | null {
    const statusId = Number(session.status_id ?? 0);
    const statusText = String(session.status || '').toLowerCase();
    const statusColor = String(session.status_color || '').toLowerCase();
    const startAt = this.resolveSessionStartAt(session);

    const isArchive =
      statusId === 4 ||
      statusId === 9 ||
      statusText.includes('скас') ||
      statusText.includes('відмін') ||
      statusText.includes('cancel') ||
      statusText.includes('неусп') ||
      statusText.includes('failed') ||
      statusText.includes('пройд') ||
      statusText.includes('минул') ||
      statusText.includes('past');

    if (isArchive) {
      return null;
    }

    // Home card should show only upcoming sessions.
    if (startAt && startAt.getTime() <= Date.now()) {
      return null;
    }

    const isCreated =
      statusId === 1 ||
      statusText.includes('створ') ||
      statusText.includes('очіку');

    const displayStatus = isCreated ? 'Створена' : 'Заброньована';

    return {
      ...session,
      status: displayStatus
    };
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
    if (text.includes('заброн')) {
      return 'status-paid';
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

  private extractRecentPsychologistsFromChats(data: any): RecentPsychologist[] {
    const chats = Array.isArray(data)
      ? data
      : (Array.isArray(data?.chats) ? data.chats : (Array.isArray(data?.results) ? data.results : []));

    const unique = new Map<number, RecentPsychologist>();
    for (const chat of chats) {
      if (!chat || typeof chat !== 'object') {
        continue;
      }

      const doctorUserId = this.resolvePeerUserIdFromChat(chat);
      if (!doctorUserId || unique.has(doctorUserId)) {
        continue;
      }

      const fullName = String(
        chat.fullname ??
        chat.name ??
        chat.username ??
        `${String(chat.firstname ?? '').trim()} ${String(chat.lastname ?? '').trim()}`.trim() ??
        'Психолог'
      ).trim() || 'Психолог';

      const photo = this.normalizePhoto(
        String(chat.img ?? chat.photo ?? chat.avatar ?? chat.image ?? '').trim()
      );

      unique.set(doctorUserId, {
        doctor_user_id: doctorUserId,
        fullname: fullName,
        photo
      });
    }

    return Array.from(unique.values());
  }

  private loadDoctorHomeChats() {
    if (!this.isLoggedIn() || !this.isDoctor()) {
      this.doctorChats = [];
      this.doctorSelectedChat = null;
      this.doctorMessages = [];
      this.doctorTasks = [];
      return;
    }

    this.chatService.getMyChats().subscribe({
      next: (data: any) => {
        this.doctorChats = this.extractDoctorChatsFromResponse(data);
        if (!this.doctorChats.length) {
          this.doctorSelectedChat = null;
          this.doctorMessages = [];
          this.doctorTasks = [];
          return;
        }

        const currentPeerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
        const stillExists = this.doctorChats.find((chat) => this.getDoctorPeerUserId(chat) === currentPeerId);
        this.selectDoctorClient(stillExists ?? this.doctorChats[0]);
      },
      error: () => {
        this.doctorChats = [];
        this.doctorSelectedChat = null;
        this.doctorMessages = [];
        this.doctorTasks = [];
      }
    });
  }

  private extractDoctorChatsFromResponse(data: any): any[] {
    const candidates: any[] = [];
    if (Array.isArray(data)) {
      candidates.push(...data);
    }

    if (data && typeof data === 'object') {
      const keys = ['chats', 'results', 'items', 'data', 'dialogs', 'users', 'list'];
      for (const key of keys) {
        const value = (data as any)[key];
        if (Array.isArray(value)) {
          candidates.push(...value);
        }
      }
      if (Array.isArray((data as any).result)) {
        candidates.push(...(data as any).result);
      }
    }

    return candidates
      .filter((item) => item && typeof item === 'object')
      .map((chat: any) => ({
        ...chat,
        fullname:
          String(chat.fullname ?? chat.name ?? chat.username ?? chat.firstname ?? chat.title ?? '').trim() ||
          'Користувач',
        photo: this.normalizePhoto(String(chat.img ?? chat.photo ?? chat.avatar ?? chat.image ?? '')),
        from_user_id: Number(chat.from_user_id ?? chat.user_id_from ?? chat.sender_id ?? chat.from_id ?? 0) || undefined,
        to_user_id: Number(chat.to_user_id ?? chat.user_id_to ?? chat.receiver_id ?? chat.to_id ?? 0) || undefined,
        user_id: Number(chat.user_id ?? chat.peer_user_id ?? chat.id ?? 0) || undefined
      }));
  }

  selectDoctorClient(chat: any) {
    if (!chat) {
      return;
    }
    this.doctorSelectedChat = chat;
    this.doctorNewMessage = '';
    this.doctorActiveChatTab = 'chat';
    this.doctorSelectedTaskFiles = [];
    this.loadDoctorMessages();
    this.loadDoctorTasks();
  }

  setDoctorChatTab(tab: 'chat' | 'tasks') {
    this.doctorActiveChatTab = tab;
    if (tab === 'tasks') {
      this.loadDoctorTasks();
    }
  }

  private getDoctorPeerUserId(chat: any): number {
    if (!chat) {
      return 0;
    }
    const candidates = [
      Number(chat.from_user_id),
      Number(chat.to_user_id),
      Number(chat.user_id)
    ].filter((value) => Number.isFinite(value) && value > 0);
    if (!candidates.length) {
      return 0;
    }
    if (this.homeCurrentUserId > 0) {
      const peerId = candidates.find((id) => id !== this.homeCurrentUserId);
      if (peerId) {
        return peerId;
      }
    }
    return candidates[0];
  }

  private loadDoctorMessages() {
    const peerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!peerId) {
      this.doctorMessages = [];
      return;
    }
    this.chatService.getChatMessages(peerId).subscribe({
      next: (data: any) => {
        this.doctorMessages = Array.isArray(data?.messages) ? data.messages : [];
      },
      error: () => {
        this.doctorMessages = [];
      }
    });
  }

  private loadDoctorTasks() {
    const peerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!peerId) {
      this.doctorTasks = [];
      return;
    }
    this.chatService.getMyTasks(peerId).subscribe({
      next: (data: any) => {
        this.doctorTasks = Array.isArray(data?.tasks) ? data.tasks : [];
      },
      error: () => {
        this.doctorTasks = [];
      }
    });
  }

  async sendDoctorMessage() {
    const text = String(this.doctorNewMessage || '').trim();
    const peerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!text || !peerId || this.doctorIsSending) {
      return;
    }
    this.doctorIsSending = true;
    const result = await this.chatService.sendChatMessage(peerId, text);
    if (result.ok) {
      this.doctorNewMessage = '';
      this.loadDoctorMessages();
      this.loadDoctorHomeChats();
    }
    this.doctorIsSending = false;
  }

  sendDoctorTask() {
    const text = String(this.doctorNewMessage || '').trim();
    const peerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!text || !peerId || this.doctorIsSending) {
      return;
    }
    this.doctorIsSending = true;
    this.uploadDoctorFilesForTask().then((uploadedFiles) => {
      this.chatService.createTask(peerId, text, uploadedFiles).subscribe({
        next: (resp: any) => {
          this.doctorIsSending = false;
          if (resp?.error) {
            return;
          }
          this.doctorNewMessage = '';
          this.doctorSelectedTaskFiles = [];
          this.loadDoctorTasks();
        },
        error: () => {
          this.doctorIsSending = false;
        }
      });
    }).catch(() => {
      this.doctorIsSending = false;
    });
  }

  onDoctorTaskFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.doctorSelectedTaskFiles = Array.from(input?.files ?? []);
  }

  private async uploadDoctorFilesForTask(): Promise<Array<{ name: string; path: string }>> {
    if (!this.doctorSelectedTaskFiles.length) {
      return [];
    }

    return new Promise((resolve, reject) => {
      this.chatService.uploadTaskFiles(this.doctorSelectedTaskFiles).subscribe({
        next: (resp: any) => {
          const uploaded = Array.isArray(resp?.files)
            ? resp.files
                .filter((file: any) => file?.status === 'ok' && !!file?.path)
                .map((file: any) => ({
                  name: String(file?.filename ?? file?.name ?? ''),
                  path: String(file?.path ?? '')
                }))
            : [];

          if (!uploaded.length) {
            reject(new Error('Files upload failed or empty response'));
            return;
          }

          resolve(uploaded);
        },
        error: (error) => reject(error)
      });
    });
  }

  deleteDoctorTask(taskId: number) {
    if (!taskId) {
      return;
    }

    const ok = window.confirm('Видалити це завдання?');
    if (!ok) {
      return;
    }

    this.chatService.deleteTask(taskId).subscribe({
      next: (resp: any) => {
        if (resp?.error) {
          window.alert(resp.error);
          return;
        }
        this.loadDoctorTasks();
      },
      error: () => {
        window.alert('Не вдалося видалити завдання');
      }
    });
  }

  editDoctorTask(task: any) {
    if (!task?.id || !this.doctorSelectedChat || this.doctorIsSending) {
      return;
    }

    const currentText = String(task?.text ?? '').trim();
    const updatedText = window.prompt('Редагувати завдання', currentText)?.trim() ?? '';

    if (!updatedText || updatedText === currentText) {
      return;
    }

    const toUserId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!toUserId) {
      return;
    }

    const existingFiles = this.mapDoctorTaskFilesToUploadPayload(task?.files);
    this.doctorIsSending = true;

    this.chatService.deleteTask(task.id).subscribe({
      next: (deleteResp: any) => {
        if (deleteResp?.error) {
          this.doctorIsSending = false;
          return;
        }

        this.chatService.createTask(toUserId, updatedText, existingFiles).subscribe({
          next: (createResp: any) => {
            this.doctorIsSending = false;
            if (createResp?.error) {
              return;
            }
            this.loadDoctorTasks();
          },
          error: () => {
            this.doctorIsSending = false;
          }
        });
      },
      error: () => {
        this.doctorIsSending = false;
      }
    });
  }

  openDoctorTaskFile(url: string) {
    if (!url) {
      return;
    }
    window.open(url, '_blank');
  }

  private mapDoctorTaskFilesToUploadPayload(files: any[]): Array<{ name: string; path: string }> {
    if (!Array.isArray(files)) {
      return [];
    }

    return files
      .map((file) => {
        const name = String(file?.name ?? '').trim();
        const path = this.extractDoctorPathFromFile(file);
        if (!name || !path) {
          return null;
        }
        return { name, path };
      })
      .filter((item): item is { name: string; path: string } => !!item);
  }

  private extractDoctorPathFromFile(file: any): string {
    if (typeof file?.path === 'string' && file.path.trim()) {
      return file.path.trim();
    }

    const rawUrl = String(file?.url ?? '').trim();
    if (!rawUrl) {
      return '';
    }

    try {
      const parsed = new URL(rawUrl);
      return parsed.pathname || '';
    } catch {
      if (rawUrl.startsWith('/')) {
        return rawUrl;
      }
      return '';
    }
  }

  openDoctorReserveFromHome() {
    const peerId = this.getDoctorPeerUserId(this.doctorSelectedChat);
    if (!peerId) {
      return;
    }

    const queryParams: Record<string, string | number> = {
      to_user_id: peerId,
      doctor_user_id: Number(this.doctorSelectedChat?.doctor_user_id ?? peerId),
      target_name: String(this.doctorSelectedChat?.fullname ?? '').trim(),
      target_photo: String(this.doctorSelectedChat?.photo ?? '').trim()
    };

    const doctorId = Number(this.doctorSelectedChat?.doctor_id ?? 0);
    if (doctorId > 0) {
      queryParams['doctor_id'] = doctorId;
    }
    const hash = String(this.doctorSelectedChat?.hash ?? this.doctorSelectedChat?.doctor_hash ?? this.doctorSelectedChat?.chat_hash ?? '').trim();
    if (hash) {
      queryParams['hash'] = hash;
    }

    void this.router.navigate(['/tabs/session-request'], { queryParams });
  }

  private resolvePeerUserIdFromChat(chat: any): number {
    const candidates = [
      Number(chat?.from_user_id ?? chat?.user_id_from ?? chat?.sender_id ?? chat?.from_id ?? 0),
      Number(chat?.to_user_id ?? chat?.user_id_to ?? chat?.receiver_id ?? chat?.to_id ?? 0),
      Number(chat?.user_id ?? chat?.peer_user_id ?? chat?.id ?? 0)
    ].filter((value) => Number.isFinite(value) && value > 0);

    if (!candidates.length) {
      return 0;
    }

    if (this.homeCurrentUserId > 0) {
      const peerId = candidates.find((id) => id !== this.homeCurrentUserId);
      if (peerId) {
        return peerId;
      }
    }

    return candidates[0];
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

  loadHomeNews(force = false): void {
    const now = Date.now();
    if (!force && now < this.homeNewsRateLimitedUntil) {
      return;
    }
    if (this.homeNewsInFlight) {
      return;
    }
    if (!force && this.homeNews.length > 0 && (now - this.homeNewsLoadedAt) < this.homeDataCacheTtlMs) {
      return;
    }

    this.homeNewsInFlight = true;
    this.homeNewsLoading = true;
    this.activeArticleSlide = 0;
    this.newsService.getNewsList(1).subscribe({
      next: (resp) => {
        const results = Array.isArray(resp?.results) ? resp.results : [];
        this.homeNews = results.slice(0, 6);
        this.activeArticleSlide = 0;
        this.homeNewsLoadedAt = Date.now();
        this.homeNewsLoading = false;
        this.homeNewsInFlight = false;
      },
      error: () => {
        this.homeNewsRateLimitedUntil = Date.now() + 15000;
        this.homeNewsLoading = false;
        this.homeNewsInFlight = false;
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
