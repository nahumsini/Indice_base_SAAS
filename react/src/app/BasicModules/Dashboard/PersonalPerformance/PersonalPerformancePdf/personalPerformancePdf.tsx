import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  PersonalPerformancePdfDocument,
  type PersonalPerformancePdfDocumentProps,
} from './PersonalPerformancePdfDocument';

type PersonalPerformancePrintPortalProps = {
  job: PersonalPerformancePdfDocumentProps | null;
  onComplete: () => void;
};

const PRINT_HOST_CLASS = 'bdpdf-print-host';
const PRINT_HOST_ID = 'bdpdf-print-host-personal-performance';

export function PersonalPerformancePrintPortal({
  job,
  onComplete,
}: PersonalPerformancePrintPortalProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const hasTriggeredRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!job) {
      setHost(null);
      hasTriggeredRef.current = false;
      return undefined;
    }

    let nextHost = document.getElementById(PRINT_HOST_ID) as HTMLDivElement | null;
    if (!nextHost) {
      nextHost = document.createElement('div');
      nextHost.id = PRINT_HOST_ID;
      nextHost.className = PRINT_HOST_CLASS;
      document.body.appendChild(nextHost);
    }

    setHost(nextHost);

    return () => {
      hasTriggeredRef.current = false;
    };
  }, [job]);

  useEffect(() => {
    if (!job || !host || hasTriggeredRef.current) {
      return undefined;
    }

    hasTriggeredRef.current = true;
    const previousTitle = document.title;
    let hasCompleted = false;
    let focusFallbackId: number | undefined;
    let safetyFallbackId: number | undefined;

    const completePrintJob = () => {
      if (hasCompleted) {
        return;
      }

      hasCompleted = true;
      document.title = previousTitle;
      hasTriggeredRef.current = false;
      window.removeEventListener('afterprint', completePrintJob);
      window.removeEventListener('focus', scheduleFocusFallback);

      if (focusFallbackId) {
        window.clearTimeout(focusFallbackId);
      }

      if (safetyFallbackId) {
        window.clearTimeout(safetyFallbackId);
      }

      onCompleteRef.current();
    };

    function scheduleFocusFallback() {
      if (focusFallbackId) {
        window.clearTimeout(focusFallbackId);
      }

      focusFallbackId = window.setTimeout(completePrintJob, 350);
    }

    window.addEventListener('afterprint', completePrintJob);
    window.addEventListener('focus', scheduleFocusFallback);

    const triggerId = window.setTimeout(() => {
      try {
        document.title = job.fileName;
        window.print();
        safetyFallbackId = window.setTimeout(completePrintJob, 60000);
      } catch (error) {
        console.error('Unable to print personal performance report.', error);
        completePrintJob();
      }
    }, 120);

    return () => {
      if (!hasCompleted) {
        hasTriggeredRef.current = false;
        document.title = previousTitle;
      }

      window.clearTimeout(triggerId);
      window.removeEventListener('afterprint', completePrintJob);
      window.removeEventListener('focus', scheduleFocusFallback);

      if (focusFallbackId) {
        window.clearTimeout(focusFallbackId);
      }

      if (safetyFallbackId) {
        window.clearTimeout(safetyFallbackId);
      }
    };
  }, [host, job]);

  if (!job || !host) {
    return null;
  }

  return createPortal(
    <div className="bdpdf-print-root" aria-hidden="true">
      <div className="bdpdf-print-document">
        <PersonalPerformancePdfDocument {...job} />
      </div>
    </div>,
    host,
  );
}
