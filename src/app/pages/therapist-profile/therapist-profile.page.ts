import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // Import Location
import { FormsModule } from '@angular/forms';
import { IonContent, IonTitle, IonToolbar, IonBackButton, IonButtons, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router'; // Import Router
import { addIcons } from 'ionicons';
import { calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline } from 'ionicons/icons'; // Import arrowBackOutline
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { register } from 'swiper/element/bundle';
import { Week } from 'src/app/models/calendar.model';
import { NavController } from '@ionic/angular';
import { ChatService } from '../../services/chat.service';

register();

@Component({
  selector: 'app-therapist-profile',
  templateUrl: './therapist-profile.page.html',
  styleUrls: ['./therapist-profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonTitle, IonToolbar, CommonModule, FormsModule, IonBackButton, IonButtons, IonIcon, IonButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TherapistProfilePage implements OnInit {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('bookingBlock') bookingBlock?: ElementRef<HTMLElement>;

  doctor: DoctorCardView | { error: string } | null = null;
  isDescriptionExpanded = false;
  isEducationExpanded = false;
  isReviewsExpanded = false;
  isWorkwithExpanded = false;
  isDoNotWorkwithExpanded = false;
  sessionType: 'online' | 'offline' = 'online';
  bookingFor: 'me' | 'pair' | 'child' = 'me';
  
  currentWeekIndex = 0;
  initialWeekIndex = 0;
  private readonly maxForwardWeeks = 4;
  weeks: Week[] = [];
  selectedDayKey: string | null = null;
  selectedTime: number | null = null;
  isOpeningChat = false;
  descriptionParagraphs: string[] = [];
  private interactionRecoveryTimers: Array<ReturnType<typeof setTimeout>> = [];
  
  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private chatService: ChatService,
    private location: Location, // Inject Location service
    private router: Router, // Inject Router
    private navCtrl: NavController,
    private hostEl: ElementRef<HTMLElement>
  ) {
    addIcons({ calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline }); // Add arrowBackOutline
  }

  ngOnInit() {
    if (this.router.url.startsWith('/therapist-profile/')) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id) {
        this.router.navigate(['/tabs/therapist-profile', id], {
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        return;
      }
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.doctorService.getDoctorProfile(id).subscribe(data => {
          this.doctor = data;
          if (this.isDoctorCardView(this.doctor)) {
            this.descriptionParagraphs = this.buildDescriptionParagraphs(this.doctor.description);
            if (this.doctor.calendar) {
              this.weeks = Object
                .values(this.doctor.calendar.weeks)
                .sort((a, b) => {
                  const aTime = Date.parse(String(a?.['date-form'] ?? ''));
                  const bTime = Date.parse(String(b?.['date-form'] ?? ''));
                  if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
                    return 0;
                  }
                  return aTime - bTime;
                });
              const activeIndex = this.weeks.findIndex((w) => w.active === true);
              this.currentWeekIndex = activeIndex >= 0 ? activeIndex : 0;
              this.initialWeekIndex = this.currentWeekIndex;
            }
            this.normalizeBookingTypeSelection();
          }
        });
      }
    });
  }

  ionViewDidEnter() {
    this.scheduleInteractionRecovery();
  }

  isDoctorCardView(doctor: any): doctor is DoctorCardView {
    return doctor && doctor.id !== undefined;
  }

  private buildDescriptionParagraphs(raw?: string): string[] {
    const source = String(raw ?? '').trim();
    if (!source) {
      return [];
    }

    let normalized = source
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, '\'')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>');

    const htmlParagraphMatches = normalized.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
    if (htmlParagraphMatches?.length) {
      const paragraphs = htmlParagraphMatches
        .map((part) => this.stripHtml(part))
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      if (paragraphs.length) {
        return paragraphs;
      }
    }

    normalized = this.stripHtml(normalized);

    const withParagraphHints = normalized
      .replace(/([.!?])\s*(✔)/g, '$1\n\n$2')
      .replace(/([.!?])(?:&nbsp;|\u00A0|\s){2,}(?=[A-ZА-ЯІЇЄҐ])/g, '$1\n\n')
      .replace(/([.!?])\s+(?=(Працюю|Завдяки|Навіть|Запрошую)\b)/g, '$1\n\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return withParagraphHints
      .split(/\n{2,}/)
      .map((part) => part.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  private stripHtml(value: string): string {
    return String(value).replace(/<[^>]*>/g, ' ');
  }

  get availableBookingTypes(): Array<{ value: 'me' | 'pair' | 'child'; label: string }> {
    if (!this.isDoctorCardView(this.doctor)) {
      return [];
    }

    const doctor = this.doctor;
    const options: Array<{ value: 'me' | 'pair' | 'child'; label: string }> = [];
    const has = (value: 'me' | 'pair' | 'child') => options.some((item) => item.value === value);
    const push = (value: 'me' | 'pair' | 'child', label: string) => {
      if (!has(value)) {
        options.push({ value, label });
      }
    };

    const ids = Array.isArray(doctor.therapyTypeIds) ? doctor.therapyTypeIds : [];
    if (ids.length) {
      if (ids.includes(1)) {
        push('me', 'Для мене');
      }
      if (ids.includes(2)) {
        push('pair', 'Для пари');
      }
      if (ids.includes(3)) {
        push('child', 'Для дитини');
      }
    }

    // Fallback/augmentation by prices and textual tags from profile payload.
    if (doctor.priceIndividual) {
      push('me', 'Для мене');
    }
    if (doctor.priceFamily) {
      push('pair', 'Для пари');
    }
    if (Array.isArray(doctor.workWithTypes) && doctor.workWithTypes.some((item) => String(item).toLowerCase().includes('діт'))) {
      push('child', 'Для дитини');
    }

    const order: Record<'me' | 'pair' | 'child', number> = { me: 1, pair: 2, child: 3 };
    return options.sort((a, b) => order[a.value] - order[b.value]);
  }

  private normalizeBookingTypeSelection(): void {
    const availableValues = this.availableBookingTypes.map((item) => item.value);
    if (!availableValues.length) {
      this.bookingFor = 'me';
      return;
    }

    // Keep current value if still available; otherwise choose the first by priority.
    if (!availableValues.includes(this.bookingFor)) {
      this.bookingFor = availableValues[0];
    }
  }

  goBack() {
    const testToken = this.route.snapshot.queryParamMap.get('test_token');
    if (testToken) {
      // If there's a test_token, navigate back to the selection-test page with the token
      this.router.navigate(['/tabs/tests'], { queryParams: { test_token: testToken } });
    } else {
      // Otherwise, use the default back navigation
      this.location.back();
    }
  }

  toggleDescription() {
    this.isDescriptionExpanded = !this.isDescriptionExpanded;
  }

  toggleEducation() {
    this.isEducationExpanded = !this.isEducationExpanded;
  }
  toggleWorkwith() {
    this.isWorkwithExpanded = !this.isWorkwithExpanded;
  }

  toggleDoNotWorkwith() {
    this.isDoNotWorkwithExpanded = !this.isDoNotWorkwithExpanded;
  }
  toggleReviews() {
    this.isReviewsExpanded = !this.isReviewsExpanded;
  }

  get currentWeek(): Week | undefined {
    return this.weeks[this.currentWeekIndex];
  }

  get dayKeys(): string[] {
    return this.currentWeek ? Object.keys(this.currentWeek.days) : [];
  }

  nextWeek() {
    if (this.canGoNextWeek()) {
      this.currentWeekIndex++;
    }
  }

  prevWeek() {
    if (this.canGoPrevWeek()) {
      this.currentWeekIndex--;
    }
  }

  canGoPrevWeek(): boolean {
    return this.currentWeekIndex > this.initialWeekIndex;
  }

  canGoNextWeek(): boolean {
    const maxIndexByMonthLimit = this.initialWeekIndex + this.maxForwardWeeks;
    return this.currentWeekIndex < this.weeks.length - 1 && this.currentWeekIndex < maxIndexByMonthLimit;
  }

  isSlotDisabled(slot: any): boolean {
    const raw = slot?.disabled;
    return raw === true || raw === 1 || raw === '1';
  }

  selectSlot(dayKey: string, slot: any) {
    if (this.isSlotDisabled(slot)) {
      return;
    }
    this.selectedDayKey = dayKey;
    this.selectedTime = Number(slot.time);
    this.openSessionRequest();
  }

  isSlotSelected(dayKey: string, slot: any): boolean {
    return this.selectedDayKey === dayKey && Number(this.selectedTime) === Number(slot?.time);
  }

  get showPairOnlineRequestBlock(): boolean {
    return this.sessionType === 'online' && this.bookingFor === 'pair';
  }

  get showOfflineRequestBlock(): boolean {
    return this.sessionType === 'offline';
  }

  get showContactRequestBlock(): boolean {
    return this.showPairOnlineRequestBlock || this.showOfflineRequestBlock;
  }

  private resolveSlotDate(dayKey: string, slot: any): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
      return dayKey;
    }
    const slotDate = String(slot?.date ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) {
      return slotDate;
    }
    const week: any = this.currentWeek;
    const dayObj: any = week?.days?.[dayKey];
    const dayDate = String(dayObj?.date ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) {
      return dayDate;
    }
    const from = String(week?.['date-form'] ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      const dayIndex = this.dayKeys.indexOf(dayKey);
      if (dayIndex >= 0) {
        const base = new Date(`${from}T00:00:00`);
        base.setDate(base.getDate() + dayIndex);
        const y = base.getFullYear();
        const m = String(base.getMonth() + 1).padStart(2, '0');
        const d = String(base.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  }

  async openChat(type: '15min' | 'write') {
    if (!this.isDoctorCardView(this.doctor)) {
      return;
    }
    if (this.isOpeningChat) {
      return;
    }

    const queryParams: Record<string, string | number> = { type };
    const hash = String(this.doctor.hash ?? '').trim();
    const toUserId = Number(this.doctor.userId ?? 0);

    if (hash) {
      queryParams['hash'] = hash;
    }

    if (Number.isFinite(toUserId) && toUserId > 0) {
      queryParams['to_user_id'] = toUserId;
    }

    if (!queryParams['hash'] && !queryParams['to_user_id']) {
      return;
    }

    this.isOpeningChat = true;

    if (hash) {
      const firstMessageType: 'session' | '15min' | 'family' =
        type === '15min' ? '15min' : (this.bookingFor === 'pair' ? 'family' : 'session');

      const firstMessageResult = await this.chatService.setFirstMessageToChat({
        hash,
        type: firstMessageType,
        format: this.sessionType
      });

      if (!firstMessageResult.ok) {
        const backendError = String(
          firstMessageResult.response?.error ??
          firstMessageResult.error?.message ??
          firstMessageResult.error ??
          ''
        ).trim();
        if (backendError) {
          this.isOpeningChat = false;
          window.alert(backendError);
          return;
        }
      }
    }

    const targetUrl = this.router.serializeUrl(
      this.router.createUrlTree(['/tabs/chat'], { queryParams })
    );

    // iOS can hang on animated route transitions from deeply nested views.
    void this.navCtrl.navigateForward(targetUrl, { animated: false });

    setTimeout(() => {
      if (window.location.pathname.includes('/tabs/therapist-profile')) {
        void this.router.navigateByUrl(targetUrl);
      }
    }, 550);

    setTimeout(() => {
      this.isOpeningChat = false;
    }, 700);
  }

  openSessionRequest() {
    if (!this.isDoctorCardView(this.doctor)) {
      return;
    }

    if (!this.selectedDayKey || !this.selectedTime) {
      this.scrollToBookingBlock();
      return;
    }

    const selectedDay = (this.currentWeek as any)?.days?.[this.selectedDayKey];
    const selectedSlot = Array.isArray(selectedDay?.times)
      ? selectedDay.times.find((slot: any) => Number(slot?.time) === Number(this.selectedTime))
      : null;
    const selectedDate = this.resolveSlotDate(this.selectedDayKey, selectedSlot);
    if (!selectedDate) {
      window.alert('Не вдалося визначити дату обраного часу. Спробуйте ще раз.');
      return;
    }

    const typeByBookingFor: Record<'me' | 'pair' | 'child', number> = {
      me: 1,
      pair: 2,
      child: 3
    };

    const queryParams: Record<string, string | number> = {
      target_name: this.doctor.fullName || 'Психолог',
      target_photo: this.doctor.avatarUrl || '',
      pre_type: typeByBookingFor[this.bookingFor] ?? 1,
      pre_format: this.sessionType,
      pre_date: selectedDate,
      pre_time: Number(this.selectedTime)
    };

    if (this.doctor.hash) {
      queryParams['hash'] = this.doctor.hash;
    }
    if (this.doctor.userId) {
      queryParams['doctor_user_id'] = Number(this.doctor.userId);
    }
    if (this.doctor.id) {
      queryParams['doctor_id'] = Number(this.doctor.id);
    }

    this.router.navigate(['/tabs/request'], { queryParams });
  }

  private scrollToBookingBlock() {
    const bookingEl = this.bookingBlock?.nativeElement;
    if (!bookingEl) {
      return;
    }

    const targetTop = Math.max((bookingEl.offsetTop || 0) - 16, 0);
    this.content?.scrollToPoint(0, targetTop, 450);
  }

  private restoreIosInteractionLayer(): void {
    // iOS workaround: after auth/navigation transitions an inert/hidden layer
    // may remain and swallow all clicks on this page.
    const active = document.activeElement as HTMLElement | null;
    active?.blur?.();

    const host = this.hostEl.nativeElement;
    host.removeAttribute('inert');
    host.removeAttribute('aria-hidden');
    host.classList.remove('ion-page-hidden', 'ion-page-invisible');
    host.style.pointerEvents = 'auto';

    const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
    if (outlet) {
      outlet.removeAttribute('inert');
      outlet.removeAttribute('aria-hidden');
      outlet.style.pointerEvents = 'auto';
    }

    const pageEl = host.closest('.ion-page') as HTMLElement | null;
    if (pageEl) {
      pageEl.removeAttribute('inert');
      pageEl.removeAttribute('aria-hidden');
      pageEl.classList.remove('ion-page-hidden', 'ion-page-invisible');
      pageEl.style.pointerEvents = 'auto';
    }

    // If any stale overlay was left mounted, close it without controller DI.
    const overlays = Array.from(document.querySelectorAll('ion-modal, ion-popover')) as any[];
    for (const overlay of overlays) {
      try {
        if (typeof overlay.dismiss === 'function') {
          overlay.dismiss();
        }
      } catch {}
    }
  }

  private scheduleInteractionRecovery(): void {
    this.clearInteractionRecoveryTimers();
    const delays = [0, 60, 180, 360, 700];
    for (const delay of delays) {
      const timer = setTimeout(() => this.restoreIosInteractionLayer(), delay);
      this.interactionRecoveryTimers.push(timer);
    }
  }

  private clearInteractionRecoveryTimers(): void {
    for (const timer of this.interactionRecoveryTimers) {
      clearTimeout(timer);
    }
    this.interactionRecoveryTimers = [];
  }

  ngOnDestroy(): void {
    this.clearInteractionRecoveryTimers();
  }

}
