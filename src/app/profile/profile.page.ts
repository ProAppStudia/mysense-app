import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, IonButtons, ModalController } from '@ionic/angular/standalone';
import { RegisterPage } from '../register/register.page';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonCard, IonCardContent, IonButton, IonList, IonItem, IonIcon, IonLabel,
    IonHeader, IonToolbar, IonTitle, IonModal, IonInput, IonSpinner, IonText, IonButtons,
    CommonModule, FormsModule, ReactiveFormsModule, RegisterPage
  ]
})
export class ProfilePage implements OnInit {
  loginOpen = signal(false);
  loading = signal(false);
  errorMsg = signal<string | null>(null);
  isLoggedIn = signal(false);
  passwordVisible = signal(false);

  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
  });

  constructor(
    private modalController: ModalController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
  }

  async openRegisterModal() {
    const modal = await this.modalController.create({
      component: RegisterPage,
      cssClass: 'register-modal'
    });
    return await modal.present();
  }

  openLoginModal() {
    this.loginOpen.set(true);
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
  }

  closeLoginModal() {
    this.loginOpen.set(false);
    this.errorMsg.set(null);
    this.loginForm.reset();
    this.passwordVisible.set(false);
  }

  onSubmitLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);

    const { email, password } = this.loginForm.value;

    if (email && password) {
      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.isLoggedIn.set(true);
            this.closeLoginModal();
          } else {
            this.errorMsg.set(response.message || 'Login failed. Please try again.');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMsg.set('An unexpected error occurred. Please try again later.');
          console.error('Login error:', err);
        }
      });
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn.set(false);
    console.log('User logged out');
  }

  togglePasswordVisibility() {
    this.passwordVisible.update(value => !value);
  }
}
