import {
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { Apartment } from '../../../core/models/apartment.model';
import { Apartments } from '../../../core/services/apartments';
import {
  StorageService,
  StorageUploadResult,
} from '../../../core/services/storage';

interface PendingImage {
  file: File;
  previewUrl: string;
  progress: number;
}

@Component({
  selector: 'app-apartments-admin',
  imports: [FormsModule],
  templateUrl: './apartments-admin.html',
  styleUrl: './apartments-admin.css',
})
export class ApartmentsAdmin implements OnInit, OnDestroy {
  private readonly apartmentsService = inject(Apartments);
  private readonly storageService = inject(StorageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly maxImages = 10;
  private readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly maxFileSizeBytes = 5 * 1024 * 1024;

  apartments: Apartment[] = [];

  showForm = false;
  editingMode = false;
  loadingApartments = true;
  saving = false;
  isDragging = false;

  successMessage = '';
  errorMessage = '';
  warningMessage = '';

  pendingImages: PendingImage[] = [];
  removedExistingImages: string[] = [];
  uploadProgress = 0;

  apartmentForm: Apartment = this.getEmptyApartment();

  ngOnInit(): void {
    this.loadApartments();
  }

  ngOnDestroy(): void {
    this.revokePreviewUrls();
  }

  loadApartments(): void {
    this.loadingApartments = true;
    this.errorMessage = '';

    this.apartmentsService
      .getApartments()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadingApartments = false;
        }),
      )
      .subscribe({
        next: (apartments) => {
          this.apartments = apartments;
        },
        error: (error: unknown) => {
          console.error('Error cargando apartamentos:', error);

          this.errorMessage =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar los apartamentos.';
        },
      });
  }

  getEmptyApartment(): Apartment {
    return {
      name: '',
      description: '',
      price: 0,
      guests: 1,
      bedrooms: 1,
      bathrooms: 1,
      location: '',
      status: 'Disponible',
      amenities: [],
      images: [],
    };
  }

  openCreateForm(): void {
    this.resetFormState();
    this.apartmentForm = this.getEmptyApartment();
    this.editingMode = false;
    this.showForm = true;
  }

  openEditForm(apartment: Apartment): void {
    this.resetFormState();

    this.apartmentForm = {
      ...apartment,
      amenities: [...(apartment.amenities ?? [])],
      images: [...(apartment.images ?? [])],
    };

    this.editingMode = true;
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.resetFormState();
  }

  toggleAmenity(amenity: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked && !this.apartmentForm.amenities.includes(amenity)) {
      this.apartmentForm.amenities = [
        ...this.apartmentForm.amenities,
        amenity,
      ];
      return;
    }

    this.apartmentForm.amenities = this.apartmentForm.amenities.filter(
      (item) => item !== amenity,
    );
  }

  hasAmenity(amenity: string): boolean {
    return this.apartmentForm.amenities.includes(amenity);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addFiles(Array.from(input.files ?? []));
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();

    if (!this.saving) {
      this.isDragging = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;

    if (!this.saving) {
      this.addFiles(Array.from(event.dataTransfer?.files ?? []));
    }
  }

  removePendingImage(index: number): void {
    const image = this.pendingImages[index];

    if (!image) {
      return;
    }

    URL.revokeObjectURL(image.previewUrl);
    this.pendingImages = this.pendingImages.filter(
      (_, currentIndex) => currentIndex !== index,
    );

    this.calculateOverallProgress();
  }

  removeExistingImage(index: number): void {
    const imageUrl = this.apartmentForm.images[index];

    if (!imageUrl) {
      return;
    }

    this.removedExistingImages = [
      ...this.removedExistingImages,
      imageUrl,
    ];

    this.apartmentForm.images = this.apartmentForm.images.filter(
      (_, currentIndex) => currentIndex !== index,
    );
  }

  restoreLastRemovedImage(): void {
    const imageUrl = this.removedExistingImages.at(-1);

    if (!imageUrl || this.totalImageCount >= this.maxImages) {
      return;
    }

    this.removedExistingImages = this.removedExistingImages.slice(0, -1);
    this.apartmentForm.images = [...this.apartmentForm.images, imageUrl];
  }

  moveExistingImage(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= this.apartmentForm.images.length
    ) {
      return;
    }

    const images = [...this.apartmentForm.images];
    [images[index], images[targetIndex]] = [
      images[targetIndex],
      images[index],
    ];

    this.apartmentForm.images = images;
  }

  movePendingImage(index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= this.pendingImages.length) {
      return;
    }

    const images = [...this.pendingImages];
    [images[index], images[targetIndex]] = [
      images[targetIndex],
      images[index],
    ];

    this.pendingImages = images;
  }

  setExistingImageAsCover(index: number): void {
    if (index <= 0 || index >= this.apartmentForm.images.length) {
      return;
    }

    const images = [...this.apartmentForm.images];
    const [selectedImage] = images.splice(index, 1);
    images.unshift(selectedImage);

    this.apartmentForm.images = images;
  }

  setPendingImageAsFirst(index: number): void {
    if (index <= 0 || index >= this.pendingImages.length) {
      return;
    }

    const images = [...this.pendingImages];
    const [selectedImage] = images.splice(index, 1);
    images.unshift(selectedImage);

    this.pendingImages = images;
  }

  async saveApartment(): Promise<void> {
    this.clearMessages();

    if (!this.isFormValid()) {
      return;
    }

    this.saving = true;
    this.uploadProgress = 0;

    const uploadedImages: StorageUploadResult[] = [];

    try {
      const folderId =
        this.apartmentForm.id ?? `draft-${crypto.randomUUID()}`;
      const folder = `apartments/${folderId}`;

      if (this.pendingImages.length > 0) {
        const files = this.pendingImages.map((image) => image.file);

        const results = await this.storageService.uploadImages(
          files,
          folder,
          (fileIndex, progress) => {
            const image = this.pendingImages[fileIndex];

            if (image) {
              image.progress = progress;
              this.pendingImages = [...this.pendingImages];
              this.calculateOverallProgress();
            }
          },
        );

        uploadedImages.push(...results);
      }

      const newUrls = uploadedImages.map((image) => image.downloadUrl);
      const apartmentToSave: Apartment = {
        ...this.apartmentForm,
        images: [...this.apartmentForm.images, ...newUrls],
      };

      if (this.editingMode && apartmentToSave.id) {
        await this.apartmentsService.updateApartment(
          apartmentToSave.id,
          apartmentToSave,
        );

        const deletionSummary = await this.storageService.deleteImages(
          this.removedExistingImages,
        );

        if (deletionSummary.failed.length > 0) {
          this.warningMessage =
            'El apartamento se actualizó, pero algunas imágenes antiguas no pudieron eliminarse de Storage.';
        }

        this.successMessage = 'Apartamento actualizado correctamente.';
      } else {
        await this.apartmentsService.addApartment(apartmentToSave);
        this.successMessage = 'Apartamento creado correctamente.';
      }

      this.showForm = false;
      this.resetFormState(false);
      this.loadApartments();
    } catch (error) {
      console.error('Error guardando apartamento:', error);

      await this.cleanupUploadedImages(uploadedImages);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No fue posible guardar el apartamento.';
    } finally {
      this.saving = false;
      this.uploadProgress = 0;
    }
  }

  async deleteApartment(id: string): Promise<void> {
    const apartment = this.apartments.find((item) => item.id === id);

    if (
      !apartment ||
      !confirm(`¿Deseas eliminar el apartamento "${apartment.name}"?`)
    ) {
      return;
    }

    this.clearMessages();

    try {
      await this.apartmentsService.deleteApartment(id);
      this.successMessage = 'Apartamento eliminado correctamente.';
      this.loadApartments();
    } catch (error: unknown) {
      console.error('Error eliminando apartamento:', error);

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'No fue posible eliminar el apartamento.';
    }
  }

  get canAddMoreImages(): boolean {
    return this.totalImageCount < this.maxImages && !this.saving;
  }

  get totalImageCount(): number {
    return this.apartmentForm.images.length + this.pendingImages.length;
  }

  get firstNewImageWillBeCover(): boolean {
    return (
      this.apartmentForm.images.length === 0 &&
      this.pendingImages.length > 0
    );
  }

  private addFiles(files: File[]): void {
    this.clearMessages();

    if (files.length === 0) {
      return;
    }

    const availableSlots = this.maxImages - this.totalImageCount;

    if (availableSlots <= 0) {
      this.errorMessage =
        `Solo puedes guardar hasta ${this.maxImages} imágenes por apartamento.`;
      return;
    }

    const acceptedFiles: File[] = [];

    for (const file of files.slice(0, availableSlots)) {
      const validationError = this.validateFile(file);

      if (validationError) {
        this.errorMessage = validationError;
        continue;
      }

      const duplicated = this.pendingImages.some(
        (image) =>
          image.file.name === file.name &&
          image.file.size === file.size &&
          image.file.lastModified === file.lastModified,
      );

      if (!duplicated) {
        acceptedFiles.push(file);
      }
    }

    const newImages: PendingImage[] = acceptedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
    }));

    this.pendingImages = [...this.pendingImages, ...newImages];

    if (files.length > availableSlots) {
      this.errorMessage =
        `Se añadieron solo ${availableSlots} imágenes porque el límite es ${this.maxImages}.`;
    }
  }

  private validateFile(file: File): string | null {
    if (!this.allowedTypes.includes(file.type)) {
      return `El archivo "${file.name}" no es válido. Usa JPG, PNG o WEBP.`;
    }

    if (file.size > this.maxFileSizeBytes) {
      return `La imagen "${file.name}" supera el máximo de 5 MB.`;
    }

    return null;
  }

  private isFormValid(): boolean {
    if (!this.apartmentForm.name.trim()) {
      this.errorMessage = 'Ingresa el nombre del apartamento.';
      return false;
    }

    if (!this.apartmentForm.description.trim()) {
      this.errorMessage = 'Ingresa la descripción del apartamento.';
      return false;
    }

    if (!this.apartmentForm.location.trim()) {
      this.errorMessage = 'Ingresa la ubicación del apartamento.';
      return false;
    }

    if (this.apartmentForm.price <= 0) {
      this.errorMessage = 'El precio por noche debe ser mayor que cero.';
      return false;
    }

    if (
      this.apartmentForm.guests < 1 ||
      this.apartmentForm.bedrooms < 1 ||
      this.apartmentForm.bathrooms < 1
    ) {
      this.errorMessage =
        'Huéspedes, habitaciones y baños deben ser mayores que cero.';
      return false;
    }

    return true;
  }

  private calculateOverallProgress(): void {
    if (this.pendingImages.length === 0) {
      this.uploadProgress = 0;
      return;
    }

    const totalProgress = this.pendingImages.reduce(
      (total, image) => total + image.progress,
      0,
    );

    this.uploadProgress = Math.round(
      totalProgress / this.pendingImages.length,
    );
  }

  private async cleanupUploadedImages(
    images: StorageUploadResult[],
  ): Promise<void> {
    await this.storageService.deleteImages(
      images.map((image) => image.fullPath),
    );
  }

  private resetFormState(clearMessages = true): void {
    this.revokePreviewUrls();
    this.pendingImages = [];
    this.removedExistingImages = [];
    this.uploadProgress = 0;
    this.isDragging = false;

    if (clearMessages) {
      this.clearMessages();
    }
  }

  private revokePreviewUrls(): void {
    for (const image of this.pendingImages) {
      URL.revokeObjectURL(image.previewUrl);
    }
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.warningMessage = '';
  }
}
