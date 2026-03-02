import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonButtons } from '@ionic/angular/standalone';
import { DiaryService, DiaryEntryNormalized } from '../../services/diary.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward } from 'ionicons/icons';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-diary',
  templateUrl: './diary.page.html',
  styleUrls: ['./diary.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, RouterLink, IonButtons]
})
export class DiaryPage implements OnInit {
  @ViewChild('dateScroller') dateScroller!: ElementRef;

  private readonly windowRadiusDays = 21;
  private readonly loadedMonthKeys = new Set<string>();
  selectedDate: string;
  diaryEntry: DiaryEntryNormalized | null = null;
  dates: Date[] = [];
  entries: Record<string, boolean> = {};
  moodById: Record<string, string> = {};
  moodIconById: Record<string, string> = {};
  bodyById: Record<string, string> = {};
  bodyIconById: Record<string, string> = {};
  questionById: Record<number, string> = {};
  private readonly goodMoodIds = new Set([
    'happy', 'joyful', 'energetic', 'great', 'calm', 'inspired', 'proud', 'confident',
    'optimistic', 'loved', 'excited', 'energized', 'motivated', 'relaxed', 'euphoric'
  ]);
  private readonly notGoodMoodIds = new Set([
    'indifferent', 'melancholic', 'offended', 'disappointed', 'tired', 'lonely', 'powerless',
    'tense', 'anxious', 'exhausted', 'irritated', 'nervous', 'panicked', 'angry', 'desperate',
    'apathetic', 'empty'
  ]);
  private readonly moodEmojiById: Record<string, string> = {
    happy: '😊', joyful: '😄', energetic: '⚡', great: '😌', calm: '😇', inspired: '🤗',
    proud: '🏆', confident: '💪', optimistic: '🌞', loved: '😍', excited: '🤩', energized: '🔋', motivated: '🎯',
    relaxed: '🧘', euphoric: '🚀', indifferent: '😐', melancholic: '😔', offended: '🥺',
    disappointed: '😞', tired: '😪', lonely: '🫥', powerless: '🫠', tense: '😣', anxious: '😟',
    exhausted: '😩', irritated: '😤', nervous: '😬', panicked: '😱', angry: '😡', desperate: '😭',
    apathetic: '😶', empty: '🕳️'
  };
  private readonly moodLabelById: Record<string, string> = {
    happy: 'Щасливо',
    joyful: 'Радісно',
    energetic: 'Бадьоро',
    great: 'В задоволенні',
    calm: 'Спокійно',
    inspired: 'Натхненно',
    proud: 'Пишаюся собою',
    confident: 'Впевнено',
    optimistic: 'Оптимістично',
    loved: 'Закохано',
    excited: 'Схвильовано',
    energized: 'Енергійно',
    motivated: 'Вмотивовано',
    relaxed: 'Розслаблено',
    euphoric: 'Можу гори звернути',
    indifferent: 'Без емоцій',
    melancholic: 'Сумно',
    offended: 'Ображено',
    disappointed: 'Розчаровано',
    tired: 'Втомлено',
    lonely: 'Самотньо',
    powerless: 'Безсило',
    tense: 'Напружено',
    anxious: 'Тривожно',
    exhausted: 'Виснажено',
    irritated: 'Роздратовано',
    nervous: 'Знервовано',
    panicked: 'В паніці',
    angry: 'Злюся',
    desperate: 'В розпачі',
    apathetic: 'В апатії',
    empty: 'Спустошено'
  };

  constructor(
    private diaryService: DiaryService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    addIcons({ arrowBack, arrowForward });
    const today = new Date();
    this.selectedDate = this.toLocalDateString(today);
    this.buildDatesAround(today);
  }

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/tabs/home']);
      return;
    }

    this.authService.getProfile().subscribe({
      next: (profile) => {
        const isDoctor = profile?.is_doctor === true || profile?.is_doctor === 1 || profile?.is_doctor === '1';
        if (isDoctor) {
          this.router.navigate(['/tabs/home']);
          return;
        }
        this.initDiaryView();
      },
      error: () => {
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  ngAfterViewInit() {
    this.scrollToSelectedDate();
  }

  get headerMonthTitle(): string {
    const selected = this.parseLocalDate(this.selectedDate);
    const monthNames = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];
    return `${monthNames[selected.getMonth()]} ${selected.getFullYear()}`;
  }

  previousDay() {
    const selected = this.parseLocalDate(this.selectedDate);
    selected.setDate(selected.getDate() - 1);
    this.selectDate(selected);
  }

  nextDay() {
    if (!this.canGoNextDay) {
      return;
    }
    const selected = this.parseLocalDate(this.selectedDate);
    selected.setDate(selected.getDate() + 1);
    this.selectDate(selected);
  }

  get canGoNextDay(): boolean {
    return this.selectedDate < this.toLocalDateString(new Date());
  }

  selectDate(date: Date) {
    this.selectedDate = this.toLocalDateString(date);
    this.extendDatesWindowIfNeeded(date);
    this.ensureMonthEntriesLoaded(date);
    this.loadDiaryEntry();
    this.scrollToSelectedDate();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isSelected(date: Date): boolean {
    return this.toLocalDateString(date) === this.selectedDate;
  }

  loadDiaryEntry() {
    this.diaryService.getDiaryByDate(this.selectedDate).subscribe(response => {
      this.diaryEntry = response;
      if (response) {
        this.entries[this.selectedDate] = true;
        this.storeKnownDiaryDate(this.selectedDate);
      }
    });
  }

  private loadMonthEntries(year: number, monthIndex: number): void {
    const monthKey = this.getMonthKey(year, monthIndex);
    if (this.loadedMonthKeys.has(monthKey)) {
      return;
    }
    this.loadedMonthKeys.add(monthKey);

    this.diaryService.getDiaryEntriesForMonth(year, monthIndex).subscribe((response) => {
      this.entries = { ...this.entries, ...response };
      Object.keys(response).forEach((date) => {
        if (response[date]) {
          this.storeKnownDiaryDate(date);
        }
      });

      const hasMonthEntriesFromApi = Object.keys(response).some((date) => date.startsWith(monthKey));
      if (!hasMonthEntriesFromApi) {
        this.applyKnownDatesForMonth(monthKey);
      }
    });
  }

  hasEntry(date: Date): boolean {
    const dateString = this.toLocalDateString(date);
    return !!this.entries[dateString];
  }

  isFuture(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  }

  getDayName(date: Date): string {
    const weekdays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return weekdays[date.getDay()];
  }

  private initDiaryView(): void {
    this.diaryService.getDiaryQuestions().subscribe((response) => {
      this.moodById = {};
      this.moodIconById = {};
      this.bodyById = {};
      this.bodyIconById = {};
      this.questionById = {};

      (response.mood?.items ?? []).forEach((item) => {
        this.moodById[item.id] = item.name;
        this.moodIconById[item.id] = item.icon;
      });
      (response.body?.items ?? []).forEach((item) => {
        this.bodyById[item.id] = item.name;
        this.bodyIconById[item.id] = item.icon;
      });
      (response.questions ?? []).forEach((item) => {
        this.questionById[item.id] = item.title;
      });
    });

    this.route.queryParams.subscribe(params => {
      if (params['refresh']) {
        this.loadedMonthKeys.clear();
        this.ensureEntriesLoadedForWindow();
        this.loadDiaryEntry();
      }
    });
    this.loadDiaryEntry();
    this.ensureEntriesLoadedForWindow();
  }

  private applyKnownDatesForMonth(monthKey: string): void {
    const knownDates = this.getKnownDiaryDates();
    if (!knownDates.length) {
      return;
    }
    const nextEntries = { ...this.entries };
    knownDates.forEach((date) => {
      if (date.startsWith(monthKey)) {
        nextEntries[date] = true;
      }
    });
    this.entries = nextEntries;
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

  private getMonthKey(year: number, monthIndex: number): string {
    return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  }

  private parseLocalDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  private buildDatesAround(centerDate: Date): void {
    const normalizedCenter = new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate());
    const nextDates: Date[] = [];
    for (let offset = -this.windowRadiusDays; offset <= this.windowRadiusDays; offset++) {
      const date = new Date(normalizedCenter);
      date.setDate(normalizedCenter.getDate() + offset);
      nextDates.push(date);
    }
    this.dates = nextDates;
  }

  private extendDatesWindowIfNeeded(selectedDate: Date): void {
    if (!this.dates.length) {
      this.buildDatesAround(selectedDate);
      return;
    }
    const first = this.dates[0];
    const last = this.dates[this.dates.length - 1];
    const threshold = 5;
    const millisPerDay = 24 * 60 * 60 * 1000;
    const daysToStart = Math.round((selectedDate.getTime() - first.getTime()) / millisPerDay);
    const daysToEnd = Math.round((last.getTime() - selectedDate.getTime()) / millisPerDay);
    if (daysToStart <= threshold || daysToEnd <= threshold) {
      this.buildDatesAround(selectedDate);
      this.ensureEntriesLoadedForWindow();
    }
  }

  private ensureMonthEntriesLoaded(date: Date): void {
    this.loadMonthEntries(date.getFullYear(), date.getMonth());
  }

  private ensureEntriesLoadedForWindow(): void {
    const uniqueMonths = new Set<string>();
    this.dates.forEach((date) => {
      uniqueMonths.add(this.getMonthKey(date.getFullYear(), date.getMonth()));
    });
    uniqueMonths.forEach((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      this.loadMonthEntries(year, (month || 1) - 1);
    });
  }

  private scrollToSelectedDate() {
    setTimeout(() => {
      const scroller = this.dateScroller?.nativeElement as HTMLElement | undefined;
      if (!scroller) {
        return;
      }
      const items = Array.from(scroller.querySelectorAll('.date-item')) as HTMLElement[];
      if (!items.length) {
        return;
      }

      const selectedIndex = items.findIndex((item) => item.classList.contains('selected'));
      if (selectedIndex < 0) {
        return;
      }

      const step = items.length > 1
        ? items[1].offsetLeft - items[0].offsetLeft
        : items[0].offsetWidth;
      const targetStartIndex = Math.max(0, selectedIndex - 3);
      const targetLeft = targetStartIndex * step;

      const maxLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const clampedLeft = Math.min(targetLeft, maxLeft);
      scroller.scrollTo({ left: clampedLeft, behavior: 'smooth' });
    }, 100);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/tabs/home']);
  }

  get currentEntryMoodGroup(): 'good' | 'not_good' | '' {
    const firstMood = this.diaryEntry?.mood?.[0];
    if (!firstMood) {
      return '';
    }
    if (this.goodMoodIds.has(firstMood)) {
      return 'good';
    }
    if (this.notGoodMoodIds.has(firstMood)) {
      return 'not_good';
    }
    return '';
  }

  get currentEntryMoodGroupLabel(): string {
    if (this.currentEntryMoodGroup === 'good') {
      return 'Добре';
    }
    if (this.currentEntryMoodGroup === 'not_good') {
      return 'Не дуже';
    }
    return '';
  }

  get displayMoods(): Array<{ id: string; label: string; icon: string; emoji: string }> {
    const moods = this.diaryEntry?.mood ?? [];
    return moods.map((moodId) => ({
      id: moodId,
      label: this.moodLabelById[moodId] ?? this.moodById[moodId] ?? moodId,
      icon: '',
      emoji: this.moodEmojiById[moodId] ?? '🙂'
    }));
  }

  get hasThoughts(): boolean {
    return String(this.diaryEntry?.text ?? '').trim().length > 0;
  }

  get isSelectedDateToday(): boolean {
    return this.selectedDate === this.toLocalDateString(new Date());
  }

  get todayDate(): string {
    return this.toLocalDateString(new Date());
  }

  get answeredQuestions(): Array<{ id: number; answer: string; question?: string; placeholder?: string }> {
    const answers = this.diaryEntry?.answers ?? [];
    return answers.filter((answer) => String(answer?.answer ?? '').trim().length > 0);
  }

  displayQuestionTitle(answer: { id: number; question?: string }): string {
    if (answer.question) {
      return answer.question;
    }
    return this.questionById[answer.id] ?? 'Запитання';
  }

  private toLocalDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
