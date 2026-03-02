import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonTextarea, IonButtons, IonLabel } from '@ionic/angular/standalone';
import { DiaryService, DiaryQuestion } from '../../services/diary.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-diary-entry',
  templateUrl: './diary-entry.page.html',
  styleUrls: ['./diary-entry.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonTextarea, IonButtons, IonLabel]
})
export class DiaryEntryPage implements OnInit, OnDestroy {
  private readonly moodOptionsGood: Array<{ id: string; label: string; emoji: string }> = [
    { id: 'happy', label: 'Щасливо', emoji: '😊' },
    { id: 'joyful', label: 'Радісно', emoji: '😄' },
    { id: 'energetic', label: 'Бадьоро', emoji: '⚡' },
    { id: 'great', label: 'В задоволенні', emoji: '😌' },
    { id: 'calm', label: 'Спокійно', emoji: '😇' },
    { id: 'inspired', label: 'Натхненно', emoji: '🤗' },
    { id: 'proud', label: 'Пишаюся собою', emoji: '🏆' },
    { id: 'confident', label: 'Впевнено', emoji: '💪' },
    { id: 'optimistic', label: 'Оптимістично', emoji: '🌞' },
    { id: 'loved', label: 'Закохано', emoji: '😍' },
    { id: 'excited', label: 'Схвильовано', emoji: '🤩' },
    { id: 'energized', label: 'Енергійно', emoji: '🔋' },
    { id: 'motivated', label: 'Вмотивовано', emoji: '🎯' },
    { id: 'relaxed', label: 'Розслаблено', emoji: '🧘' },
    { id: 'euphoric', label: 'Можу гори звернути', emoji: '🚀' }
  ];
  private readonly moodOptionsNotGood: Array<{ id: string; label: string; emoji: string }> = [
    { id: 'indifferent', label: 'Без емоцій', emoji: '😐' },
    { id: 'melancholic', label: 'Сумно', emoji: '😔' },
    { id: 'offended', label: 'Ображено', emoji: '🥺' },
    { id: 'disappointed', label: 'Розчаровано', emoji: '😞' },
    { id: 'tired', label: 'Втомлено', emoji: '😪' },
    { id: 'lonely', label: 'Самотньо', emoji: '🫥' },
    { id: 'powerless', label: 'Безсило', emoji: '🫠' },
    { id: 'tense', label: 'Напружено', emoji: '😣' },
    { id: 'anxious', label: 'Тривожно', emoji: '😟' },
    { id: 'exhausted', label: 'Виснажено', emoji: '😩' },
    { id: 'irritated', label: 'Роздратовано', emoji: '😤' },
    { id: 'nervous', label: 'Знервовано', emoji: '😬' },
    { id: 'panicked', label: 'В паніці', emoji: '😱' },
    { id: 'angry', label: 'Злюся', emoji: '😡' },
    { id: 'desperate', label: 'В розпачі', emoji: '😭' },
    { id: 'apathetic', label: 'В апатії', emoji: '😶' },
    { id: 'empty', label: 'Спустошено', emoji: '🕳️' }
  ];

  step = 1;
  date = '';
  diaryData: any;
  questions: DiaryQuestion[] = [];
  moodGroup: 'good' | 'not_good' = 'good';
  selectedMoods: string[] = [];
  selectedBody = '';
  thoughts = '';
  answersMap: Record<number, string> = {};
  editingId?: number;
  loading = false;
  errorMessage = '';
  private routeSub?: Subscription;

  constructor(
    private diaryService: DiaryService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private location: Location
  ) {}

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
        this.initDiaryEntryView();
      },
      error: () => {
        this.router.navigate(['/tabs/home']);
      }
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  nextStep() {
    if (this.step < 4) {
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
    if (this.selectedMoods.includes(mood)) {
      this.selectedMoods = this.selectedMoods.filter((item) => item !== mood);
      return;
    }
    this.selectedMoods = [...this.selectedMoods, mood];
  }

  setMoodGroup(group: 'good' | 'not_good') {
    this.moodGroup = group;
    const allowedIds = new Set(this.currentMoodOptions.map((item) => item.id));
    this.selectedMoods = this.selectedMoods.filter((item) => allowedIds.has(item));
  }

  get currentMoodOptions(): Array<{ id: string; label: string; emoji: string }> {
    return this.moodGroup === 'good' ? this.moodOptionsGood : this.moodOptionsNotGood;
  }

  saveEntry() {
    this.errorMessage = '';

    const answersToSave: Record<number, string> = {};
    Object.entries(this.answersMap).forEach(([questionId, answer]) => {
      const normalizedAnswer = String(answer ?? '').trim();
      const normalizedQuestionId = Number(questionId);
      if (normalizedAnswer && Number.isFinite(normalizedQuestionId)) {
        answersToSave[normalizedQuestionId] = normalizedAnswer;
      }
    });

    this.loading = true;
    const entryToSave = {
      date: this.date,
      id: this.editingId,
      mood: this.selectedMoods,
      body: this.selectedBody ? [this.selectedBody] : [],
      text: this.thoughts ?? '',
      answers: answersToSave
    };

    this.diaryService.saveDiaryEntry(entryToSave).subscribe({
      next: () => {
        this.storeKnownDiaryDate(this.date);
        this.loading = false;
        this.step = 4;
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err?.message || 'Не вдалося зберегти запис. Спробуйте ще раз.';
      }
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
      this.selectedMoods = Array.isArray(entry.mood) ? entry.mood.filter((item) => typeof item === 'string') : [];
      this.selectedBody = entry.body?.[0] ?? '';
      this.thoughts = entry.text ?? '';
      this.syncMoodGroupBySelectedMood();

      (entry.answers ?? []).forEach((item) => {
        if (item?.id) {
          this.answersMap[item.id] = item.answer ?? '';
        }
      });
    });
  }

  private resetEntryState(): void {
    this.step = 1;
    this.moodGroup = 'good';
    this.loading = false;
    this.errorMessage = '';
    this.editingId = undefined;
    this.selectedMoods = [];
    this.selectedBody = '';
    this.thoughts = '';
    this.answersMap = {};
    this.questions.forEach((q) => {
      this.answersMap[q.id] = '';
    });
  }

  private todayLocalDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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

  private initDiaryEntryView(): void {
    this.diaryService.getDiaryQuestions().subscribe(response => {
      this.diaryData = response;
      this.questions = response.questions ?? [];

      this.routeSub?.unsubscribe();
      this.routeSub = this.route.queryParamMap.subscribe((params) => {
        const incomingDate = params.get('date');
        const todayDate = this.todayLocalDate();
        const normalizedIncomingDate = incomingDate && /^\d{4}-\d{2}-\d{2}$/.test(incomingDate)
          ? incomingDate
          : todayDate;
        this.date = todayDate;

        if (normalizedIncomingDate !== todayDate) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { date: todayDate },
            replaceUrl: true
          });
        }

        this.resetEntryState();
        this.loadExistingEntry();
      });
    });
  }

  private syncMoodGroupBySelectedMood(): void {
    const firstSelectedMood = this.selectedMoods[0];
    if (!firstSelectedMood) {
      return;
    }
    if (this.moodOptionsGood.some((item) => item.id === firstSelectedMood)) {
      this.moodGroup = 'good';
      return;
    }
    if (this.moodOptionsNotGood.some((item) => item.id === firstSelectedMood)) {
      this.moodGroup = 'not_good';
    }
  }
}
