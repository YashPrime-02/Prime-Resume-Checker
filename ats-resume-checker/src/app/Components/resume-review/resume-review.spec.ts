import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeReview } from './resume-review';

describe('ResumeReview', () => {
  let component: ResumeReview;
  let fixture: ComponentFixture<ResumeReview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeReview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeReview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
