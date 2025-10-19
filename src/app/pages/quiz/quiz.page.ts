import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { QuizService } from '../../services/quiz.service';
import { QuizFull, QuizQuestion, QuizQuestionOption, AnswerType, QuizResultBand } from '../../models/quiz.model';
import { addIcons } from 'ionicons';
import { arrowBack, arrowForward, checkmarkCircleOutline } from 'ionicons/icons';

addIcons({ arrowBack, arrowForward, checkmarkCircleOutline });

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.page.html',
  styleUrls: ['./quiz.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class QuizPage implements OnInit {
  quiz: QuizFull | null = null;
  currentQuestionIndex = 0;
  selectedAnswer: any = null; // Can be string, number, or array for multiple
  answers: { questionId: string | number; value: any }[] = [];
  quizId: number | null = null;
  isLoading = true;
  error: string | null = null;
  showResult = false;
  resultPercent = 0;
  resultText = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quizService: QuizService
  ) {}

  ngOnInit() {
    this.quizId = Number(this.route.snapshot.paramMap.get('id'));
    if (this.quizId) {
      this.loadQuiz();
    } else {
      this.error = 'ID тесту не знайдено.';
      this.isLoading = false;
    }
  }

  loadQuiz() {
    this.isLoading = true;
    this.error = null;
    this.quizService.getQuiz(this.quizId!).subscribe({
      next: (data) => {
        this.quiz = data;
        this.isLoading = false;
        this.resetQuizState();
      },
      error: (err) => {
        this.error = err.message || 'Не вдалося завантажити тест.';
        this.isLoading = false;
      },
    });
  }

  resetQuizState() {
    this.currentQuestionIndex = 0;
    this.selectedAnswer = null;
    this.answers = [];
    this.showResult = false;
    this.resultPercent = 0;
    this.resultText = '';
  }

  get currentQuestion(): QuizQuestion | undefined {
    return this.quiz?.questions[this.currentQuestionIndex];
  }

  get isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }

  get isLastQuestion(): boolean {
    return this.currentQuestionIndex === (this.quiz?.questions.length || 0) - 1;
  }

  get isAnswerSelected(): boolean {
    if (!this.currentQuestion) return false;
    if (this.currentQuestion.multiple) {
      return (this.selectedAnswer as any[])?.length > 0;
    }
    return this.selectedAnswer !== null && this.selectedAnswer !== undefined;
  }

  onAnswerChange(event: any, question: QuizQuestion) {
    if (question.multiple) {
      this.selectedAnswer = event.detail.value;
    } else {
      this.selectedAnswer = event.detail.value;
    }
  }

  prevQuestion() {
    if (!this.isFirstQuestion) {
      this.currentQuestionIndex--;
      this.loadAnswerForCurrentQuestion();
    }
  }

  nextQuestion() {
    if (this.currentQuestion && this.isAnswerSelected) {
      this.saveCurrentAnswer();
      if (!this.isLastQuestion) {
        this.currentQuestionIndex++;
        this.loadAnswerForCurrentQuestion();
      }
    }
  }

  saveCurrentAnswer() {
    if (this.currentQuestion) {
      const existingAnswerIndex = this.answers.findIndex(
        (a) => a.questionId === this.currentQuestion!.id
      );
      if (existingAnswerIndex > -1) {
        this.answers[existingAnswerIndex].value = this.selectedAnswer;
      } else {
        this.answers.push({
          questionId: this.currentQuestion.id,
          value: this.selectedAnswer,
        });
      }
    }
  }

  loadAnswerForCurrentQuestion() {
    const savedAnswer = this.answers.find(
      (a) => a.questionId === this.currentQuestion?.id
    );
    this.selectedAnswer = savedAnswer ? savedAnswer.value : null;
  }

  finishQuiz() {
    if (this.currentQuestion && this.isAnswerSelected) {
      this.saveCurrentAnswer();
    }
    this.calculateResult();
    this.showResult = true;
  }

  calculateResult() {
    if (!this.quiz || this.quiz.questions.length === 0) {
      this.resultPercent = 0;
      this.resultText = 'Немає питань для обчислення результату.';
      return;
    }

    let totalScore = 0;
    const questionsCount = this.quiz.questions.length;

    for (const question of this.quiz.questions) {
      const userAnswer = this.answers.find((a) => a.questionId === question.id);
      if (!userAnswer) continue;

      let questionValue = 0;

      // Logic for answer types and values
      switch (question.type) {
        case 'yes_no':
          questionValue = userAnswer.value === 'yes' ? 1 : 0;
          break;
        case 'yes_no_sometimes':
          if (userAnswer.value === 'yes') {
            questionValue = 1;
          } else if (userAnswer.value === 'sometimes') {
            questionValue = 0.5;
          } else {
            questionValue = 0;
          }
          break;
        case 'custom':
          if (question.multiple) {
            // If multiple, average selected values
            const selectedOptions = (userAnswer.value as (string | number)[]).map(
              (valId) => question.options?.find((opt) => opt.id === valId)
            ).filter(Boolean) as QuizQuestionOption[];

            if (selectedOptions.length > 0) {
              const sumWeights = selectedOptions.reduce((sum, opt) => {
                // Use weight if available, otherwise normalize by index
                return sum + (opt.weight !== undefined ? opt.weight : this.normalizeOptionByIndex(question.options!, opt));
              }, 0);
              questionValue = sumWeights / selectedOptions.length;
            }
          } else {
            // Single custom answer
            const selectedOption = question.options?.find(
              (opt) => opt.id === userAnswer.value
            );
            if (selectedOption) {
              questionValue = selectedOption.weight !== undefined
                ? selectedOption.weight
                : this.normalizeOptionByIndex(question.options!, selectedOption);
            }
          }
          break;
      }
      totalScore += questionValue;
    }

    // Calculate percentage
    // percent = Math.round( (sum(answerValues) / questionsCount) * 100 )
    this.resultPercent = Math.round((totalScore / questionsCount) * 100);

    // Determine result text based on bands
    this.resultText =
      this.quiz.results_bands.find(
        (band) =>
          this.resultPercent >= band.min && this.resultPercent <= band.max
      )?.text || 'Не вдалося визначити результат.';
  }

  // Helper to normalize option value by index if weight is not present
  private normalizeOptionByIndex(options: QuizQuestionOption[], selectedOption: QuizQuestionOption): number {
    const index = options.findIndex(opt => opt.id === selectedOption.id);
    if (index !== -1) {
      // First option = 1, last option = 0, linearly interpolated
      return 1 - (index / (options.length - 1));
    }
    return 0;
  }

  retakeQuiz() {
    this.loadQuiz(); // Reloads the quiz and resets state
  }

  goToHome() {
    this.router.navigate(['/tabs/tab1']);
  }
}
