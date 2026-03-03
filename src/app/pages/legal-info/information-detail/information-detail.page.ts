import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonText
} from '@ionic/angular/standalone';
import { environment } from '../../../../environments/environment';

interface LegalInformationDetail {
  id: number;
  title: string;
  content: string;
  isPdf: boolean;
  pdfUrl: string;
}

@Component({
  selector: 'app-information-detail',
  templateUrl: './information-detail.page.html',
  styleUrls: ['./information-detail.page.scss'],
  standalone: true,
  imports: [
    IonBackButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonSpinner,
    IonTitle,
    IonToolbar,
    IonText,
    CommonModule,
    FormsModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class InformationDetailPage implements OnInit, AfterViewInit, OnDestroy {
  detail = signal<LegalInformationDetail | null>(null);
  loading = signal(false);
  errorText = signal('');
  pdfLoading = signal(false);
  pdfErrorText = signal('');
  isPdfReady = signal(false);
  safePdfUrl = signal<SafeResourceUrl | null>(null);

  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;

  private readonly pdfCdnUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
  private readonly pdfWorkerCdnUrl = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  private isAlive = true;
  private pdfRenderRetries = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngAfterViewInit(): void {
    this.tryRenderPdf();
  }

  ngOnDestroy(): void {
    this.isAlive = false;
  }

  ngOnInit(): void {
    const informationId = Number(this.route.snapshot.paramMap.get('informationId') || 0);
    if (!informationId) {
      this.errorText.set('Сторінку не знайдено.');
      return;
    }
    if (informationId === 106) {
      void this.router.navigate(['/legal-info']);
      return;
    }
    this.loadInformation(informationId);
  }

  private loadInformation(informationId: number): void {
    this.loading.set(true);
    this.errorText.set('');

    const url = `${environment.baseUrl}/connector.php?action=get_informations&information_id=${informationId}`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.loading.set(false);
        const mapped = this.mapDetail(response, informationId);
        if (!mapped) {
          this.errorText.set('Сторінку не знайдено.');
          return;
        }
        this.detail.set(mapped);
        this.safePdfUrl.set(mapped.pdfUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(mapped.pdfUrl) : null);
        this.pdfRenderRetries = 0;
        this.tryRenderPdf();
      },
      error: () => {
        this.loading.set(false);
        this.errorText.set('Не вдалося завантажити сторінку.');
      }
    });
  }

  private mapDetail(response: any, fallbackId: number): LegalInformationDetail | null {
    const raw = this.extractDetail(response);
    if (!raw) {
      return null;
    }

    const id = Number(raw?.information_id ?? raw?.id ?? fallbackId);
    const title = String(raw?.title ?? raw?.name ?? raw?.heading ?? `Документ №${id}`).trim();
    const content = String(raw?.content ?? raw?.description ?? raw?.text ?? '').trim();
    const isPdf = this.toBool(raw?.is_pdf);
    const pdfPath = String(
      raw?.pdf ??
      raw?.pdf_url ??
      raw?.pdfUrl ??
      raw?.pdf_file ??
      raw?.file ??
      raw?.file_url ??
      raw?.fileUrl ??
      raw?.path ??
      raw?.document ??
      raw?.document_url ??
      raw?.url ??
      ''
    ).trim();
    const deepPdfPath =
      this.findPdfPath(raw) ||
      this.findPdfPath(response) ||
      this.findDocumentPathByKey(raw) ||
      this.findDocumentPathByKey(response);

    return {
      id,
      title,
      content,
      isPdf,
      pdfUrl: this.normalizeUrl(pdfPath || deepPdfPath)
    };
  }

  private extractDetail(response: any): any {
    if (!response) {
      return null;
    }
    if (Array.isArray(response)) {
      return response[0] ?? null;
    }
    const candidates = [
      response?.information,
      response?.item,
      response?.result,
      response?.data
    ];
    const foundObject = candidates.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    if (foundObject) {
      return foundObject;
    }
    const foundArray = candidates.find((item) => Array.isArray(item));
    if (Array.isArray(foundArray)) {
      return foundArray[0] ?? null;
    }
    return typeof response === 'object' ? response : null;
  }

  private normalizeUrl(path: string): string {
    const raw = String(path || '').trim();
    if (!raw) {
      return '';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `https://mysense.care${raw}`;
    }
    return `https://mysense.care/${raw}`;
  }

  private toBool(value: any): boolean {
    if (value === true || value === 1 || value === '1') {
      return true;
    }
    return String(value ?? '').toLowerCase() === 'true';
  }

  private findPdfPath(source: any): string {
    const visited = new Set<any>();
    const queue: any[] = [source];

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (typeof current === 'string') {
        const value = current.trim();
        if (this.looksLikePdfPath(value)) {
          return value;
        }
        continue;
      }

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      if (typeof current === 'object') {
        for (const key of Object.keys(current)) {
          const value = current[key];
          if (typeof value === 'string' && this.looksLikePdfPath(value.trim())) {
            return value.trim();
          }
          queue.push(value);
        }
      }
    }

    return '';
  }

  private looksLikePdfPath(value: string): boolean {
    if (!value) {
      return false;
    }
    const low = value.toLowerCase();
    return low.endsWith('.pdf') || low.includes('.pdf?');
  }

  private findDocumentPathByKey(source: any): string {
    const visited = new Set<any>();
    const queue: any[] = [source];
    const keyPattern = /(pdf|document|doc|file|path|attachment|link|url)/i;

    while (queue.length) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      if (Array.isArray(current)) {
        queue.push(...current);
        continue;
      }

      if (typeof current !== 'object') {
        continue;
      }

      for (const key of Object.keys(current)) {
        const value = current[key];
        if (typeof value === 'string' && keyPattern.test(key)) {
          const v = value.trim();
          if (this.looksLikeLink(v)) {
            return v;
          }
        } else {
          queue.push(value);
        }
      }
    }

    return '';
  }

  private looksLikeLink(value: string): boolean {
    if (!value) {
      return false;
    }
    return (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/') ||
      value.startsWith('files/') ||
      value.startsWith('assets/') ||
      value.startsWith('uploads/')
    );
  }

  private tryRenderPdf(): void {
    const info = this.detail();
    const container = this.pdfContainer?.nativeElement;
    if (!this.isAlive || !info || !info.isPdf || !!info.content || !info.pdfUrl) {
      return;
    }
    if (!container) {
      if (this.pdfRenderRetries < 8) {
        this.pdfRenderRetries += 1;
        setTimeout(() => this.tryRenderPdf(), 40);
      }
      return;
    }
    void this.renderPdf(info.pdfUrl, container);
  }

  private async renderPdf(pdfUrl: string, container: HTMLDivElement): Promise<void> {
    this.pdfLoading.set(true);
    this.pdfErrorText.set('');
    this.isPdfReady.set(false);
    container.innerHTML = '';

    try {
      const pdfjsLib: any = await import(/* webpackIgnore: true */ this.pdfCdnUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = this.pdfWorkerCdnUrl;

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          continue;
        }
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.style.marginBottom = '12px';

        await page.render({ canvasContext: context, viewport }).promise;
        container.appendChild(canvas);
      }

      this.isPdfReady.set(container.childElementCount > 0);
      if (!this.isPdfReady()) {
        this.pdfErrorText.set('Не вдалося відобразити PDF.');
      }
    } catch {
      this.pdfErrorText.set('Не вдалося завантажити PDF у додатку.');
    } finally {
      this.pdfLoading.set(false);
    }
  }
}
