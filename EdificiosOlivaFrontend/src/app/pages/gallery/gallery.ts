import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { GalleryImage } from '../../core/models/gallery-image.model';
import { GalleryImages } from '../../core/services/gallery-images';

@Component({
  selector: 'app-gallery',
  imports: [],
  templateUrl: './gallery.html',
  styleUrl: './gallery.css',
})
export class Gallery implements OnInit {
  private readonly galleryService = inject(GalleryImages);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly categories = [
    'Todos',
    'Apartamentos',
    'Habitaciones',
    'Piscina',
    'Exterior',
    'Áreas comunes',
  ];

  images: GalleryImage[] = [];
  selectedCategory = 'Todos';
  selectedImage: GalleryImage | null = null;
  selectedIndex = 0;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadImages();
  }

  get heroImageUrl(): string | null {
    return this.images[0]?.url ?? null;
  }

  loadImages(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    const category = this.selectedCategory === 'Todos' ? '' : this.selectedCategory;

    this.galleryService
      .getAll(category, '', true)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.images = result.items;
          this.selectedImage = null;
          this.changeDetector.markForCheck();
        },
        error: (error: unknown) => {
          this.images = [];
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar la galería.';
          this.changeDetector.markForCheck();
        },
      });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.loadImages();
  }

  private lastFocused: HTMLElement | null = null;

  openLightbox(index: number): void {
    if (typeof document !== 'undefined') {
      this.lastFocused = document.activeElement as HTMLElement | null;
    }
    this.selectedIndex = index;
    this.selectedImage = this.images[index];
    this.changeDetector.detectChanges();
    this.focusLightboxClose();
  }

  closeLightbox(): void {
    this.selectedImage = null;
    this.changeDetector.detectChanges();
    // Return focus to the thumbnail that opened the viewer.
    this.lastFocused?.focus();
    this.lastFocused = null;
  }

  /** Escape closes, arrows navigate, Tab is trapped inside the dialog. */
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.selectedImage) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeLightbox();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextImage();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.previousImage();
        break;
      case 'Tab':
        this.trapFocus(event);
        break;
      default:
        break;
    }
  }

  private focusLightboxClose(): void {
    if (typeof document !== 'undefined') {
      document.querySelector<HTMLElement>('.lightbox-close')?.focus();
    }
  }

  private trapFocus(event: KeyboardEvent): void {
    if (typeof document === 'undefined') {
      return;
    }

    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>('.lightbox button'),
    );
    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (!focusable.includes(active as HTMLElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  nextImage(): void {
    if (this.images.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.images.length;
    this.selectedImage = this.images[this.selectedIndex];
  }

  previousImage(): void {
    if (this.images.length === 0) return;
    this.selectedIndex =
      this.selectedIndex === 0 ? this.images.length - 1 : this.selectedIndex - 1;
    this.selectedImage = this.images[this.selectedIndex];
  }
}
