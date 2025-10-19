export interface QuizListItem {
  id: number;
  title: string;
  preview: string;
  duration_minutes: number;
  image_url: string;
}

export type AnswerType = 'yes_no' | 'yes_no_sometimes' | 'custom';

export interface QuizQuestionOption {
  id: string | number;
  label: string;
  weight?: number; // 0..1
}

export interface QuizQuestion {
  id: string | number;
  text: string;
  type: AnswerType;
  options?: QuizQuestionOption[];
  multiple?: boolean;
}

export interface QuizResultBand {
  min: number; // 1
  max: number; // 33 | 66 | 100
  text: string;
}

export interface QuizFull extends QuizListItem {
  questions: QuizQuestion[];
  results_bands: QuizResultBand[]; // три діапазони
}
