import type { Dispatch, SetStateAction } from 'react';
import ProveedoresPage from './ProveedoresPage';
import type { ProviderRecord } from './useProveedoresLogic';

interface ProvidersProps {
  onProvidersChange?: Dispatch<SetStateAction<ProviderRecord[]>>;
  providers?: ProviderRecord[];
}

export default function Providers({ onProvidersChange, providers }: ProvidersProps) {
  return (
    <ProveedoresPage
      onProvidersChange={onProvidersChange}
      providers={providers}
    />
  );
}
