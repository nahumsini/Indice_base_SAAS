import { lazy, Suspense, type ComponentProps } from 'react';
import type { AttendanceControlDialogs } from './AttendanceControlDialogs';

const LazyAttendanceControlDialogs = lazy(() =>
  import('./AttendanceControlDialogs').then((module) => ({ default: module.AttendanceControlDialogs })),
);

export type ControlDialogHostProps = ComponentProps<typeof AttendanceControlDialogs> & {
  hasOpenControlDialog: boolean;
};

export function ControlDialogHost({
  hasOpenControlDialog,
  ...dialogProps
}: ControlDialogHostProps) {
  return (
    <Suspense fallback={null}>
      {hasOpenControlDialog ? (
        <LazyAttendanceControlDialogs {...dialogProps} />
      ) : null}
    </Suspense>
  );
}
