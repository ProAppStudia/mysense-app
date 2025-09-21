import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TherapistProfilePage } from './therapist-profile.page';

describe('TherapistProfilePage', () => {
  let component: TherapistProfilePage;
  let fixture: ComponentFixture<TherapistProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TherapistProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
