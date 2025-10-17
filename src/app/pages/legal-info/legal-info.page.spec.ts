import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegalInfoPage } from './legal-info.page';

describe('LegalInfoPage', () => {
  let component: LegalInfoPage;
  let fixture: ComponentFixture<LegalInfoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LegalInfoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
