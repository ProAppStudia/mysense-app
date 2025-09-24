import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SortPopoverComponent } from './sort-popover.component';

describe('SortPopoverComponent', () => {
  let component: SortPopoverComponent;
  let fixture: ComponentFixture<SortPopoverComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SortPopoverComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SortPopoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
