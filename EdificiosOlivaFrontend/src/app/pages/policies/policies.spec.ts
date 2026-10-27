import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Policies } from './policies';

describe('Policies', () => {
  let fixture: ComponentFixture<Policies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Policies],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Policies);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
