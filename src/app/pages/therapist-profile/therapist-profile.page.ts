import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // Import Location
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons, IonIcon, IonButton } from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router'; // Import Router
import { addIcons } from 'ionicons';
import { calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline } from 'ionicons/icons'; // Import arrowBackOutline
import { DoctorService } from '../../services/doctor.service';
import { DoctorCardView } from '../../models/doctor-card-view.model';
import { register } from 'swiper/element/bundle';
import { Week } from 'src/app/models/calendar.model';

register();

@Component({
  selector: 'app-therapist-profile',
  templateUrl: './therapist-profile.page.html',
  styleUrls: ['./therapist-profile.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonBackButton, IonButtons, IonIcon, IonButton],
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
  sessionType: 'online' | 'offline' = 'online';
  bookingFor: 'me' | 'pair' | 'child' = 'me';
  
  currentWeekIndex = 0;
  initialWeekIndex = 0;
  private readonly maxForwardWeeks = 4;
  weeks: Week[] = [];
  selectedDayKey: string | null = null;
  selectedTime: number | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private doctorService: DoctorService,
    private location: Location, // Inject Location service
    private router: Router // Inject Router
  ) {
    addIcons({ calendarOutline, chatbubbleEllipsesOutline, arrowBackOutline }); // Add arrowBackOutline
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.doctorService.getDoctorProfile(id).subscribe(data => {
          this.doctor = data;
          if (this.isDoctorCardView(this.doctor)) {
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

  isDoctorCardView(doctor: any): doctor is DoctorCardView {
    return doctor && doctor.id !== undefined;
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
  }

  isSlotSelected(dayKey: string, slot: any): boolean {
    return this.selectedDayKey === dayKey && Number(this.selectedTime) === Number(slot?.time);
  }

  get showPairOnlineRequestBlock(): boolean {
    return this.sessionType === 'online' && this.bookingFor === 'pair';
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

  openChat(type: '15min' | 'write') {
    if (!this.isDoctorCardView(this.doctor)) {
      return;
    }

    const queryParams: Record<string, string | number> = { type };

    if (this.doctor.hash) {
      queryParams['hash'] = this.doctor.hash;
    }

    if (this.doctor.userId) {
      queryParams['to_user_id'] = this.doctor.userId;
    }

    this.router.navigate(['/tabs/chat'], { queryParams });
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

    this.router.navigate(['/tabs/session-request'], { queryParams });
  }

  private scrollToBookingBlock() {
    const bookingEl = this.bookingBlock?.nativeElement;
    if (!bookingEl) {
      return;
    }

    const targetTop = Math.max((bookingEl.offsetTop || 0) - 16, 0);
    this.content?.scrollToPoint(0, targetTop, 450);
  }
}
