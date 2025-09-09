import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonContent, IonButton, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Tab1Page implements OnInit, AfterViewInit {
  @ViewChild('articlesSwiper')
  swiperEl?: ElementRef;

  homepageData: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.getHomepageData();
  }

  ngAfterViewInit() {
    if (this.swiperEl) {
      this.swiperEl.nativeElement.addEventListener('swiperinit', () => {
        if (this.swiperEl && this.swiperEl.nativeElement.swiper) {
          this.swiperEl.nativeElement.swiper.update();
        }
      });
    }
  }

  getHomepageData() {
    this.http.get('https://mysense.care/app/connector.php?action=get_homepage').subscribe((data) => {
      this.homepageData = data;
      console.log(this.homepageData);
    });
  }
}
