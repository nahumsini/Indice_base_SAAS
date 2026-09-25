import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { buildDocumentFileName } from '../../shared/print/documentFileName';
import { printDocumentHtml } from '../../shared/print/documentHtmlPrintEngine';
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

const waitForPrintImages = async (host: HTMLElement) => {
  const pendingImages = Array.from(host.querySelectorAll('img')).filter((image) => !image.complete);
  if (pendingImages.length === 0) return;

  await Promise.race([
    Promise.all(pendingImages.map((image) => new Promise<void>((resolve) => {
      image.addEventListener('load', () => resolve(), { once: true });
      image.addEventListener('error', () => resolve(), { once: true });
    }))),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
  ]);
};

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
    const originalTitle = document.title;
    const period = `${job.detail.run.period_start_date}_${job.detail.run.period_end_date}`;
    document.title = buildDocumentFileName({
      documentType: job.lineId === undefined ? 'payroll-run' : 'payroll-breakdown',
      identifier: job.lineId === undefined
        ? job.reportId
        : `${job.reportId}-L${job.lineId}`,
      period,
      printedAt: job.generatedAt,
    }).replace(/\.pdf$/i, '');

    const handleAfterPrint = () => {
      hasTriggeredRef.current = false;
      document.title = originalTitle;
      onComplete();
    };

    window.addEventListener('afterprint', handleAfterPrint, { once: true });

    let cancelled = false;
    const triggerId = window.setTimeout(() => {
      void waitForPrintImages(host).then(() => {
        if (cancelled) return;
        const output = host.querySelector('.prpdf-report-shell');
        if (output) printDocumentHtml({
          bodyHtml: output.outerHTML, documentTitle: document.title,
          locale: job.locale, includeApplicationStyles: true, pageSize: 'a4',
        });
        handleAfterPrint();
      });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(triggerId);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.title = originalTitle;
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
