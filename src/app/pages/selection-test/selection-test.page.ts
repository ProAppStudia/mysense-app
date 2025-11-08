import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController, IonIcon } from '@ionic/angular';
import { DoctorService } from '../../services/doctor.service';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import { chevronDownOutline } from 'ionicons/icons';

type View = 'type' | 'info' | 'step' | 'processing' | 'results';

interface TestOption { id?: string | number; value?: any; text?: string; name?: string; }
interface TestStepNode {
  header?: string;
  subheader?: string;
  required?: 0 | 1;
  type: 'radio' | 'checkbox' | 'range' | 'text';
  step_type: string;          // ключ у answers
  options?: TestOption[] | {min:number; max:number};
  cities?: Array<{city_id:number; name:string}>; // якщо є
  next_step_need_id?: string; // условные переходы
  fill_field_request?: boolean;
  is_final?: boolean;
}
type StepsTree = Record<number, Record<number, TestStepNode>>; // step[stepNumber][consultationType]

interface TestSchemaResponse {
  types: Record<number, string>;
  step: StepsTree;
}

type Answers = {
  type: number;                 // 1|2|3
  city_id?: number;             // когда формат = offline
  child_age?: number;           // для типу 3
  min_price?: number;           // Change to number
  max_price?: number;           // Change to number
  format?: string;              // Add format
  [key: string]: any;           // Allow dynamic access for other properties
};

@Component({
  selector: 'app-selection-test',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './selection-test.page.html',
  styleUrls: ['./selection-test.page.scss']
})
export class SelectionTestPage implements OnInit {
  view = signal<View>('type');
  currentStep = signal<number>(0);
  visualStep = signal<number>(0); // New signal for visual pagination
  schema: TestSchemaResponse | null = null;
  cityDropdownOpen = false; // New property for dropdown state

  totalVisualSteps = computed(() => {
    const currentAnswers = this.answers(); // Access the signal's value
    const type = currentAnswers.type;
    let steps = 16; // Default
    if (type === 3) { // Child type
      steps = 12;
    } else if (type === 2) { // Family type
      steps = 13;
    }
    return steps;
  });

  visualStepsArray = computed(() => {
    return Array(this.totalVisualSteps()).fill(0);
  });
  answers = signal<Answers>({ type: null as any }); // Initialize with type as null, will be set by pickType
  loading = signal<boolean>(false);
  results: any[] = [];
  meta: {
    doctor_counts: number;
    test_token: string;
    is_doctor: boolean;
  } = { doctor_counts: 0, test_token: '', is_doctor: false };

  constructor(
    private api: DoctorService,
    private toast: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router
  ) {
    addIcons({ chevronDownOutline });
  }

  async ngOnInit() {
    await this.loadSchema();
  }

  async loadSchema() {
    this.loading.set(true);
    try {
      this.schema = await this.api.loadTestSchema().toPromise();
    } catch (e) {
      console.error('Error loading test schema:', e);
      this.showErr();
    } finally {
      this.loading.set(false);
    }
  }

  pickType(id: number) {
    this.answers.update(ans => ({ ...ans, type: id })); // Update the signal
    this.visualStep.set(1); // Set visualStep to 1 for the 'info' view
    this.view.set('info');
    console.log('Selected Consultation Type:', id);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }

  startTest() {
    this.currentStep.set(1);
    this.visualStep.set(2); // Set visualStep to 2 for the first actual test step
    this.view.set('step');
    console.log('Starting Test. Current Step:', this.currentStep());
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }

  get node(): TestStepNode | null {
    const step = this.currentStep();
    const type = this.answers().type; // Access the signal's value
    return this.schema?.step?.[step]?.[type] ?? null;
  }

  setRadio(stepType: string, value: any) {
    this.answers.update(ans => ({ ...ans, [stepType]: value })); // Update the signal
    console.log(`Answered ${stepType}:`, value);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }
  toggleCheckbox(stepType: string, value: any) {
    const currentAnswers = this.answers(); // Access the signal's value
    const arr = currentAnswers[stepType] ?? [];
    const idx = arr.indexOf(value);
    if (idx === -1) arr.push(value); else arr.splice(idx, 1);
    this.answers.update(ans => ({ ...ans, [stepType]: [...arr] })); // Update the signal
    console.log(`Toggled ${stepType}:`, value);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }

  setRange(stepType: string, value: number | { lower: number, upper: number }) {
    if (stepType === 'price') {
      const lower = typeof value === 'number' ? Number(value) : Number(value.lower);
      const upper = typeof value === 'number' ? Number(value) : Number(value.upper);
      this.answers.update(ans => ({
        ...ans,
        min_price: lower,
        max_price: upper,
        price: undefined
      }));
      console.log(`Set Range for ${stepType}: min_price="${this.answers().min_price}", max_price="${this.answers().max_price}"`);
    } else {
      this.answers.update(ans => ({
        ...ans,
        [stepType]: typeof value === 'number' ? Number(value) : Number(value.upper)
      }));
      console.log(`Set Range for ${stepType}:`, this.answers()[stepType]);
    }
    console.log('Current Answers:', this.answers());
  }
  setText(stepType: string, value: string) {
    this.answers.update(ans => ({ ...ans, [stepType]: value })); // Update the signal
    console.log(`Set Text for ${stepType}:`, value);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }

  setCity(value: number) {
    this.answers.update(ans => ({ ...ans, city_id: value })); // Update the signal
    this.cityDropdownOpen = false; // Close the dropdown after selection
    console.log('Selected City ID:', value);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }
  setChildAge(value: number) {
    this.answers.update(ans => ({ ...ans, child_age: value })); // Update the signal
    console.log('Set Child Age:', value);
    console.log('Current Answers:', this.answers()); // Log the signal's value
  }

  toggleCityDropdown() {
    this.cityDropdownOpen = !this.cityDropdownOpen;
  }

  getCityName(cityId: number | undefined): string {
    if (cityId === undefined) {
      return 'Оберіть місто';
    }
    const city = this.node?.cities?.find(c => c.city_id === cityId);
    return city ? city.name : 'Оберіть місто';
  }

  getRangeMin(node: TestStepNode): number {
    return (node.options && 'min' in node.options) ? node.options.min : 0; // Return 0 as default
  }

  getRangeMax(node: TestStepNode): number {
    return (node.options && 'max' in node.options) ? node.options.max : 0; // Return 0 as default
  }

  getOptionsAsArray(node: TestStepNode): TestOption[] {
    return (node.options && !('min' in node.options)) ? (node.options as TestOption[]) : [];
  }

  validate(node: TestStepNode): boolean {
    if (!node) return false;
    const currentAnswers = this.answers(); // Access the signal's value
    const v = currentAnswers[node.step_type];

    // Explicitly make 'client_age', 'format', 'gender', 'language', and 'doctor_age' mandatory
    if (node.step_type === 'client_age' || node.step_type === 'format' || node.step_type === 'gender' || node.step_type === 'language' || node.step_type === 'doctor_age') {
      return v !== undefined && v !== null && v !== '';
    }

    if (node.required) {
      if (node.type === 'checkbox') return Array.isArray(v) && v.length > 0;
      if (node.type === 'text') return typeof v === 'string' && v.trim().length > 0;
      return v !== undefined && v !== null && v !== '';
    }
    // дополнительная проверка для offline
    if (node.step_type === 'format' && currentAnswers['format'] === 'offline') {
      return !!currentAnswers.city_id;
    }
    return true;
  }

  nextStep() {
    let nextStepNumber = this.currentStep() + 1;
    // пропускаем несуществующие шаги для этого type
    while (this.schema?.step?.[nextStepNumber] && !this.schema.step[nextStepNumber][this.answers().type]) {
      nextStepNumber++;
    }

    // Check if the next step is the final one
    if (this.schema?.step?.[nextStepNumber]?.[this.answers().type]?.is_final) {
      this.submit();
      return;
    }

    this.currentStep.set(nextStepNumber);
    this.visualStep.set(this.visualStep() + 1); // Increment visualStep
  }

  prevStep() {
    let s = this.currentStep() - 1;
    while (s > 0 && this.schema?.step?.[s] && !this.schema.step[s][this.answers().type]) { s--; } // Access the signal's value
    if (s <= 0) {
      this.visualStep.set(0); // Reset visualStep to 0 for the 'type' view
      this.view.set('type');
      return;
    }
    this.currentStep.set(s);
    this.visualStep.set(this.visualStep() - 1); // Decrement visualStep
  }

  async submit() {
    const payload = this.buildPayload();
    console.log('Submitting Payload:', payload); // Log the final payload
    this.loading.set(true);
    try {
      const res = await this.api.postResults(payload).toPromise();
      this.results = Array.isArray(res?.doctors) ? res.doctors.map(doc => this.api.transformToDoctorCardView(doc)) : [];  // Map to DoctorCardView
      this.meta = {
        doctor_counts: res?.doctor_counts ?? 0,
        test_token: res?.test_token ?? '',
        is_doctor: !!res?.is_doctor
      };
      this.view.set('processing'); // Set to processing view
      setTimeout(() => {
        this.view.set('results'); // After 5 seconds, show results
      }, 5000);
    } catch (e) { this.showErr(); }
    finally {
      this.loading.set(false);
    }
  }

  buildPayload() {
    const a = this.answers(); // Access the signal's value

    // собрать вопросы и фильтры в один объект filter_data
    const filter_data: any = {
      type: Number(a.type), // ПЕРЕНЕСТИ сюда!
    };

    Object.entries(a).forEach(([k, v]) => {
      if (k === 'type') return;
      if (k === 'price') return; // if there was ever a single price field
      if (k.endsWith('_texts')) return; // Exclude _texts keys

      // convert numbers where appropriate
      const mustBeInt = new Set([
        'city_id','doctor_age','language','gender','client_age','child_age','when','min_price','max_price',
        'specific', // specific is an array of numbers
        'questions_10', 'questions_11', 'questions_12', 'questions_13' // question arrays are numbers
      ]);

      // Check if the key starts with 'requests' (e.g., requests10) and treat as questions
      const isQuestionKey = k.startsWith('requests') && !k.endsWith('_texts');

      if ((mustBeInt.has(k) || isQuestionKey) && v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) {
          filter_data[k] = v.map(n => Number(v));
        } else {
          filter_data[k] = Number(v);
        }
        return;
      }

      // other keys as is (format, etc.)
      filter_data[k] = v;
    });

    // если формат offline — убедитесь, что есть city_id
    if (filter_data.format === 'offline' && !filter_data.city_id) {
      // подставьте собственную валидацию перед сабмитом
    }

    return { filter_data };
  }

  async showErr() {
    const t = await this.toast.create({ message: 'Произошла ошибка, попробуйте позже', duration: 2500, color: 'danger' });
    t.present();
  }

  resetAll() {
    this.answers.set({ type: null as any }); // Reset the signal
    this.results = [];
    this.meta = { doctor_counts: 0, test_token: '', is_doctor: false };
    this.currentStep.set(0);
    this.visualStep.set(0); // Reset visualStep
    this.view.set('type');
  }

  goToProfile(doctorId: string | number) {
    this.router.navigate(['/tabs/therapist-profile', doctorId]);
  }

  getIconForOption(stepType: string, index: number): string {
    if (stepType === 'format') {
      switch (index) {
        case 0: return 'globe-outline'; // For "Онлайн"
        case 1: return 'chatbubble-outline'; // For "Очно"
        case 2: return 'remove-outline'; // For "Неважливо"
        default: return '';
      }
    }
    return '';
  }

}
