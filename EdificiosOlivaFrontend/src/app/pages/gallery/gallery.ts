import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
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

  openLightbox(index: number): void {
    this.selectedIndex = index;
    this.selectedImage = this.images[index];
  }

  closeLightbox(): void {
    this.selectedImage = null;
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
