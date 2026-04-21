import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  PayrollRunPdfDocument,
  type PayrollRunPdfDocumentProps,
} from './PayrollRunPdfDocument';

type PayrollRunPrintPortalProps = {
  job: PayrollRunPdfDocumentProps | null;
  onComplete: () => void;
};

const PRINT_HOST_CLASS = 'bdpdf-print-host';
const PRINT_HOST_ID = 'bdpdf-print-host-payroll-run';

export function PayrollRunPrintPortal({
  job,
  onComplete,
}: PayrollRunPrintPortalProps) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const hasTriggeredRef = useRef(false);

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

    const handleAfterPrint = () => {
      hasTriggeredRef.current = false;
      onComplete();
    };

    window.addEventListener('afterprint', handleAfterPrint, { once: true });

    const triggerId = window.setTimeout(() => {
      window.print();
    }, 80);

    return () => {
      window.clearTimeout(triggerId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [host, job, onComplete]);

  if (!job || !host) {
    return null;
  }

  return createPortal(
    <div className="bdpdf-print-root" aria-hidden="true">
      <div className="bdpdf-print-document">
        <PayrollRunPdfDocument {...job} />
      </div>
    </div>,
    host,
  );
}
