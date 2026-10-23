export const maxLogoBytes = 128 * 1024;
export const safeAgendaLogo = (value: unknown): string => typeof value === 'string' && value.length <= 175000 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : '';

/** Small per-agenda brand image: decode locally, retain transparency and discard file metadata. */
export async function readAgendaLogo(file: File): Promise<string> {
  if (file.size > 1024 * 1024) throw new Error('logo_size');
  if (!file.size || !['image/png','image/jpeg','image/webp'].includes(file.type)) throw new Error('logo_invalid');
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve,reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(new Error('logo_invalid')); img.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 16000000) throw new Error('logo_invalid');
    for (const limit of [512,384,256,128]) {
      const scale = Math.min(1,limit / Math.max(image.naturalWidth,image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1,Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1,Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d'); if (!context) throw new Error('logo_invalid');
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const data = canvas.toDataURL('image/png');
      if (safeAgendaLogo(data) && Math.ceil((data.length - data.indexOf(',') - 1) * .75) <= maxLogoBytes) return data;
    }
    throw new Error('logo_size');
  } finally { URL.revokeObjectURL(url); }
}
