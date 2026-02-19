import { Component, OnInit, AfterViewInit, CUSTOM_ELEMENTS_SCHEMA, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton } from '@ionic/angular/standalone';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'app-how-to-use',
  templateUrl: './how-to-use.page.html',
  styleUrls: ['./how-to-use.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonButtons, IonBackButton],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class HowToUsePage implements OnInit, AfterViewInit {
  @ViewChild('howItWorksSwiper') howItWorksSwiper?: ElementRef;

  constructor() { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    if (this.howItWorksSwiper) {
      this.howItWorksSwiper.nativeElement.addEventListener('swiperinit', () => {
        if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
          this.howItWorksSwiper.nativeElement.swiper.update();
        }
      });
    }
  }

  slidePrevHowItWorks() {
    if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
      this.howItWorksSwiper.nativeElement.swiper.slidePrev();
    }
  }

  slideNextHowItWorks() {
    if (this.howItWorksSwiper && this.howItWorksSwiper.nativeElement.swiper) {
      this.howItWorksSwiper.nativeElement.swiper.slideNext();
    }
  }
}
