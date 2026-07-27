import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { GalleryImage } from '../../../core/models/gallery-image.model';
import {
  GalleryImageRequest,
  GalleryImages,
} from '../../../core/services/gallery-images';

interface GalleryForm {
  title: string;
  category: string;
  url: string;
  publicId: string;
  altText: string;
  sortOrder: number;
  isPublished: boolean;
}

@Component({
  selector: 'app-gallery-admin',
  imports: [FormsModule],
  templateUrl: './gallery-admin.html',
  styleUrl: './gallery-admin.css',
})
export class GalleryAdmin implements OnInit {
  private readonly galleryService = inject(GalleryImages);
  private readonly destroyRef = inject(DestroyRef);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly categories = [
    'Apartamentos',
    'Habitaciones',
    'Piscina',
    'Exterior',
    'Áreas comunes',
  ];

  images: GalleryImage[] = [];
  selectedCategory = '';
  search = '';
  loading = true;
  saving = false;
  showForm = false;
  editingId: string | null = null;
  previewImage: GalleryImage | null = null;
  successMessage = '';
  errorMessage = '';

  imageForm: GalleryForm = this.getEmptyForm();

  ngOnInit(): void {
    this.loadImages();
  }

  loadImages(): void {
    this.loading = true;
    this.errorMessage = '';
    this.changeDetector.markForCheck();

    this.galleryService
      .getAll(this.selectedCategory, this.search)
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

  openCreateForm(): void {
    this.editingId = null;
    this.imageForm = this.getEmptyForm();
    this.clearMessages();
    this.showForm = true;
  }

  openEditForm(image: GalleryImage): void {
    this.editingId = image.id;
    this.imageForm = {
      title: image.title,
      category: image.category,
      url: image.url,
      publicId: image.publicId ?? '',
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPublished: image.isPublished,
    };
    this.clearMessages();
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) return;
    this.showForm = false;
    this.editingId = null;
    this.imageForm = this.getEmptyForm();
  }

  saveImage(): void {
    this.clearMessages();

    if (
      !this.imageForm.title.trim() ||
      !this.imageForm.category.trim() ||
      !this.imageForm.url.trim() ||
      !this.imageForm.altText.trim()
    ) {
      this.errorMessage = 'Completa título, categoría, URL y texto alternativo.';
      return;
    }

    const request: GalleryImageRequest = {
      title: this.imageForm.title.trim(),
      category: this.imageForm.category.trim(),
      url: this.imageForm.url.trim(),
      publicId: this.imageForm.publicId.trim() || null,
      altText: this.imageForm.altText.trim(),
      sortOrder: Math.max(0, Number(this.imageForm.sortOrder) || 0),
      isPublished: this.imageForm.isPublished,
    };

    this.saving = true;
    const operation = this.editingId
      ? this.galleryService.update(this.editingId, request)
      : this.galleryService.create(request);

    operation
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = this.editingId
            ? 'Imagen actualizada correctamente.'
            : 'Imagen registrada correctamente.';
          this.showForm = false;
          this.editingId = null;
          this.imageForm = this.getEmptyForm();
          this.loadImages();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible guardar la imagen.';
          this.changeDetector.markForCheck();
        },
      });
  }

  deleteImage(image: GalleryImage): void {
    if (!confirm(`¿Deseas eliminar la imagen "${image.title}"?`)) {
      return;
    }

    this.clearMessages();
    this.galleryService
      .delete(image.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.successMessage = 'Imagen eliminada correctamente.';
          this.loadImages();
        },
        error: (error: unknown) => {
          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible eliminar la imagen.';
          this.changeDetector.markForCheck();
        },
      });
  }

  openPreview(image: GalleryImage): void {
    this.previewImage = image;
  }

  closePreview(): void {
    this.previewImage = null;
  }

  private getEmptyForm(): GalleryForm {
    return {
      title: '',
      category: 'Apartamentos',
      url: '',
      publicId: '',
      altText: '',
      sortOrder: 0,
      isPublished: true,
    };
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
