import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { QuizListItem } from '../../models/quiz.model';

@Component({
  selector: 'app-tests-block',
  templateUrl: './tests-block.component.html',
  styleUrls: ['./tests-block.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class TestsBlockComponent implements OnInit {
  quizzes: QuizListItem[] = [];
  isLoading = true;
  error: string | null = null;

  constructor(private quizService: QuizService, private router: Router) {}

  ngOnInit() {
    this.loadQuizzes();
  }

  loadQuizzes() {
    this.isLoading = true;
    this.error = null;
    this.quizService.getQuizList().subscribe({
      next: (data) => {
        this.quizzes = data;
        this.isLoading = false;
      },
      error: (err) => {
        this.error = err.message || 'Не вдалося завантажити тести.';
        this.isLoading = false;
      },
    });
  }

  goToQuiz(id: number) {
    this.router.navigate(['/quiz', id]);
  }
}
