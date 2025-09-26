import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HowToUsePage } from './how-to-use.page';

describe('HowToUsePage', () => {
  let component: HowToUsePage;
  let fixture: ComponentFixture<HowToUsePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HowToUsePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
