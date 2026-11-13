import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { GalleryImages } from '../../core/services/gallery-images';
import { Gallery } from './gallery';

const image = (id: string) => ({
  id,
  title: `Foto ${id}`,
  category: 'Piscina',
  url: `/img/${id}.webp`,
  altText: `Alt ${id}`,
  sortOrder: 0,
  isPublished: true,
});

describe('Gallery', () => {
  let component: Gallery;
  let fixture: ComponentFixture<Gallery>;

  const press = (key: string, shiftKey = false) =>
    document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Gallery],
      providers: [
        {
          provide: GalleryImages,
          useValue: { getAll: () => of({ items: [image('1'), image('2'), image('3')] }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Gallery);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens a labelled modal dialog and focuses the close button', () => {
    component.openLightbox(0);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.lightbox');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('lightbox-title');
    expect(document.activeElement?.classList.contains('lightbox-close')).toBe(true);
  });

  it('navigates with the arrow keys, wrapping around', () => {
    component.openLightbox(0);

    press('ArrowLeft');
    expect(component.selectedIndex).toBe(2);
    press('ArrowRight');
    expect(component.selectedIndex).toBe(0);
  });

  it('closes with Escape and returns focus to the thumbnail', () => {
    const thumb = fixture.nativeElement.querySelector('.photo') as HTMLElement;
    thumb.focus();
    component.openLightbox(0);

    press('Escape');

    expect(component.selectedImage).toBeNull();
    expect(document.activeElement).toBe(thumb);
  });

  it('keeps Tab focus inside the dialog', () => {
    component.openLightbox(0);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.lightbox button');
    (buttons[buttons.length - 1] as HTMLElement).focus();

    press('Tab');

    expect(document.activeElement).toBe(buttons[0]);
  });

  it('ignores keys while the viewer is closed', () => {
    press('ArrowRight');
    expect(component.selectedIndex).toBe(0);
    expect(component.selectedImage).toBeNull();
  });
});
