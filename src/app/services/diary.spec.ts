import { TestBed } from '@angular/core/testing';

import { Diary } from './diary';

describe('Diary', () => {
  let service: Diary;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Diary);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
