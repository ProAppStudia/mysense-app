import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OfferAgreementPage } from './offer-agreement.page';

describe('OfferAgreementPage', () => {
  let component: OfferAgreementPage;
  let fixture: ComponentFixture<OfferAgreementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OfferAgreementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
