type IndiceEditorialBrandProps = {
  brand: string;
  descriptor?: string;
  compact?: boolean;
};

export function IndiceEditorialBrand({
  brand,
  descriptor,
  compact = false,
}: IndiceEditorialBrandProps) {
  return (
    <span className={`bdpdf-indice-brand${compact ? ' bdpdf-indice-brand--compact' : ''}`}>
      <span className="bdpdf-indice-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className="bdpdf-indice-brand-text">
        <strong>{brand}</strong>
        {descriptor ? <span>{descriptor}</span> : null}
      </span>
    </span>
  );
}
