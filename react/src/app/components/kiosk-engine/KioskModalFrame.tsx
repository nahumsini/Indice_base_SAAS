import {
  IndiceModalFrame,
  type IndiceModalFrameProps,
  type IndiceModalType,
} from '../indice-modal';
import { cn } from '../ui/utils';

export type KioskModalSurface = 'administration' | 'public';
export type KioskModalSize = 'compact' | 'form' | 'wizard' | 'workspace';

export type KioskModalFrameProps = Omit<
  IndiceModalFrameProps,
  'bodyClassName' | 'contentClassName' | 'footerClassName' | 'modalType'
> & {
  bodyClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  size?: KioskModalSize;
  surface?: KioskModalSurface;
};

const modalTypeBySize: Record<KioskModalSize, IndiceModalType> = {
  compact: 'confirmation',
  form: 'standard-form',
  wizard: 'wizard',
  workspace: 'operational-workspace',
};

const administrationWidth: Record<KioskModalSize, string> = {
  compact: 'sm:!w-[min(92vw,28rem)] sm:!max-w-md',
  form: 'sm:!w-[min(94vw,44rem)] sm:!max-w-[44rem]',
  wizard: 'sm:!w-[min(94vw,56rem)] sm:!max-w-[56rem]',
  workspace: 'sm:!w-[min(94vw,72rem)] sm:!max-w-6xl',
};

const publicWidth: Record<KioskModalSize, string> = {
  compact: 'sm:!w-[min(92vw,26rem)] sm:!max-w-[26rem]',
  form: 'sm:!w-[min(92vw,30rem)] sm:!max-w-[30rem]',
  wizard: 'sm:!w-[min(92vw,30rem)] sm:!max-w-[30rem]',
  workspace: 'sm:!w-[min(92vw,30rem)] sm:!max-w-[30rem]',
};

/**
 * Presentation boundary for kiosk dialogs.
 *
 * Business rules, permissions, idempotency and persistence remain in the
 * feature that consumes this frame. This component only standardizes the
 * kiosk modal geometry and its mobile-safe scrolling surface.
 */
export function KioskModalFrame({
  bodyClassName,
  children,
  contentClassName,
  footerClassName,
  size = 'form',
  surface = 'administration',
  tone = 'green',
  ...props
}: KioskModalFrameProps) {
  const widthClassName = surface === 'public'
    ? publicWidth[size]
    : administrationWidth[size];

  return (
    <IndiceModalFrame
      {...props}
      bodyClassName={cn('overscroll-contain !px-4 !py-4 sm:!px-6 sm:!py-5', bodyClassName)}
      contentClassName={cn(
        '!h-dvh !max-h-dvh !w-full !max-w-none !rounded-none sm:!h-auto sm:!max-h-[92dvh] sm:!rounded-[28px]',
        '[&_[data-slot=dialog-header]]:!pt-[calc(1rem+env(safe-area-inset-top))] sm:[&_[data-slot=dialog-header]]:!pt-4',
        widthClassName,
        tone === 'yellow' && [
          '[&_[data-slot=dialog-header]]:!text-[#222831]',
          '[&_[data-slot=dialog-title]]:!text-[#222831]',
          '[&_[data-slot=dialog-description]]:!text-[#222831]/75',
          '[&_[data-slot=dialog-close]]:!border-[#222831]/20',
          '[&_[data-slot=dialog-close]]:!bg-[#222831]/10',
          '[&_[data-slot=dialog-close]]:!text-[#222831]',
        ],
        contentClassName,
      )}
      footerClassName={cn('!px-4 !pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:!px-6 sm:!pb-4', footerClassName)}
      modalType={modalTypeBySize[size]}
      tone={tone}
    >
      {children}
    </IndiceModalFrame>
  );
}
