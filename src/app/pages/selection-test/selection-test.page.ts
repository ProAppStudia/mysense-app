import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController, LoadingController } from '@ionic/angular';
import { DoctorService } from '../../services/doctor.service';

type View = 'type' | 'info' | 'step' | 'results';

interface TestOption { id?: string | number; value?: any; text?: string; name?: string; }
interface TestStepNode {
  header?: string;
  subheader?: string;
  required?: 0 | 1;
  type: 'radio' | 'checkbox' | 'range' | 'text';
  step_type: string;          // ключ у answers
  options?: TestOption[] | {min:number; max:number};
  cities?: Array<{city_id:number; name:string}>; // якщо є
  next_step_need_id?: string; // умовні переходи
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
  city_id?: number;             // коли формат = offline
  child_age?: number;           // для типу 3
  [step_type: string]: any;     // значення кожного кроку
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
  schema: TestSchemaResponse | null = null;
  answers: Answers = { type: null as any }; // Initialize with type as null, will be set by pickType
  loading = signal<boolean>(false);
  results: any[] = [];

  constructor(
    private api: DoctorService,
    private toast: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.loadSchema();
  }

  async loadSchema() {
    this.loading.set(true);
    try {
      this.schema = await this.api.loadTestSchema().toPromise();
    } catch (e) { this.showErr(); }
    finally { this.loading.set(false); }
  }

  pickType(id: number) {
    this.answers = { type: id };
    this.view.set('info');
    console.log('Selected Consultation Type:', id);
    console.log('Current Answers:', this.answers);
  }

  startTest() {
    this.currentStep.set(1);
    this.view.set('step');
    console.log('Starting Test. Current Step:', this.currentStep());
    console.log('Current Answers:', this.answers);
  }

  get node(): TestStepNode | null {
    const step = this.currentStep();
    const type = this.answers.type;
    return this.schema?.step?.[step]?.[type] ?? null;
  }

  setRadio(stepType: string, value: any) {
    this.answers[stepType] = value;
    console.log(`Answered ${stepType}:`, value);
    console.log('Current Answers:', this.answers);
  }
  toggleCheckbox(stepType: string, value: any) {
    const arr = this.answers[stepType] ?? [];
    const idx = arr.indexOf(value);
    if (idx === -1) arr.push(value); else arr.splice(idx, 1);
    this.answers[stepType] = [...arr];
    console.log(`Toggled ${stepType}:`, value);
    console.log('Current Answers:', this.answers);
  }

  setRange(stepType: string, value: number | { lower: number, upper: number }) {
    if (stepType === 'price') {
      const lower = typeof value === 'number' ? value : value.lower;
      const upper = typeof value === 'number' ? value : value.upper;
      this.answers['min_price'] = String(lower);
      this.answers['max_price'] = String(upper);
      delete this.answers['price']; // Remove the 'price' object if it exists
      console.log(`Set Range for ${stepType}: min_price="${this.answers['min_price']}", max_price="${this.answers['max_price']}"`);
    } else {
      this.answers[stepType] = typeof value === 'number' ? value : value.upper; // For other ranges, assume single value
      console.log(`Set Range for ${stepType}:`, this.answers[stepType]);
    }
    console.log('Current Answers:', this.answers);
  }
  setText(stepType: string, value: string) {
    this.answers[stepType] = value;
    console.log(`Set Text for ${stepType}:`, value);
    console.log('Current Answers:', this.answers);
  }

  setCity(value: number) {
    this.answers.city_id = value;
    console.log('Selected City ID:', value);
    console.log('Current Answers:', this.answers);
  }
  setChildAge(value: number) {
    this.answers.child_age = value;
    console.log('Set Child Age:', value);
    console.log('Current Answers:', this.answers);
  }

  getRangeMin(node: TestStepNode): number | undefined {
    return (node.options && 'min' in node.options) ? node.options.min : undefined;
  }

  getRangeMax(node: TestStepNode): number | undefined {
    return (node.options && 'max' in node.options) ? node.options.max : undefined;
  }

  validate(node: TestStepNode): boolean {
    if (!node) return false;
    const v = this.answers[node.step_type];
    if (node.required) {
      if (node.type === 'checkbox') return Array.isArray(v) && v.length > 0;
      if (node.type === 'text') return typeof v === 'string' && v.trim().length > 0;
      return v !== undefined && v !== null && v !== '';
    }
    // додаткова перевірка для offline
    if (node.step_type === 'format' && this.answers['format'] === 'offline') {
      return !!this.answers.city_id;
    }
    return true;
  }

  nextStep() {
    // якщо фінальний
    if (this.node?.is_final) { this.submit(); return; }
    let s = this.currentStep() + 1;
    // пропускаємо неіснуючі кроки для цього type
    while (this.schema?.step?.[s] && !this.schema.step[s][this.answers.type]) { s++; }
    this.currentStep.set(s);
  }

  prevStep() {
    let s = this.currentStep() - 1;
    while (s > 0 && this.schema?.step?.[s] && !this.schema.step[s][this.answers.type]) { s--; }
    if (s <= 0) { this.view.set('type'); return; } // Go back to type selection if step is 0 or less
    this.currentStep.set(s);
  }

  async submit() {
    const payload = this.buildPayload();
    console.log('Submitting Payload:', payload); // Log the final payload
    this.loading.set(true);
    try {
      this.results = (await this.api.postResults(payload).toPromise()) ?? [];
      this.view.set('results');
    } catch (e) { this.showErr(); }
    finally { this.loading.set(false); }
  }

  buildPayload() {
    const { type, city_id, child_age, min_price, max_price, ...rest } = this.answers; // Destructure min_price and max_price
    const requests: any = {};
    const filter_data: any = {};
    Object.entries(rest).forEach(([k, v]) => {
      if (k.startsWith('questions_')) {
        requests[k] = v;
      } else {
        filter_data[k] = v;
      }
    });
    // Add min_price and max_price to filter_data if they exist
    if (min_price !== undefined) filter_data['min_price'] = min_price;
    if (max_price !== undefined) filter_data['max_price'] = max_price;

    const body: any = { type, filter_data };
    if (city_id) body.city_id = city_id;
    if (child_age) body.child_age = child_age;
    if (Object.keys(requests).length) body.requests = requests;
    return body;
  }

  async showErr() {
    const t = await this.toast.create({ message: 'Сталася помилка, спробуйте пізніше', duration: 2500, color: 'danger' });
    t.present();
  }

  resetAll() {
    this.answers = { type: null as any };
    this.results = [];
    this.currentStep.set(0);
    this.view.set('type');
  }
}
