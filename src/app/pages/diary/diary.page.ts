import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonButtons } from '@ionic/angular/standalone';
import { DiaryService, DiaryEntryNormalized } from '../../services/diary.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward } from 'ionicons/icons';
import { TokenStorageService } from '../../services/token-storage.service';

@Component({
  selector: 'app-diary',
  templateUrl: './diary.page.html',
  styleUrls: ['./diary.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, RouterLink, IonButtons]
})
export class DiaryPage implements OnInit {
  @ViewChild('dateScroller') dateScroller!: ElementRef;

  selectedDate: string;
  diaryEntry: DiaryEntryNormalized | null = null;
  currentMonth: string = '';
  currentYear: number = 0;
  dates: Date[] = [];
  entries: Record<string, boolean> = {};
  moodById: Record<string, string> = {};
  moodIconById: Record<string, string> = {};
  bodyById: Record<string, string> = {};
  bodyIconById: Record<string, string> = {};
  questionById: Record<number, string> = {};

  constructor(
    private diaryService: DiaryService,
    private tokenStorage: TokenStorageService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {
    addIcons({ arrowBack, arrowForward });
    this.tokenStorage.ensureDiaryToken();
    const today = new Date();
    this.selectedDate = this.toLocalDateString(today);
    this.generateCalendar(today.getFullYear(), today.getMonth());
  }

  ngOnInit() {
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
        this.loadDiaryEntry();
        this.loadMonthEntries();
      }
    });
    this.loadDiaryEntry();
    this.loadMonthEntries();
  }

  ngAfterViewInit() {
    this.scrollToSelectedDate();
  }

  generateCalendar(year: number, month: number) {
    this.currentYear = year;
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
      "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];
    this.currentMonth = monthNames[month];
    
    this.dates = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      this.dates.push(new Date(year, month, i));
    }
    this.loadMonthEntries();
  }

  previousMonth() {
    const currentDate = new Date(this.currentYear, this.getMonthNumber(this.currentMonth));
    currentDate.setMonth(currentDate.getMonth() - 1);
    this.generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
  }

  nextMonth() {
    const currentDate = new Date(this.currentYear, this.getMonthNumber(this.currentMonth));
    currentDate.setMonth(currentDate.getMonth() + 1);
    this.generateCalendar(currentDate.getFullYear(), currentDate.getMonth());
  }

  getMonthNumber(monthName: string): number {
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
      "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ];
    return monthNames.indexOf(monthName);
  }

  selectDate(date: Date) {
    this.selectedDate = this.toLocalDateString(date);
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
      }
    });
  }

  loadMonthEntries() {
    this.diaryService.getDiaryEntriesForMonth(this.currentYear, this.getMonthNumber(this.currentMonth)).subscribe(response => {
      this.entries = response;
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

  private scrollToSelectedDate() {
    setTimeout(() => {
      const selectedElement = this.dateScroller.nativeElement.querySelector('.date-item.selected');
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/tabs/home']);
  }

  displayMood(): string {
    if (!this.diaryEntry?.mood?.length) {
      return '';
    }
    const firstMood = this.diaryEntry.mood[0];
    return this.moodById[firstMood] ?? firstMood;
  }

  displayBody(): string {
    if (!this.diaryEntry?.body?.length) {
      return '';
    }
    const firstBody = this.diaryEntry.body[0];
    return this.bodyById[firstBody] ?? firstBody;
  }

  displayMoodIcon(): string {
    if (!this.diaryEntry?.mood?.length) {
      return '';
    }
    return this.moodIconById[this.diaryEntry.mood[0]] ?? '';
  }

  displayBodyIcon(): string {
    if (!this.diaryEntry?.body?.length) {
      return '';
    }
    return this.bodyIconById[this.diaryEntry.body[0]] ?? '';
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
