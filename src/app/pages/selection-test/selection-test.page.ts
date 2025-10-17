import { Component, OnInit, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, RefresherCustomEvent } from '@ionic/angular';
import { DoctorService } from '../../services/doctor.service';
import { Router } from '@angular/router';

interface TestOption {
  value: any;
  text: string;
}

interface TestQuestion {
  id: string;
  question: string;
  type: 'radio' | 'checkbox' | 'text';
  options?: TestOption[];
}

interface TestStep {
  [consultationType: number]: {
    [questionId: string]: TestQuestion;
  };
}

interface TestData {
  step: {
    [stepNumber: string]: TestStep;
  };
}

@Component({
  selector: 'app-selection-test',
  templateUrl: './selection-test.page.html',
  styleUrls: ['./selection-test.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SelectionTestPage implements OnInit {
  currentStep = signal(0);
  testQuestions: TestData | null = null;
  selectedConsultationType: number | null = null; // 1: individual, 2: family, 3: child
  selectedConsultationFormat: string | null = null; // 'online', 'in-person', 'any'
  selectedGender: string | null = null; // 'female', 'male', 'any'
  answers: { [key: string]: any } = {};
  isLoading: boolean = true;
  error: string | null = null;

  constructor(private doctorService: DoctorService, private router: Router) { }

  ngOnInit() {
    this.loadTestQuestions();
  }

  loadTestQuestions() {
    this.doctorService.getTestQuestions().subscribe({
      next: (data) => {
        if (data && data.step) {
          this.testQuestions = data;
          this.isLoading = false;
        } else {
          this.error = 'Failed to load test questions.';
          this.isLoading = false;
        }
      },
      error: (err) => {
        this.error = 'Error fetching test questions.';
        this.isLoading = false;
        console.error(err);
      }
    });
  }

  selectConsultationType(type: number) {
    this.selectedConsultationType = type;
    this.currentStep.update(value => value + 1);
  }

  selectConsultationFormat(format: string) {
    this.selectedConsultationFormat = format;
  }

  selectGender(gender: string) {
    this.selectedGender = gender;
    this.currentStep.update(value => value + 1);
  }

  answerQuestion(questionId: string, answer: any) {
    this.answers[questionId] = answer;
    this.currentStep.update(value => value + 1);
  }

  nextStep() {
    this.currentStep.update(value => value + 1);
    // Logic to determine if test is complete and navigate to results
    // For now, just incrementing step
    if (this.currentStep() > 3 && this.testQuestions && this.selectedConsultationType !== null) {
      const stepKey = (this.currentStep() - 3).toString();
      const currentTypeQuestions = this.testQuestions.step[stepKey]?.[this.selectedConsultationType];

      if (!currentTypeQuestions || Object.keys(currentTypeQuestions).length === 0) {
        this.submitTest();
      }
    } else if (this.currentStep() > 3 && (!this.testQuestions || this.selectedConsultationType === null)) {
      this.submitTest();
    }
  }

  prevStep() {
    this.currentStep.update(value => value - 1);
  }

  submitTest() {
    // Here you would gather all answers and selected criteria
    // and make an API call to get matching psychologists
    console.log('Test submitted!', {
      consultationType: this.selectedConsultationType,
      consultationFormat: this.selectedConsultationFormat,
      gender: this.selectedGender,
      answers: this.answers
    });
    // Navigate to a results page or display results directly
    this.router.navigate(['/tabs/tab1']); // Placeholder navigation
  }

  onCheckboxChange(questionId: string, optionValue: any, isChecked: boolean) {
    if (!this.answers[questionId]) {
      this.answers[questionId] = [];
    }
    if (isChecked) {
      this.answers[questionId].push(optionValue);
    } else {
      this.answers[questionId] = this.answers[questionId].filter((value: any) => value !== optionValue);
    }
  }

  get currentQuestions() {
    if (this.currentStep() <= 3 || !this.testQuestions || this.selectedConsultationType === null) {
      return null;
    }
    const stepKey = (this.currentStep() - 3).toString();
    const questionsForType = this.testQuestions.step[stepKey]?.[this.selectedConsultationType];
    if (questionsForType) {
      return Object.values(questionsForType);
    }
    return null;
  }

  handleRefresh(event: RefresherCustomEvent) {
    window.location.reload(); // Perform a full page reload
    event.detail.complete(); // Complete the refresher animation
  }
}
