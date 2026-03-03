import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { IonContent, IonButton, IonList, IonItem, IonIcon, IonLabel, IonInput, IonSpinner, IonText } from '@ionic/angular/standalone';
import { AuthService, UserProfile, UpdateProfilePayload } from '../services/auth.service';
import { DoctorService } from '../services/doctor.service';
import { Router, NavigationExtras, RouterLink, ActivatedRoute } from '@angular/router';
import { DoctorCardView } from '../models/doctor-card-view.model';
import { addIcons } from 'ionicons';
import {
  personCircleOutline, createOutline, calendarOutline, addCircleOutline, bookOutline, libraryOutline,
  informationCircleOutline, helpCircleOutline, notificationsOutline, headsetOutline, documentTextOutline,
  logOutOutline, warningOutline, personOutline, videocamOutline, checkboxOutline, statsChartOutline, timeOutline, peopleOutline, clipboardOutline, walletOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    IonContent, IonButton, IonList, IonItem, IonIcon, IonLabel,
    IonInput, IonSpinner, IonText,
    CommonModule, FormsModule, ReactiveFormsModule, RouterLink
  ]
})
export class ProfilePage implements OnInit {
  isLoggedIn = signal(false);
  isDoctor = signal(false);

  userSessions: any[] = [];
  doctors: DoctorCardView[] = [];
  userProfile = signal<UserProfile | null>(null);
  profileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(2)]),
    surname: new FormControl('', [Validators.required, Validators.minLength(2)]),
    email: new FormControl('', [Validators.required, Validators.email]),
    phone: new FormControl('', [Validators.required, Validators.pattern(/^\+?[0-9\s\-()]{7,25}$/)]),
    password: new FormControl('', [Validators.minLength(6)]),
    confirm: new FormControl(''),
  });
  profileLoading = signal(false);
  profileErrorMsg = signal<string | null>(null);
  profileSuccessMsg = signal<string | null>(null);
  isEditing = signal(false);
  photoUploading = signal(false);
  photoErrorMsg = signal<string | null>(null);
  pendingPhotoPath = signal<string | null>(null);
  profilePhotoPreview = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private doctorService: DoctorService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    addIcons({personCircleOutline,createOutline,calendarOutline,addCircleOutline,bookOutline,checkboxOutline,libraryOutline,informationCircleOutline,helpCircleOutline,notificationsOutline,headsetOutline,documentTextOutline,warningOutline,logOutOutline,personOutline,statsChartOutline,timeOutline,peopleOutline,clipboardOutline,walletOutline});
  }

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    if (this.isLoggedIn()) {
      this.route.queryParamMap.subscribe((params) => {
        if (params.get('edit') === '1') {
          this.isEditing.set(true);
        }
      });
      this.loadProfile();
      this.doctorService.getPsychologists().subscribe(psychologists => {
        this.doctors = psychologists;
        this.userSessions = [
          {
            id: 1,
            type: 'Індивідуальна сесія',
            status: 'Заброньована',
            doctor_name: this.doctors[0].fullName,
            doctor_image: this.doctors[0].avatarUrl,
            time_range: '20 вересня о 14:00',
            icon: 'videocam-outline'
          },
          {
            id: 2,
            type: 'Сімейна сесія',
            status: 'Оплачена',
            doctor_name: this.doctors[1].fullName,
            doctor_image: this.doctors[1].avatarUrl,
            time_range: '22 вересня о 18:00',
            icon: 'videocam-outline'
          }
        ];
      });
    }
  }

  logout() {
    this.authService.logout();
    this.isLoggedIn.set(false);
    console.log('User logged out');
  }

  viewAllSessions() {
    // Ensure doctors data is loaded before navigating
    if (this.doctors.length === 0) {
      this.doctorService.getPsychologists().subscribe(psychologists => {
        this.doctors = psychologists;
        this.navigateToSessions();
      });
    } else {
      this.navigateToSessions();
    }
  }

  private navigateToSessions() {
    const navigationExtras: NavigationExtras = {
      state: {
        sessions: this.userSessions,
        doctors: this.doctors
      }
    };
    this.router.navigate(['/sessions'], navigationExtras);
  }

  loadProfile() {
    this.profileLoading.set(true);
    this.authService.getProfile().subscribe({
      next: (profile) => {
        if (profile.success) {
          this.userProfile.set(profile);
          this.profilePhotoPreview.set(this.resolveProfilePhoto(profile));
          this.pendingPhotoPath.set(null);
          this.isDoctor.set(
            profile.is_doctor === true ||
            profile.is_doctor === 1 ||
            profile.is_doctor === '1'
          );
          this.profileForm.patchValue({
            name: profile.firstname,
            surname: profile.lastname,
            email: profile.email,
            phone: profile.phone
          });
        } else {
          this.profileErrorMsg.set(profile.error || 'Failed to load profile.');
        }
        this.profileLoading.set(false);
      },
      error: (err) => {
        this.profileErrorMsg.set('An error occurred while loading the profile.');
        this.profileLoading.set(false);
        console.error('Load profile error:', err);
      }
    });
  }

  onSubmitProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.profileLoading.set(true);
    this.profileErrorMsg.set(null);
    this.profileSuccessMsg.set(null);

    const { name, surname, email, phone, password, confirm } = this.profileForm.value;

    const payload: UpdateProfilePayload = {
      name: name || '',
      surname: surname || '',
      email: email || '',
      phone: phone || '',
    };

    if (password && confirm) {
      if (password !== confirm) {
        this.profileErrorMsg.set('Passwords do not match.');
        this.profileLoading.set(false);
        return;
      }
      payload.password = password;
      payload.confirm = confirm;
    }

    if (this.pendingPhotoPath()) {
      payload.photo = String(this.pendingPhotoPath());
    }

    this.authService.updateProfile(payload).subscribe({
      next: (response) => {
        this.profileLoading.set(false);
        if (response.success) {
          this.profileSuccessMsg.set(response.success);
          this.loadProfile(); // Reload profile to get updated data
        } else {
          this.profileErrorMsg.set(response.error || 'Failed to update profile.');
        }
      },
      error: (err) => {
        this.profileLoading.set(false);
        this.profileErrorMsg.set('An unexpected error occurred. Please try again later.');
        console.error('Update profile error:', err);
      }
    });
  }

  toggleEditMode(save: boolean = false) {
    if (this.isEditing() && save) {
      this.onSubmitProfile();
    } else if (this.isEditing() && !save) {
      // Reset form to original values if canceling
      const profile = this.userProfile();
      if (profile) {
        this.profileForm.patchValue({
          name: profile.firstname,
          surname: profile.lastname,
          email: profile.email,
          phone: profile.phone,
          password: '',
          confirm: ''
        });
        this.profilePhotoPreview.set(this.resolveProfilePhoto(profile));
        this.pendingPhotoPath.set(null);
        this.photoErrorMsg.set(null);
      }
    }
    this.isEditing.update(value => !value);
  }

  onChangePhotoClick(input: HTMLInputElement) {
    input.click();
  }

  onPhotoFileSelected(event: Event) {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0];
    if (!file) {
      return;
    }

    this.photoErrorMsg.set(null);
    this.photoUploading.set(true);
    this.authService.uploadProfilePhoto(file).subscribe({
      next: (response) => {
        this.photoUploading.set(false);
        const uploadedPath = this.extractUploadedPath(response);
        if (!uploadedPath) {
          this.photoErrorMsg.set(response?.error || 'Не вдалося завантажити фото.');
          return;
        }
        this.pendingPhotoPath.set(uploadedPath);
        this.profilePhotoPreview.set(this.resolvePhotoUrl(uploadedPath));
      },
      error: () => {
        this.photoUploading.set(false);
        this.photoErrorMsg.set('Не вдалося завантажити фото.');
      }
    });
  }

  private extractUploadedPath(response: any): string {
    const directPath = String(response?.path || '').trim();
    if (directPath) {
      return directPath;
    }

    const firstResultPath = String(response?.results?.[0]?.path || '').trim();
    if (firstResultPath) {
      return firstResultPath;
    }

    const firstFilePath = String(response?.files?.[0]?.path || '').trim();
    if (firstFilePath) {
      return firstFilePath;
    }

    return '';
  }

  private resolveProfilePhoto(profile: UserProfile): string {
    const photo = String((profile as any)?.photo || '').trim();
    const avatar = String((profile as any)?.avatar || '').trim();
    const raw = photo || avatar;
    return raw ? this.resolvePhotoUrl(raw) : 'assets/icon/favicon.png';
  }

  private resolvePhotoUrl(path: string): string {
    const raw = String(path || '').trim();
    if (!raw) {
      return 'assets/icon/favicon.png';
    }
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:')) {
      return raw;
    }
    if (raw.startsWith('/')) {
      return `https://mysense.care${raw}`;
    }
    return `https://mysense.care/${raw}`;
  }

  goToHowToUse() {
    this.router.navigate(['/tabs/how-to-use']);
  }

  goToMyDiary() {
    if (this.isDoctor()) {
      this.router.navigate(['/tabs/home']);
      return;
    }
    this.router.navigate(['/tabs/diary']);
  }

  goToFaq() {
    console.log('Navigating to FAQ page...');
    this.router.navigate(['/faq']);
  }

  goToNotifications() {
    console.log('Navigating to Notifications page...');
    this.router.navigate(['/notifications']);
  }

  goToLegalInfo() {
    console.log('Navigating to Legal Info page...');
    this.router.navigate(['/legal-info']);
  }

  ionViewWillLeave() {
    this.blurActiveElement();
  }

  private blurActiveElement() {
    const active = document.activeElement as HTMLElement | null;
    if (active && typeof active.blur === 'function') {
      active.blur();
    }
  }
}
