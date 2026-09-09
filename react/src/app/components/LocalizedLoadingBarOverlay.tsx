import { useLanguage } from '../shared/context';
import { LoadingBarOverlay } from './LoadingBarOverlay';
import { getLoadingBarCopy, type LoadingBarVariant } from './loadingTranslations';

/** Shared navigation copy follows the active language while preserving the existing overlay lifecycle. */
export function LocalizedLoadingBarOverlay({
  isVisible,
  variant,
  className,
}: {
  isVisible: boolean;
  variant: LoadingBarVariant;
  className?: string;
}) {
  const { currentLanguage } = useLanguage();
  const copy = getLoadingBarCopy(currentLanguage.code, variant);
  return <LoadingBarOverlay isVisible={isVisible} title={copy.title} description={copy.description} className={className} />;
}
