import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { IonContent, IonButton, IonAccordionGroup, IonAccordion, IonItem, IonLabel } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { register } from 'swiper/element/bundle';

register();

interface Doctor {
  img: string;
  firstname: string;
  practice_years_text: string;
}

interface HomepageData {
  section_1: {
    heading: string;
    sub_heading: string;
    button_test_text: string;
    text_choise_psyhologist: string;
  };
  doctors: Doctor[];
  section_3: {
    heading_acquaintance: string;
    text_acquaintance: string;
  };
  section_8: {
    heading: string;
    sub_heading: string;
    cities: { name: string }[];
    img: string;
  };
  section_9: {
    heading: string;
    reviews: { text: string; date: string; user_name: string }[];
  };
  section_10: {
    heading: string;
    items: { heading: string; content: string }[];
    text_button: string;
  };
  section_11: {
    heading: string;
    articles: { title: string }[];
  };
}

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, IonButton, CommonModule, IonAccordionGroup, IonAccordion, IonItem, IonLabel],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit {
  @ViewChild('articlesSwiper') articlesSwiper?: ElementRef;
  @ViewChild('reviewsSwiper') reviewsSwiper?: ElementRef;

  homepageData: HomepageData | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getHomepageData();
  }

  ngAfterViewInit() {
    if (this.articlesSwiper) {
      this.articlesSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.articlesSwiper && this.articlesSwiper.nativeElement.swiper) {
          this.articlesSwiper.nativeElement.swiper.update();
        }
      });
    }

    if (this.reviewsSwiper) {
      this.reviewsSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.reviewsSwiper && this.reviewsSwiper.nativeElement.swiper) {
          this.reviewsSwiper.nativeElement.swiper.update();
        }
      });
    }
  }

  getHomepageData() {
    this.http.get<HomepageData>('https://mysense.care/app/connector.php?action=get_homepage').subscribe((data) => {
      this.homepageData = data;
      console.log(this.homepageData);
    });
  }
}
