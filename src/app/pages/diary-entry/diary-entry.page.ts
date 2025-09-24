import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonIcon, IonTextarea, IonInput, IonButtons, IonLabel } from '@ionic/angular/standalone';
import { DiaryService } from '../../services/diary.service';
import { ActivatedRoute, Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { arrowBack } from 'ionicons/icons';

@Component({
  selector: 'app-diary-entry',
  templateUrl: './diary-entry.page.html',
  styleUrls: ['./diary-entry.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButton, IonIcon, IonTextarea, IonInput, IonButtons, IonLabel]
})
export class DiaryEntryPage implements OnInit {
  step = 1;
  date: string | null = null;
  diaryData: any;
  diaryEntry: any = {
    mood: '',
    bodyFeeling: '',
    thoughts: '',
    answers: []
  };
  positiveMoods: any[] = [];
  negativeMoods: any[] = [];

  constructor(
    private diaryService: DiaryService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    addIcons({ arrowBack });
  }

  ngOnInit() {
    this.date = this.route.snapshot.queryParamMap.get('date');
    this.diaryService.getDiaryQuestions().subscribe(response => {
      this.diaryData = response;
      this.diaryEntry.answers = this.diaryData.questions.map((q: any) => ({ question_id: q.id, answer: '' }));
      this.positiveMoods = this.diaryData.mood.items.filter((m: any) => m.type === 'positive');
      this.negativeMoods = this.diaryData.mood.items.filter((m: any) => m.type === 'negative');
    });
  }

  nextStep() {
    this.step++;
  }

  previousStep() {
    this.step--;
  }

  setMood(mood: string) {
    this.diaryEntry.mood = mood;
  }

  setBodyFeeling(feeling: string) {
    this.diaryEntry.bodyFeeling = feeling;
  }

  saveEntry() {
    const entryToSave = {
      date: this.date,
      ...this.diaryEntry
    };
    this.diaryService.saveDiaryEntry(entryToSave).subscribe(() => {
      this.step = 5; // Move to the "Your diary entry has been created" step
    });
  }

  finish() {
    this.router.navigate(['/tabs/diary'], { queryParams: { refresh: new Date().getTime() } });
  }
}
