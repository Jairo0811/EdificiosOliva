import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Contact } from './contact';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Contact] }).compileComponents();
    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not hand off an invalid form and marks the fields', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    component.submit();
    fixture.detectChanges();

    expect(open).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('[aria-invalid="true"]').length).toBe(3);
  });

  it('opens WhatsApp with the message when the form is valid', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    component.form = {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '8095551234',
      message: 'Quiero información sobre disponibilidad',
    };

    component.submit();

    expect(open).toHaveBeenCalledTimes(1);
    const url = open.mock.calls[0][0] as string;
    expect(url).toContain('https://wa.me/18296196970');
    expect(decodeURIComponent(url)).toContain('Quiero información sobre disponibilidad');
    expect(component.handedOff).toBe(true);
  });
});
