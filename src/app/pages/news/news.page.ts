import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { NewsListItem, NewsService } from '../../services/news.service';
import { firstValueFrom } from 'rxjs';

type NewsSort = 'newest' | 'oldest';

@Component({
  selector: 'app-news',
  templateUrl: './news.page.html',
  styleUrls: ['./news.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonSpinner]
})
export class NewsPage implements OnInit {
  loading = false;
  error = '';
  sort: NewsSort = 'newest';
  sortMenuOpen = false;

  allArticles: NewsListItem[] = [];
  articles: NewsListItem[] = [];
  pageSize = 6;
  currentPage = 1;
  totalPages = 1;

  constructor(private newsService: NewsService, private router: Router) {}

  ngOnInit(): void {
    this.loadNews(1);
  }

  async loadNews(page: number): Promise<void> {
    if (this.allArticles.length > 0) {
      this.currentPage = Math.min(Math.max(1, page), this.totalPages);
      this.updateVisibleArticles();
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const first = await firstValueFrom(this.newsService.getNewsList(1));
      const firstResults = Array.isArray(first?.results) ? first.results : [];
      const pagesCount = Math.max(1, Number(first?.total_pages || 1));
      this.pageSize = firstResults.length > 0 ? firstResults.length : 6;

      const merged: NewsListItem[] = [...firstResults];
      for (let p = 2; p <= pagesCount; p++) {
        const pageResp = await firstValueFrom(this.newsService.getNewsList(p));
        const pageItems = Array.isArray(pageResp?.results) ? pageResp.results : [];
        merged.push(...pageItems);
      }

      this.allArticles = merged;
      this.totalPages = Math.max(1, Math.ceil(this.allArticles.length / this.pageSize));
      this.currentPage = Math.min(Math.max(1, page), this.totalPages);
      this.updateVisibleArticles();
    } catch {
      this.error = 'Не вдалося завантажити статті.';
    } finally {
      this.loading = false;
    }
  }

  changeSort(nextSort: NewsSort): void {
    if (this.sort === nextSort) {
      this.sortMenuOpen = false;
      return;
    }
    this.sort = nextSort;
    this.currentPage = 1;
    this.updateVisibleArticles();
    this.sortMenuOpen = false;
  }

  toggleSortMenu(): void {
    this.sortMenuOpen = !this.sortMenuOpen;
  }

  get sortLabel(): string {
    return this.sort === 'oldest' ? 'Давні статті' : 'Найновіші';
  }

  prevPage(): void {
    if (this.currentPage <= 1 || this.loading) {
      return;
    }
    this.currentPage--;
    this.updateVisibleArticles();
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages || this.loading) {
      return;
    }
    this.currentPage++;
    this.updateVisibleArticles();
  }

  openArticle(articleId: number): void {
    if (!articleId) {
      return;
    }
    void this.router.navigate(['/tabs/news', articleId]);
  }

  private sortArticles(items: NewsListItem[]): NewsListItem[] {
    const sorted = [...items].sort((a, b) => Number(b.id) - Number(a.id));
    return this.sort === 'oldest' ? sorted.reverse() : sorted;
  }

  private updateVisibleArticles(): void {
    const sorted = this.sortArticles(this.allArticles);
    const start = (this.currentPage - 1) * this.pageSize;
    this.articles = sorted.slice(start, start + this.pageSize);
  }
}
