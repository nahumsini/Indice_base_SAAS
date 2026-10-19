/** Existing company settings own these inline logos; keep invalid files out of the draft. */
export async function readCompanyLogo(file: File): Promise<string> {
  if (file.size > 1024 * 1024) throw new Error('company_logo_size');
  const mime = file.type || ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', svg: 'image/svg+xml' } as Record<string, string>)[file.name.split('.').pop()?.toLowerCase() ?? ''];
  if (!file.size || !['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(mime)) throw new Error('company_invalid_logo');
  if (mime === 'image/svg+xml') {
    const svg = await file.text();
    if (!/<svg[\s>]/i.test(svg) || /<script|<!doctype|<!entity|<foreignobject|\son[a-z]+\s*=|(?:href|src)\s*=/i.test(svg)) throw new Error('company_invalid_logo');
  }
  const result = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('company_invalid_logo'));
    reader.onabort = reader.onerror;
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(new Blob([file], { type: mime }));
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.naturalWidth && image.naturalHeight ? resolve() : reject(new Error('company_invalid_logo'));
    image.onerror = () => reject(new Error('company_invalid_logo'));
    image.src = result;
  });
  return result;
}
