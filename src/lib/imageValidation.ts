/**
 * Client-side validation for media uploads and URLs.
 * Matches backend rules: max 5MB, format JPEG/PNG/WebP, dimensions 100x100 to 4000x4000.
 */

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
export const MIN_IMAGE_DIMENSION = 100;
export const MAX_IMAGE_DIMENSION = 4000;

export type ImageValidationResult =
  | { ok: true; width: number; height: number; sizeBytes: number }
  | { ok: false; error: string };

/**
 * Validates an image file before upload.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (!file) {
    return { ok: false, error: "Please select an image file." };
  }

  // 1. File size check
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: "Image file size exceeds the 5 MB limit." };
  }

  // 2. MIME type & extension check
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  const isAllowedExt = (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext);
  const isAllowedMime = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);

  if (!isAllowedExt || !isAllowedMime) {
    return { ok: false, error: "Only JPG, PNG, and WebP images are supported." };
  }

  // 3. Image dimension check by loading into Image DOM object
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION) {
        resolve({
          ok: false,
          error: `Image resolution is too small (${width}×${height}px). Minimum is ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px.`,
        });
        return;
      }

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        resolve({
          ok: false,
          error: `Image resolution is too large (${width}×${height}px). Maximum is ${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}px.`,
        });
        return;
      }

      resolve({ ok: true, width, height, sizeBytes: file.size });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ ok: false, error: "The file could not be decoded as an image. It may be corrupted." });
    };

    img.src = objectUrl;
  });
}

/**
 * Validates a web image URL string.
 */
export function validateImageUrl(url: string): { ok: true } | { ok: false; error: string } {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: true };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Image URL must start with http:// or https://" };
    }

    const pathname = parsed.pathname.toLowerCase();
    const hasValidExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
    if (!hasValidExt) {
      return { ok: false, error: "Image URL must end with .jpg, .jpeg, .png, or .webp" };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Please enter a valid web URL." };
  }
}
