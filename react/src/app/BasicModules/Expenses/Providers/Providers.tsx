import type { Dispatch, ReactNode, SetStateAction } from 'react';
import ProveedoresPage from './ProveedoresPage';
import type { ProvidersHeaderVariant } from './components/ProvidersHeaderBanner';
import type { ProviderRecord } from './useProveedoresLogic';

interface ProvidersProps {
  headerIcon?: ReactNode;
  headerSubtitle?: string;
  headerTitle?: string;
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
  variant?: ProvidersHeaderVariant;
}

export default function Providers({
  headerIcon,
  headerSubtitle,
  headerTitle,
  onProvidersChange,
  providers,
  variant,
}: ProvidersProps) {
  return (
    <ProveedoresPage
      headerIcon={headerIcon}
      headerSubtitle={headerSubtitle}
      headerTitle={headerTitle}
      onProvidersChange={onProvidersChange}
      providers={providers}
      variant={variant}
    />
  );
}
