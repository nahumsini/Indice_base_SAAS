import type { Dispatch, SetStateAction } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react';
import { Button } from '../../../../../components/ui/button';
import { Input } from '../../../../../components/ui/input';
import type { ProductsTranslations } from '../../translations';
import type { ProductFormState, ProductMediaDraft } from '../../types/productosTypes';
import { readProductImageFiles } from '../../utils/productImages';
import { productFieldClassName } from './productModalConstants';
import { moveArrayItem } from './productModalUtils';

export function ProductMediaSection({
  form,
  t,
  onFormChange,
}: {
  form: ProductFormState;
  t: ProductsTranslations;
  onFormChange: Dispatch<SetStateAction<ProductFormState>>;
}) {
  const updateUploadedImages = (updater: (images: ProductMediaDraft[]) => ProductMediaDraft[]) => {
    onFormChange((current) => ({
      ...current,
      uploadedImages: updater(current.uploadedImages),
    }));
  };

  const handleFilesChange = async (files: FileList | null) => {
    if (!files) {
      return;
    }

    const images = await readProductImageFiles(files);
    updateUploadedImages((current) => [...current, ...images]);
  };

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-black text-slate-950">{t.media.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{t.media.description}</p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#FF6B5E]/25 bg-white px-4 text-sm font-bold text-[#B63B32] transition hover:bg-[#FF6B5E]/10">
          <ImagePlus className="h-4 w-4" />
          {t.media.upload}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleFilesChange(event.target.files)} />
        </label>
      </div>

      {form.uploadedImages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm font-semibold text-slate-500">
          {t.media.empty}
        </div>
      ) : (
        <div className="space-y-2">
          {form.uploadedImages.map((image, index) => (
            <div key={image.id} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-2 md:grid-cols-[72px_minmax(0,1fr)_auto] md:items-center">
              <img src={image.url} alt={image.alt || t.media.imageAlt} className="h-16 w-16 rounded-lg object-cover" />
              <Input
                className={productFieldClassName}
                value={image.alt ?? ''}
                onChange={(event) => updateUploadedImages((current) => current.map((item) => (item.id === image.id ? { ...item, alt: event.target.value } : item)))}
                placeholder={t.media.altPlaceholder}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  disabled={index === 0}
                  onClick={() => updateUploadedImages((current) => moveArrayItem(current, index, index - 1))}
                  aria-label={t.media.moveUp}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  disabled={index === form.uploadedImages.length - 1}
                  onClick={() => updateUploadedImages((current) => moveArrayItem(current, index, index + 1))}
                  aria-label={t.media.moveDown}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                  onClick={() => updateUploadedImages((current) => current.filter((item) => item.id !== image.id))}
                  aria-label={t.media.remove}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
