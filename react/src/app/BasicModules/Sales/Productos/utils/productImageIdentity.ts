export type ProductImageIdentity = {
  url?: string | null;
  objectKey?: string | null;
};

function normalizedObjectKey(value?: string | null) {
  return value?.trim() ?? '';
}

function normalizedUrl(value?: string | null) {
  const candidate = value?.trim() ?? '';
  if (!candidate) return '';

  try {
    const parsed = new URL(candidate, 'https://indice.local');
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return candidate.split(/[?#]/, 1)[0] ?? '';
  }
}

function decodedPath(value?: string | null) {
  const candidate = value?.trim() ?? '';
  if (!candidate) return '';

  try {
    return decodeURIComponent(new URL(candidate, 'https://indice.local').pathname);
  } catch {
    return '';
  }
}

function urlContainsObjectKey(url: string | null | undefined, objectKey: string) {
  if (!objectKey) return false;
  const path = decodedPath(url);
  return path === `/${objectKey}` || path.endsWith(`/${objectKey}`);
}

export function hasSameProductImageIdentity(left: ProductImageIdentity, right: ProductImageIdentity) {
  const leftObjectKey = normalizedObjectKey(left.objectKey);
  const rightObjectKey = normalizedObjectKey(right.objectKey);

  if (leftObjectKey && rightObjectKey && leftObjectKey === rightObjectKey) return true;
  if (leftObjectKey && urlContainsObjectKey(right.url, leftObjectKey)) return true;
  if (rightObjectKey && urlContainsObjectKey(left.url, rightObjectKey)) return true;

  const leftUrl = normalizedUrl(left.url);
  const rightUrl = normalizedUrl(right.url);
  return Boolean(leftUrl && rightUrl && leftUrl === rightUrl);
}

export function deduplicateProductImages<T extends ProductImageIdentity>(images: T[]): T[] {
  return images.reduce<T[]>((result, image) => {
    const existingIndex = result.findIndex((candidate) => hasSameProductImageIdentity(candidate, image));
    if (existingIndex < 0) {
      result.push(image);
      return result;
    }

    if (!normalizedObjectKey(result[existingIndex]?.objectKey) && normalizedObjectKey(image.objectKey)) {
      result[existingIndex] = image;
    }
    return result;
  }, []);
}

export function mergeProductImageCandidates<T extends ProductImageIdentity>(
  primaryImage: T | undefined,
  galleryImages: T[],
): T[] {
  const gallery = deduplicateProductImages(galleryImages);
  if (!primaryImage || gallery.some((image) => hasSameProductImageIdentity(image, primaryImage))) {
    return gallery;
  }
  return [primaryImage, ...gallery];
}
