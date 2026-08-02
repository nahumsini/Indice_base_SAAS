import indiceLogoUrl from '../../../assets/indice-logo.png';

type IndiceBrandLogoProps = {
  alt: string;
  className?: string;
  imageClassName?: string;
};

export function IndiceBrandLogo({
  alt,
  className = 'h-12 w-44',
  imageClassName = 'w-[202px]',
}: IndiceBrandLogoProps) {
  return (
    <span className={`relative block shrink-0 overflow-hidden ${className}`}>
      <img
        src={indiceLogoUrl}
        alt={alt}
        className={`absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-[45%] ${imageClassName}`}
      />
    </span>
  );
}
