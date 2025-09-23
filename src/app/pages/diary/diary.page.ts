import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonButtons } from '@ionic/angular/standalone';
import { DiaryService } from '../../services/diary.service';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward } from 'ionicons/icons';

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
  diaryEntry: any;
  currentMonth: string = '';
  currentYear: number = 0;
  dates: (Date | null)[] = [];

  constructor(private diaryService: DiaryService) {
    addIcons({ arrowBack, arrowForward });
    const today = new Date();
    this.selectedDate = today.toISOString().split('T')[0];
    this.generateCalendar(today.getFullYear(), today.getMonth());
  }

  ngOnInit() {
    this.loadDiaryEntry();
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
    const firstDayOfMonth = new Date(year, month, 1);
    const startingDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < startingDay; i++) {
      this.dates.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      this.dates.push(new Date(year, month, i));
    }
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

  selectDate(date: Date | null) {
    if (date) {
      this.selectedDate = date.toISOString().split('T')[0];
      this.loadDiaryEntry();
      this.scrollToSelectedDate();
    }
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isSelected(date: Date | null): boolean {
    if (!date) return false;
    return date.toISOString().split('T')[0] === this.selectedDate;
  }

  loadDiaryEntry() {
    this.diaryService.getDiaryByDate(this.selectedDate).subscribe(response => {
      this.diaryEntry = response;
    });
  }

  getDayName(date: Date | null): string {
    if (!date) return '';
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
}
