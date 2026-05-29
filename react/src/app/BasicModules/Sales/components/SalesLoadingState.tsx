import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';

interface SalesLoadingStateProps {
  isVisible: boolean;
  title: string;
  description: string;
}

export function SalesLoadingState({
  isVisible,
  title,
  description,
}: SalesLoadingStateProps) {
  return (
    <LoadingBarOverlay
      isVisible={isVisible}
      title={title}
      description={description}
    />
  );
}
