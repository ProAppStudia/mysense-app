import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NewsListItem {
  id: number;
  url?: string;
  title: string;
  short_description: string;
  image: string;
  date: string;
}

export interface NewsListResponse {
  results: NewsListItem[];
  total_pages: number;
  total_articles: number;
  current_page: number;
  is_doctor?: boolean;
}

export interface NewsArticle {
  article_id: number;
  fullname?: string;
  photo?: string;
  liked?: number;
  viewed?: number;
  title: string;
  date: string;
  image: string;
  short_description?: string;
  description?: string;
  text_before_banner?: string;
  text_banner?: string;
  text_after_banner?: string;
  text_after_img?: string;
  text_purple_banner?: string;
  text_after_purple_banner?: string;
  text_white_banner?: string;
  text_after_white_banner?: string;
}

export interface NewsArticleDoctor {
  id: number;
  user_id?: number;
  hash?: string;
  fullname?: string;
  specialisation?: string;
  practice_years?: number | string;
  work_type?: string;
  image?: string;
}

export interface NewsArticleResponse {
  success: boolean;
  article?: NewsArticle;
  doctor?: NewsArticleDoctor[];
  related_articles?: NewsListItem[];
}

@Injectable({
  providedIn: 'root'
})
export class NewsService {
  constructor(private http: HttpClient) {}

  getNewsList(page = 1): Observable<NewsListResponse> {
    let params = new HttpParams().set('action', 'get_news').set('page', String(page));
    return this.http.get<NewsListResponse>(`${environment.baseUrl}/connector.php`, { params });
  }

  getNewsArticle(articleId: number): Observable<NewsArticleResponse> {
    const params = new HttpParams()
      .set('action', 'get_news')
      .set('article_id', String(articleId));
    return this.http.get<NewsArticleResponse>(`${environment.baseUrl}/connector.php`, { params });
  }
}
