import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonTextarea, IonInput, IonButtons, IonLabel } from '@ionic/angular/standalone';
import { DiaryService, DiaryQuestion } from '../../services/diary.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-diary-entry',
  templateUrl: './diary-entry.page.html',
  styleUrls: ['./diary-entry.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonTextarea, IonInput, IonButtons, IonLabel]
})
export class DiaryEntryPage implements OnInit {
  step = 1;
  date = '';
  diaryData: any;
  questions: DiaryQuestion[] = [];
  selectedMood = '';
  selectedBody = '';
  thoughts = '';
  answersMap: Record<number, string> = {};
  editingId?: number;
  loading = false;
  errorMessage = '';
  positiveMoods: any[] = [];
  negativeMoods: any[] = [];

  constructor(
    private diaryService: DiaryService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit() {
    const incomingDate = this.route.snapshot.queryParamMap.get('date');
    this.date = incomingDate && /^\d{4}-\d{2}-\d{2}$/.test(incomingDate)
      ? incomingDate
      : this.todayLocalDate();

    this.diaryService.getDiaryQuestions().subscribe(response => {
      this.diaryData = response;
      this.questions = response.questions ?? [];
      this.questions.forEach((q) => {
        this.answersMap[q.id] = '';
      });
      this.positiveMoods = this.diaryData.mood.items.filter((m: any) => m.type === 'positive');
      this.negativeMoods = this.diaryData.mood.items.filter((m: any) => m.type === 'negative');
      this.loadExistingEntry();
    });
  }

  nextStep() {
    if (this.step < 5) {
      this.step++;
    }
  }

  previousStep() {
    if (this.step > 1) {
      this.step--;
      return;
    }
    this.goBack();
  }

  goBack() {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigate(['/tabs/diary']);
  }

  setMood(mood: string) {
    this.selectedMood = mood;
  }

  setBodyFeeling(feeling: string) {
    this.selectedBody = feeling;
  }

  isQuestionMissing(questionId: number): boolean {
    return !String(this.answersMap[questionId] ?? '').trim();
  }

  saveEntry() {
    this.errorMessage = '';

    if (!this.selectedMood || !this.selectedBody) {
      this.errorMessage = 'Оберіть настрій та відчуття тіла.';
      return;
    }

    const missingAnswer = this.questions.some((q) => this.isQuestionMissing(q.id));
    if (missingAnswer) {
      this.errorMessage = 'Будь ласка, дайте відповідь на всі запитання.';
      return;
    }

    this.loading = true;
    const entryToSave = {
      date: this.date,
      id: this.editingId,
      mood: [this.selectedMood],
      body: [this.selectedBody],
      text: this.thoughts ?? '',
      answers: this.answersMap
    };

    this.diaryService.saveDiaryEntry(entryToSave).subscribe(() => {
      this.loading = false;
      this.step = 5;
    }, () => {
      this.loading = false;
      this.errorMessage = 'Не вдалося зберегти запис. Спробуйте ще раз.';
    });
  }

  finish() {
    this.router.navigate(['/tabs/diary'], { queryParams: { refresh: new Date().getTime() } });
  }

  private loadExistingEntry(): void {
    this.diaryService.getDiaryByDate(this.date).subscribe((entry) => {
      if (!entry) {
        return;
      }

      this.editingId = entry.id;
      this.selectedMood = entry.mood?.[0] ?? '';
      this.selectedBody = entry.body?.[0] ?? '';
      this.thoughts = entry.text ?? '';

      (entry.answers ?? []).forEach((item) => {
        if (item?.id) {
          this.answersMap[item.id] = item.answer ?? '';
        }
      });
    });
  }

  private todayLocalDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
