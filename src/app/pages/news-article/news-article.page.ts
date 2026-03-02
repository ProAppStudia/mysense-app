import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner, IonIcon, IonButton } from '@ionic/angular/standalone';
import { NewsArticle, NewsArticleDoctor, NewsService } from '../../services/news.service';
import { addIcons } from 'ionicons';
import { shareSocialOutline, heartOutline, eyeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-news-article',
  templateUrl: './news-article.page.html',
  styleUrls: ['./news-article.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner, IonIcon, IonButton]
})
export class NewsArticlePage implements OnInit {
  loading = false;
  error = '';
  article: NewsArticle | null = null;
  articleDoctor: NewsArticleDoctor | null = null;

  constructor(private route: ActivatedRoute, private newsService: NewsService, private router: Router) {
    addIcons({ shareSocialOutline, heartOutline, eyeOutline });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const articleId = Number(params.get('id') || 0);
      if (!articleId) {
        this.error = 'Новину не знайдено.';
        return;
      }
      this.loadArticle(articleId);
    });
  }

  get articleContentParts(): string[] {
    const a = this.article;
    if (!a) {
      return [];
    }
    return [
      a.text_before_banner,
      a.text_banner,
      a.text_after_banner,
      a.text_after_img,
      a.text_after_purple_banner,
      a.text_white_banner,
      a.text_after_white_banner
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  get authorPhoto(): string {
    const raw = String(this.article?.photo || '').trim();
    return this.resolvePhoto(raw);
  }

  get cardDoctorPhoto(): string {
    const raw = String(this.articleDoctor?.image || '').trim();
    if (raw) {
      return this.resolvePhoto(raw);
    }
    return this.authorPhoto;
  }

  get doctorFullname(): string {
    return String(this.articleDoctor?.fullname || this.article?.fullname || 'Психолог My Sense');
  }

  get doctorSpecialisation(): string {
    return String(this.articleDoctor?.specialisation || '').trim();
  }

  get doctorPracticeYears(): string {
    const years = this.articleDoctor?.practice_years;
    return years === null || years === undefined || years === '' ? '' : String(years);
  }

  get doctorOnline(): boolean {
    const source = String(this.articleDoctor?.work_type || '').toLowerCase();
    return source.includes('online') || source.includes('онлайн');
  }

  get doctorInPerson(): boolean {
    const source = String(this.articleDoctor?.work_type || '').toLowerCase();
    return source.includes('offline') || source.includes('очно');
  }

  openDoctorProfile(): void {
    const doctorId = Number(this.articleDoctor?.id || 0);
    if (!doctorId) {
      return;
    }
    this.router.navigate(['therapist-profile', doctorId]);
  }

  private resolvePhoto(raw: string): string {
    if (!raw) {
      return 'assets/icon/favicon.png';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `https://mysense.care${raw}`;
    }
    return `https://mysense.care/${raw}`;
  }

  shareArticle(): void {
    const articleId = Number(this.article?.article_id || 0);
    if (!articleId) {
      return;
    }
    const url = `https://mysense.care/app/connector.php?action=get_news&article_id=${articleId}`;
    const title = String(this.article?.title || 'Стаття');

    if (navigator.share) {
      navigator.share({ title, url }).catch(() => void 0);
      return;
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => void 0);
    }
  }

  private loadArticle(articleId: number): void {
    this.loading = true;
    this.error = '';
    this.article = null;

    this.newsService.getNewsArticle(articleId).subscribe({
      next: (resp) => {
        if (!resp?.success || !resp.article) {
          this.error = 'Новину не знайдено.';
          this.loading = false;
          return;
        }
        this.article = resp.article;
        this.articleDoctor = Array.isArray(resp.doctor) && resp.doctor.length ? resp.doctor[0] : null;
        this.loading = false;
      },
      error: () => {
        this.error = 'Не вдалося завантажити новину.';
        this.loading = false;
      }
    });
  }
}
