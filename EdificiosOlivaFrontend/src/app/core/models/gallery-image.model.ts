export interface GalleryImage {
  id: string;
  title: string;
  category: string;
  url: string;
  publicId?: string | null;
  altText: string;
  sortOrder: number;
  isPublished: boolean;
  createdAtUtc: string;
  updatedAtUtc?: string | null;
}
