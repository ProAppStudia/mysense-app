import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiaryEntryPage } from './diary-entry.page';

describe('DiaryEntryPage', () => {
  let component: DiaryEntryPage;
  let fixture: ComponentFixture<DiaryEntryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DiaryEntryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
