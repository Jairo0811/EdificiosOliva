import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GalleryImages } from '../../../core/services/gallery-images';
import { GalleryAdmin } from './gallery-admin';

const image = {
  id: 'i1', title: 'Piscina', category: 'Piscina', url: '/images/piscina.webp',
  altText: 'Vista de la piscina', sortOrder: 1, isPublished: true,
};

describe('GalleryAdmin v1.3', () => {
  let component: GalleryAdmin;
  let fixture: ComponentFixture<GalleryAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GalleryAdmin],
      providers: [{ provide: GalleryImages, useValue: {
        getAll: () => of({ items: [image] }),
      } }],
    }).compileComponents();
    fixture = TestBed.createComponent(GalleryAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders an accessible preview dialog and closes on Escape', async () => {
    component.openPreview(image);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('.image-preview');
    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(component.previewImage).toBeNull();
  });

  it('announces the selected category with aria-pressed', () => {
    component.selectCategory('Piscina');
    fixture.detectChanges();
    const buttons = [...fixture.nativeElement.querySelectorAll('.filters button')];
    expect(buttons.find((b: HTMLElement) => b.textContent?.trim() === 'Piscina')
      ?.getAttribute('aria-pressed')).toBe('true');
  });
});
