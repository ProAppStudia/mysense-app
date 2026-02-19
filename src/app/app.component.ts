import { Component, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnDestroy {
  isPreloaderHiding = false;
  isPreloaderHidden = false;

  private hideTimer: ReturnType<typeof setTimeout>;
  private removeTimer: ReturnType<typeof setTimeout>;

  constructor() {
    this.hideTimer = setTimeout(() => {
      this.isPreloaderHiding = true;
    }, 2200);

    this.removeTimer = setTimeout(() => {
      this.isPreloaderHidden = true;
    }, 2700);
  }

  ngOnDestroy(): void {
    clearTimeout(this.hideTimer);
    clearTimeout(this.removeTimer);
  }
}
