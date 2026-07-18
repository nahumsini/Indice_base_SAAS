import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router';
import { Clock3, FileText, KeyRound, Loader2, LogOut, Plus, Send, ShieldCheck, Trash2, UploadCloud, WifiOff, X } from 'lucide-react';
import { LoadingBarOverlay } from '../../../components/LoadingBarOverlay';
import { completeKioskIdempotentOperation, kioskIdempotencyKeyFor } from '../../../components/kiosk-engine/kioskIdempotency';
import { KioskPublicShell } from '../../../components/kiosk-engine/KioskPublicShell';
import { useKioskSessionBoundary } from '../../../components/kiosk-engine/useKioskSessionBoundary';
import { ApiClientError } from '../../../lib/apiClient';
import { supplierPortalPublicApi } from '../OrdenesCompra/services/purchaseOrdersApi';
import { useSupplierPortalTranslations, type SupplierPortalTranslations } from './supplierPortalTranslations';
import type {
  SupplierPortalBootstrapResponse,
  SupplierPortalCatalogProduct,
  SupplierPortalContextResponse,
  SupplierPortalInvoiceReceipt,
  SupplierPortalSessionResponse,
  SupplierPortalSubmissionReceipt,
} from '../OrdenesCompra/types/purchaseOrder.types';

type ProposalItem = {
  productId: number | null;
  providerSku: string;
  productName: string;
  productDescription: string;
  quantity: string;
  unitCost: string;
  taxRate: string;
  leadTimeDays: string;
  minimumOrderQuantity: string;
};

const emptyItem = (): ProposalItem => ({
  productId: null,
  providerSku: '',
  productName: '',
  productDescription: '',
  quantity: '1',
  unitCost: '0',
  taxRate: '0',
  leadTimeDays: '',
  minimumOrderQuantity: '',
});

const currencies = ['MXN', 'USD', 'CAD', 'COP', 'BRL'];
const maximumInvoiceFileSizeBytes = 15 * 1024 * 1024;
const allowedInvoiceExtensions = new Set(['docx', 'jpeg', 'jpg', 'pdf', 'png', 'webp', 'xlsx', 'xml']);

function parseNumber(value: string | number | null | undefined) {
  const parsed = Number(String(value ?? '').replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: number, currencyCode: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    currency: currencyCode || 'MXN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

function errorMessage(error: unknown, fallback: string, knownErrors: Record<string, string> = {}) {
  if (error instanceof ApiClientError) {
    const code = error.code;
    const codeMessage = code ? knownErrors[code] : undefined;
    return codeMessage ?? knownErrors[`HTTP_${error.status}`] ?? fallback;
  }
  return error instanceof Error ? knownErrors[error.message] ?? fallback : fallback;
}

function todayIsoDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return '0 KB';
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.ceil(sizeBytes / 1024)} KB`;
}

function isTerminalSessionFailure(error: unknown) {
  return error instanceof ApiClientError
    && (
      error.status === 401
      || error.status === 403
      || error.status === 404
      || error.status === 410
      || /session|csrf|revoked|expired|kiosk_unavailable/i.test(error.code ?? '')
    );
}

function isUnavailablePortalFailure(error: unknown) {
  return error instanceof ApiClientError && (error.status === 404 || error.status === 410);
}

function lifecycleMessage(
  status: SupplierPortalBootstrapResponse['status'] | undefined,
  copy: SupplierPortalTranslations['portal'],
) {
  if (status === 'DISABLED') return copy.disabled;
  if (status === 'EXPIRED') return copy.expired;
  if (status === 'REVOKED') return copy.revoked;
  return '';
}

function hasExpired(expiresAt?: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

function isValidOptionalEmail(value: string) {
  return !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SupplierPortal() {
  const { portalCode = '' } = useParams();
  const { copy, locale } = useSupplierPortalTranslations();
  const copyRef = useRef(copy);
  const activeSessionRef = useRef<{ portalCode: string; session: SupplierPortalSessionResponse } | null>(null);
  const authenticationLockRef = useRef(false);
  const heartbeatLockRef = useRef(false);
  const invoiceLockRef = useRef(false);
  const proposalLockRef = useRef(false);
  const [pin, setPin] = useState('');
  const [bootstrap, setBootstrap] = useState<SupplierPortalBootstrapResponse | null>(null);
  const [session, setSession] = useState<SupplierPortalSessionResponse | null>(null);
  const [context, setContext] = useState<SupplierPortalContextResponse | null>(null);
  const [currencyCode, setCurrencyCode] = useState('MXN');
  const [submittedByName, setSubmittedByName] = useState('');
  const [submittedByEmail, setSubmittedByEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ProposalItem[]>(() => [emptyItem()]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => todayIsoDate());
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [invoiceDocumentUrl, setInvoiceDocumentUrl] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [invoiceSubtotal, setInvoiceSubtotal] = useState('');
  const [invoiceTax, setInvoiceTax] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploadedInvoiceDocument, setUploadedInvoiceDocument] = useState<{ fileName: string; objectKey: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SupplierPortalSubmissionReceipt | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<SupplierPortalInvoiceReceipt | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    copyRef.current = copy;
  }, [copy]);

  const revokeActiveSessionBestEffort = useCallback(() => {
    const activeSession = activeSessionRef.current;
    activeSessionRef.current = null;
    if (activeSession) {
      void supplierPortalPublicApi.logout(activeSession.portalCode, activeSession.session).catch(() => undefined);
    }
  }, []);

  useEffect(() => () => {
    revokeActiveSessionBestEffort();
  }, [revokeActiveSessionBestEffort]);

  const expireSession = useCallback(() => {
    revokeActiveSessionBestEffort();
    authenticationLockRef.current = false;
    heartbeatLockRef.current = false;
    invoiceLockRef.current = false;
    proposalLockRef.current = false;
    setSession(null);
    setContext(null);
    setPin('');
    setLoading(false);
    setSaving(false);
    setInvoiceSaving(false);
    setInvoiceUploading(false);
    setSubmittedByName('');
    setSubmittedByEmail('');
    setNotes('');
    setItems([emptyItem()]);
    setInvoiceNumber('');
    setInvoiceDate(todayIsoDate());
    setInvoiceDueDate('');
    setInvoiceDocumentUrl('');
    setInvoiceNotes('');
    setInvoiceSubtotal('');
    setInvoiceTax('');
    setInvoiceTotal('');
    setInvoiceFile(null);
    setUploadedInvoiceDocument(null);
    setCurrencyCode('MXN');
    setSuccess(null);
    setInvoiceSuccess(null);
    setSessionMessage(copyRef.current.portal.sessionExpired);
  }, [revokeActiveSessionBestEffort]);

  const expireForTerminalFailure = useCallback((failure: unknown) => {
    if (!isTerminalSessionFailure(failure)) return false;
    if (isUnavailablePortalFailure(failure)) {
      setBootstrap(null);
      setError(copyRef.current.portal.revoked);
    }
    expireSession();
    return true;
  }, [expireSession]);

  const closeSession = useCallback(() => {
    revokeActiveSessionBestEffort();
    expireSession();
    setSessionMessage(copyRef.current.portal.sessionClosed);
  }, [expireSession, revokeActiveSessionBestEffort]);

  const { isOnline, isSessionExpiring } = useKioskSessionBoundary({
    active: Boolean(session && context),
    expiresAt: session?.expiresAt,
    inactivityTimeoutSeconds: bootstrap?.inactivityTimeoutSeconds ?? 15 * 60,
    onExpire: expireSession,
  });

  useEffect(() => {
    let mounted = true;
    setBootstrapping(true);
    setBootstrap(null);
    expireSession();
    setError('');
    setSessionMessage('');
    if (!portalCode) {
      setError(copyRef.current.portal.invalidLink);
      setBootstrapping(false);
      return () => { mounted = false; };
    }
    supplierPortalPublicApi.bootstrap(portalCode)
      .then(response => {
        if (mounted) setBootstrap(response);
      })
      .catch(bootstrapError => {
        if (mounted) {
          setError(errorMessage(bootstrapError, copyRef.current.portal.openError, {
            HTTP_404: copyRef.current.portal.revoked,
            HTTP_410: copyRef.current.portal.revoked,
          }));
        }
      })
      .finally(() => {
        if (mounted) setBootstrapping(false);
      });
    return () => { mounted = false; };
  }, [bootstrapAttempt, expireSession, portalCode]);

  useEffect(() => {
    if (!session || !context || !isOnline) return;
    let mounted = true;
    const refreshLifecycle = async () => {
      if (heartbeatLockRef.current) return;
      heartbeatLockRef.current = true;
      try {
        // Bootstrap is deliberately used as the lifecycle probe: unlike /context,
        // it does not validate/touch the controlled session's human activity timer.
        const refreshedBootstrap = await supplierPortalPublicApi.bootstrap(portalCode);
        if (!mounted) return;
        setBootstrap(refreshedBootstrap);
        if (refreshedBootstrap.status !== 'ACTIVE' || hasExpired(refreshedBootstrap.expiresAt)) {
          expireSession();
        }
      } catch (heartbeatError) {
        if (mounted) expireForTerminalFailure(heartbeatError);
      } finally {
        heartbeatLockRef.current = false;
      }
    };
    void refreshLifecycle();
    const heartbeatId = window.setInterval(() => void refreshLifecycle(), 120_000);
    return () => {
      mounted = false;
      window.clearInterval(heartbeatId);
    };
  }, [context, expireForTerminalFailure, expireSession, isOnline, portalCode, session]);

  const totals = useMemo(() => {
    return items.reduce((summary, item) => {
      const subtotal = parseNumber(item.quantity) * parseNumber(item.unitCost);
      const tax = subtotal * (parseNumber(item.taxRate) / 100);
      return {
        subtotal: summary.subtotal + subtotal,
        tax: summary.tax + tax,
        total: summary.total + subtotal + tax,
      };
    }, { subtotal: 0, tax: 0, total: 0 });
  }, [items]);

  const canSubmit = Boolean(
    context
    && context.status === 'ACTIVE'
    && session
    && isOnline
    && !saving
    && isValidOptionalEmail(submittedByEmail)
    && items.length > 0
    && items.every(item => item.productName.trim() && parseNumber(item.quantity) > 0 && parseNumber(item.unitCost) >= 0),
  );

  const invoiceAmounts = useMemo(() => {
    const subtotal = parseNumber(invoiceSubtotal || totals.subtotal);
    const tax = parseNumber(invoiceTax || totals.tax);
    const total = invoiceTotal ? parseNumber(invoiceTotal) : subtotal + tax;
    return { subtotal, tax, total };
  }, [invoiceSubtotal, invoiceTax, invoiceTotal, totals.subtotal, totals.tax]);

  const canSubmitInvoice = Boolean(
    context
    && context.status === 'ACTIVE'
    && session
    && isOnline
    && !invoiceSaving
    && !invoiceUploading
    && invoiceNumber.trim()
    && (!invoiceDate || !invoiceDueDate || invoiceDueDate >= invoiceDate)
    && invoiceAmounts.total > 0,
  );

  const authenticate = async () => {
    if (!portalCode || !pin.trim() || !bootstrap?.csrfToken || bootstrap.status !== 'ACTIVE' || hasExpired(bootstrap.expiresAt) || !isOnline || authenticationLockRef.current) return;
    authenticationLockRef.current = true;
    setLoading(true);
    setError('');
    setSuccess(null);
    setInvoiceSuccess(null);
    try {
      const response = await supplierPortalPublicApi.authenticate(portalCode, pin.trim(), bootstrap.csrfToken);
      activeSessionRef.current = { portalCode, session: response };
      setSession(response);
      setContext(response.context);
      setCurrencyCode(response.context.catalogProducts[0]?.currencyCode || 'MXN');
      setPin('');
      setSessionMessage('');
    } catch (authError) {
      if (isUnavailablePortalFailure(authError)) {
        expireForTerminalFailure(authError);
      } else {
        setError(errorMessage(authError, copy.portal.authenticationError, {
          SUPPLIER_PORTAL_INVALID_SESSION: copy.portal.authenticationError,
        }));
      }
    } finally {
      authenticationLockRef.current = false;
      setLoading(false);
    }
  };

  const addCatalogProduct = (product: SupplierPortalCatalogProduct) => {
    setItems(current => {
      const catalogItem: ProposalItem = {
        productId: product.productId,
        providerSku: product.providerSku || product.productSku || '',
        productName: product.productName,
        productDescription: '',
        quantity: String(product.minimumOrderQuantity || 1),
        unitCost: String(product.costAmount || 0),
        taxRate: '0',
        leadTimeDays: product.leadTimeDays == null ? '' : String(product.leadTimeDays),
        minimumOrderQuantity: product.minimumOrderQuantity == null ? '' : String(product.minimumOrderQuantity),
      };
      return current.length === 1 && !current[0].productName.trim()
        ? [catalogItem]
        : [...current, catalogItem];
    });
    if (product.currencyCode) {
      setCurrencyCode(product.currencyCode);
    }
  };

  const updateItem = <K extends keyof ProposalItem>(index: number, key: K, value: ProposalItem[K]) => {
    setItems(current => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };

  const submit = async () => {
    if (!canSubmit || !context || !session || proposalLockRef.current) return;
    proposalLockRef.current = true;
    setSaving(true);
    setError('');
    setSuccess(null);
    setInvoiceSuccess(null);
    const payload = {
      currencyCode,
      submittedByName: submittedByName.trim() || null,
      submittedByEmail: submittedByEmail.trim() || null,
      notes: notes.trim() || null,
      items: items.map(item => ({
        productId: item.productId,
        providerSku: item.providerSku.trim() || null,
        productName: item.productName.trim(),
        productDescription: item.productDescription.trim() || null,
        imageUrl: null,
        quantity: parseNumber(item.quantity),
        unitCost: parseNumber(item.unitCost),
        taxRate: parseNumber(item.taxRate),
        leadTimeDays: item.leadTimeDays ? Number(item.leadTimeDays) : null,
        minimumOrderQuantity: item.minimumOrderQuantity ? parseNumber(item.minimumOrderQuantity) : null,
      })),
    };
    const operation = 'supplier-portal-proposal';
    try {
      const idempotencyKey = kioskIdempotencyKeyFor(operation, payload);
      const response = await supplierPortalPublicApi.submit(portalCode, session, idempotencyKey, payload);
      completeKioskIdempotentOperation(operation);
      setSuccess(response);
      setItems([emptyItem()]);
      setNotes('');
    } catch (submitError) {
      if (!expireForTerminalFailure(submitError)) {
        setError(errorMessage(submitError, copy.portal.proposalError));
      }
    } finally {
      proposalLockRef.current = false;
      setSaving(false);
    }
  };

  const useProposalTotalForInvoice = () => {
    setInvoiceSubtotal(String(totals.subtotal.toFixed(2)));
    setInvoiceTax(String(totals.tax.toFixed(2)));
    setInvoiceTotal(String(totals.total.toFixed(2)));
  };

  const uploadInvoiceDocumentIfNeeded = async () => {
    if (!session) throw new Error('SUPPLIER_PORTAL_SESSION_UNAVAILABLE');
    if (!invoiceFile) {
      return invoiceDocumentUrl.trim() || null;
    }
    if (uploadedInvoiceDocument?.fileName === invoiceFile.name) {
      return uploadedInvoiceDocument.objectKey;
    }
    setInvoiceUploading(true);
    try {
      const uploadPayload = {
        fileName: invoiceFile.name,
        contentType: invoiceFile.type || null,
        sizeBytes: invoiceFile.size,
      };
      const presignOperation = 'supplier-portal-invoice-presign';
      const presignKey = kioskIdempotencyKeyFor(presignOperation, uploadPayload);
      const presign = await supplierPortalPublicApi.presignInvoiceDocument(
        portalCode,
        session,
        presignKey,
        uploadPayload,
      );
      completeKioskIdempotentOperation(presignOperation);
      const uploadUrl = presign.uploadUrl || presign.upload_url;
      const uploadHeaders = presign.uploadHeaders || presign.upload_headers || {};
      const objectKey = presign.objectKey || presign.object_key || '';
      if (!uploadUrl || !objectKey) {
        throw new Error('SUPPLIER_PORTAL_UPLOAD_PREPARATION_FAILED');
      }
      await supplierPortalPublicApi.uploadDocument(
        uploadUrl,
        invoiceFile,
        presign.contentType || invoiceFile.type || 'application/octet-stream',
        uploadHeaders,
      );
      const registrationPayload = {
        objectKey,
        fileName: presign.fileName || invoiceFile.name,
        contentType: presign.contentType || invoiceFile.type || 'application/octet-stream',
        sizeBytes: presign.sizeBytes || invoiceFile.size,
      };
      const registrationOperation = 'supplier-portal-invoice-register';
      const registrationKey = kioskIdempotencyKeyFor(registrationOperation, registrationPayload);
      const registration = await supplierPortalPublicApi.registerInvoiceDocument(
        portalCode,
        session,
        registrationKey,
        registrationPayload,
      );
      completeKioskIdempotentOperation(registrationOperation);
      const acceptedObjectKey = registration.objectKey || registration.object_key;
      if (!acceptedObjectKey) {
        throw new Error('SUPPLIER_PORTAL_UPLOAD_REGISTRATION_FAILED');
      }
      setUploadedInvoiceDocument({ fileName: invoiceFile.name, objectKey: acceptedObjectKey });
      setInvoiceDocumentUrl(acceptedObjectKey);
      return acceptedObjectKey;
    } finally {
      setInvoiceUploading(false);
    }
  };

  const submitInvoice = async () => {
    if (!canSubmitInvoice || !session || invoiceLockRef.current) return;
    invoiceLockRef.current = true;
    setInvoiceSaving(true);
    setError('');
    setInvoiceSuccess(null);
    setSuccess(null);
    try {
      const documentReference = await uploadInvoiceDocumentIfNeeded();
      const payload = {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate || null,
        dueDate: invoiceDueDate || null,
        subtotalAmount: invoiceAmounts.subtotal,
        taxAmount: invoiceAmounts.tax,
        totalAmount: invoiceAmounts.total,
        currencyCode,
        notes: invoiceNotes.trim() || null,
        documentUrl: documentReference,
        submittedByName: submittedByName.trim() || null,
      };
      const operation = 'supplier-portal-invoice';
      const idempotencyKey = kioskIdempotencyKeyFor(operation, payload);
      const response = await supplierPortalPublicApi.submitInvoice(portalCode, session, idempotencyKey, payload);
      completeKioskIdempotentOperation(operation);
      setInvoiceSuccess(response);
      setInvoiceNumber('');
      setInvoiceDocumentUrl('');
      setInvoiceFile(null);
      setUploadedInvoiceDocument(null);
      setInvoiceNotes('');
      setInvoiceSubtotal('');
      setInvoiceTax('');
      setInvoiceTotal('');
    } catch (submitError) {
      if (!expireForTerminalFailure(submitError)) {
        setError(errorMessage(submitError, copy.portal.invoiceError, {
          SUPPLIER_PORTAL_DOCUMENT_UPLOAD_FAILED: copy.portal.uploadDocumentError,
          SUPPLIER_PORTAL_SESSION_UNAVAILABLE: copy.portal.sessionUnavailable,
          SUPPLIER_PORTAL_UPLOAD_PREPARATION_FAILED: copy.portal.uploadPreparationError,
          SUPPLIER_PORTAL_UPLOAD_REGISTRATION_FAILED: copy.portal.uploadRegistrationError,
        }));
      }
    } finally {
      invoiceLockRef.current = false;
      setInvoiceSaving(false);
    }
  };

  const selectInvoiceFile = (file: File | null) => {
    setError('');
    if (!file) {
      setInvoiceFile(null);
      setUploadedInvoiceDocument(null);
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!allowedInvoiceExtensions.has(extension)) {
      setError(copy.portal.invalidFileType);
      return;
    }
    if (file.size <= 0 || file.size > maximumInvoiceFileSizeBytes) {
      setError(copy.portal.invalidFileSize);
      return;
    }
    setInvoiceFile(file);
    setUploadedInvoiceDocument(null);
    setInvoiceDocumentUrl('');
  };

  const bootstrapStatus = bootstrap?.status === 'ACTIVE' && hasExpired(bootstrap.expiresAt)
    ? 'EXPIRED'
    : bootstrap?.status;
  const unavailableMessage = lifecycleMessage(bootstrapStatus, copy.portal);

  if (!context || !session) {
    return (
      <KioskPublicShell
        banners={!isOnline ? <OfflineBanner message={copy.portal.offline} /> : null}
        errorMessage={error}
        header={<PortalHeader label={copy.portal.portalLabel} title={copy.portal.publicTitle} subtitle={copy.portal.publicSubtitle} />}
        loadingOverlay={<LoadingBarOverlay isVisible={bootstrapping || loading} title={copy.portal.validatingTitle} description={copy.portal.validatingBootstrap} />}
        maxWidthClassName="max-w-[520px]"
        sessionExpiredMessage={sessionMessage || null}
      >
        <section className="mx-auto my-auto w-full max-w-md space-y-5 py-5 sm:py-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                <KeyRound className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-black text-slate-950 dark:text-white">{copy.portal.secureAccess}</h1>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {copy.portal.secureAccessDescription}
                </p>
              </div>
            </div>

            {unavailableMessage ? (
              <div role="status" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                <Clock3 className="mb-2 h-5 w-5" />
                {unavailableMessage}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {!bootstrap && !bootstrapping && portalCode ? (
                  <button type="button" onClick={() => setBootstrapAttempt(current => current + 1)} className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 outline-none hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-orange-900/50 dark:bg-orange-950/30 dark:text-orange-100">
                    {copy.portal.retryPortal}
                  </button>
                ) : null}
                <label className="block space-y-2">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.portal.pin}</span>
                  <input
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={20}
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\s/g, ''))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void authenticate();
                    }}
                    className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl font-black tracking-[0.2em] text-slate-950 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </label>
                <button type="button" disabled={bootstrapping || loading || !isOnline || bootstrapStatus !== 'ACTIVE' || !pin.trim()} onClick={() => void authenticate()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {copy.portal.signIn}
                </button>
              </div>
            )}
          </div>
        </section>
      </KioskPublicShell>
    );
  }

  const successMessage = invoiceSuccess
    ? copy.portal.invoiceSuccess(invoiceSuccess.invoiceNumber)
    : success
      ? copy.portal.proposalSuccess(success.submissionNumber)
      : null;
  const signedInSubtitle = [context.providerName, context.unitName, context.businessName]
    .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    .join(' · ') || copy.portal.publicSubtitle;
  const signedInLabel = context.companyName
    ? `${context.companyName} · ${copy.portal.portalLabel}`
    : copy.portal.portalLabel;

  return (
    <KioskPublicShell
      banners={(
        <>
          {!isOnline ? <OfflineBanner message={copy.portal.offline} /> : null}
          {isSessionExpiring ? <div role="status" className="bg-amber-50 px-4 py-2 text-center text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-100">{copy.portal.sessionExpiring}</div> : null}
        </>
      )}
      errorMessage={error}
      header={(
        <PortalHeader
          label={signedInLabel}
          title={context.kioskName || context.providerName}
          subtitle={signedInSubtitle}
          actions={(
            <div className="flex items-center gap-2">
              <div className="hidden rounded-2xl bg-white/10 px-4 py-2 text-right sm:block">
                <p className="text-xs font-bold text-white/60">{copy.portal.proposalTotal}</p>
                <p className="text-xl font-black">{formatMoney(totals.total, currencyCode, locale)}</p>
              </div>
              <button type="button" onClick={closeSession} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label={copy.portal.closeSession}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{copy.portal.exit}</span>
              </button>
            </div>
          )}
        />
      )}
      loadingOverlay={<LoadingBarOverlay isVisible={loading} title={copy.portal.validatingTitle} description={copy.portal.validatingSession} />}
      maxWidthClassName="max-w-7xl"
      successMessage={successMessage}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(280px,340px)]">
          <aside className="space-y-4">
            <Panel title={copy.portal.linkedCatalog} subtitle={copy.portal.linkedCatalogSubtitle}>
              {context.catalogProducts.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {copy.portal.emptyCatalog}
                </p>
              ) : context.catalogProducts.map((product) => (
                <button key={product.productId} type="button" onClick={() => addCatalogProduct(product)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-orange-200 hover:bg-orange-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-orange-500/10">
                  <p className="font-black text-slate-950 dark:text-white">{product.productName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{product.providerSku || product.productSku || copy.portal.noSku}</p>
                  <p className="mt-3 text-lg font-black text-orange-600">{formatMoney(parseNumber(product.costAmount), product.currencyCode, locale)}</p>
                </button>
              ))}
            </Panel>
          </aside>

          <section className="space-y-4">
            <Panel title={copy.portal.proposedItems} subtitle={copy.portal.proposedItemsSubtitle}>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <article key={index} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-sm font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{copy.portal.item(index + 1)}</p>
                          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.productId ? copy.portal.linkedProduct(item.productId) : copy.portal.manualProduct}</p>
                        </div>
                      </div>
                      <button type="button" aria-label={copy.portal.removeItem(index + 1)} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl p-2 text-red-500 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <Input label={copy.portal.product} value={item.productName} onChange={(value) => updateItem(index, 'productName', value)} />
                      <Input label={copy.portal.supplierSku} value={item.providerSku} onChange={(value) => updateItem(index, 'providerSku', value)} />
                      <Input label={copy.portal.quantity} type="number" value={item.quantity} onChange={(value) => updateItem(index, 'quantity', value)} />
                      <Input label={copy.portal.unitCost} type="number" value={item.unitCost} onChange={(value) => updateItem(index, 'unitCost', value)} />
                      <Input label={copy.portal.taxPercent} type="number" value={item.taxRate} onChange={(value) => updateItem(index, 'taxRate', value)} />
                      <Input label={copy.portal.leadTimeDays} type="number" value={item.leadTimeDays} onChange={(value) => updateItem(index, 'leadTimeDays', value)} />
                      <Input label={copy.portal.minimumOrder} type="number" value={item.minimumOrderQuantity} onChange={(value) => updateItem(index, 'minimumOrderQuantity', value)} />
                    </div>
                    <label className="mt-3 block space-y-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.portal.description}</span>
                      <textarea value={item.productDescription} onChange={(event) => updateItem(index, 'productDescription', event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    </label>
                  </article>
                ))}
              </div>
              <button type="button" onClick={() => setItems(current => [...current, emptyItem()])} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                {copy.portal.addManualItem}
              </button>
            </Panel>
          </section>

          <aside className="space-y-4">
            <Panel title={copy.portal.summary} subtitle={copy.portal.summarySubtitle}>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.portal.currency}</span>
                <select value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  {currencies.map(currency => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <Input label={copy.portal.yourName} value={submittedByName} onChange={setSubmittedByName} />
              <Input label={copy.portal.email} type="email" value={submittedByEmail} onChange={setSubmittedByEmail} />
              {!isValidOptionalEmail(submittedByEmail) ? <p className="text-xs font-bold text-red-600 dark:text-red-300">{copy.portal.invalidEmail}</p> : null}
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.portal.notes}</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <div className="space-y-2 rounded-2xl bg-slate-950 p-4 text-white">
                <Summary label={copy.portal.subtotal} value={formatMoney(totals.subtotal, currencyCode, locale)} />
                <Summary label={copy.portal.tax} value={formatMoney(totals.tax, currencyCode, locale)} />
                <Summary label={copy.portal.total} value={formatMoney(totals.total, currencyCode, locale)} large />
              </div>
              <button type="button" disabled={!canSubmit} onClick={() => void submit()} className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {copy.portal.sendProposal}
              </button>
            </Panel>

            <Panel title={copy.portal.supplierInvoice} subtitle={copy.portal.supplierInvoiceSubtitle}>
              <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{copy.portal.invoiceReviewNotice}</span>
              </div>
              <Input label={copy.portal.invoiceNumber} value={invoiceNumber} onChange={setInvoiceNumber} />
              <Input label={copy.portal.invoiceDate} type="date" value={invoiceDate} onChange={setInvoiceDate} />
              <Input label={copy.portal.invoiceDueDate} type="date" value={invoiceDueDate} onChange={setInvoiceDueDate} />
              {invoiceDate && invoiceDueDate && invoiceDueDate < invoiceDate ? <p className="text-xs font-bold text-red-600 dark:text-red-300">{copy.portal.invalidDueDate}</p> : null}
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm dark:bg-slate-900 dark:text-orange-200">
                    {invoiceUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{copy.portal.invoiceFile}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {copy.portal.invoiceFileHint}
                    </p>
                  </div>
                </div>
                <label className="mt-3 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  {copy.portal.selectFile}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xml,.docx,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/xml,text/xml,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(event) => {
                      selectInvoiceFile(event.target.files?.[0] ?? null);
                      event.target.value = '';
                    }}
                  />
                </label>
                {invoiceFile ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    <span className="truncate">{invoiceFile.name} · {formatFileSize(invoiceFile.size)}</span>
                    <button
                      type="button"
                      aria-label={copy.portal.removeFile}
                      onClick={() => {
                        setInvoiceFile(null);
                        setUploadedInvoiceDocument(null);
                        setInvoiceDocumentUrl('');
                      }}
                      className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
                {uploadedInvoiceDocument ? (
                  <p className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-300">{copy.portal.uploadedFile}</p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input label={copy.portal.invoiceSubtotal} type="number" value={invoiceSubtotal} onChange={setInvoiceSubtotal} />
                <Input label={copy.portal.invoiceTax} type="number" value={invoiceTax} onChange={setInvoiceTax} />
                <Input label={copy.portal.invoiceTotalInput} type="number" value={invoiceTotal} onChange={setInvoiceTotal} />
              </div>
              <button type="button" onClick={useProposalTotalForInvoice} className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800">
                {copy.portal.useProposalTotal}
              </button>
              <label className="block space-y-2">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{copy.portal.invoiceNotes}</span>
                <textarea value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                <Summary label={copy.portal.invoiceTotal} value={formatMoney(invoiceAmounts.total, currencyCode, locale)} large tone="light" />
              </div>
              <button type="button" disabled={!canSubmitInvoice} onClick={() => void submitInvoice()} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950">
                {invoiceSaving || invoiceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {invoiceUploading ? copy.portal.uploadingDocument : copy.portal.sendInvoice}
              </button>
            </Panel>
          </aside>
        </div>
    </KioskPublicShell>
  );
}

function PortalHeader({ actions, label, subtitle, title }: { actions?: ReactNode; label: string; subtitle: string; title: string }) {
  return (
    <header className="bg-slate-950 px-4 py-4 text-white sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-orange-200">{label}</p>
            <h1 className="truncate text-xl font-black sm:text-2xl">{title}</h1>
            <p className="truncate text-xs font-semibold text-white/70 sm:text-sm">{subtitle}</p>
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}

function OfflineBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-3 text-center text-sm font-bold text-amber-950 dark:bg-amber-950 dark:text-amber-100">
      <WifiOff className="h-4 w-4" />
      {message}
    </div>
  );
}

function Panel({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>
      </header>
      <div className="space-y-3 p-5">{children}</div>
    </section>
  );
}

function Input({ label, onChange, type = 'text', value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        inputMode={type === 'number' ? 'decimal' : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </label>
  );
}

function Summary({
  label,
  large = false,
  tone = 'dark',
  value,
}: {
  label: string;
  large?: boolean;
  tone?: 'dark' | 'light';
  value: string;
}) {
  const labelClass = tone === 'dark'
    ? 'text-white/55'
    : 'text-slate-500 dark:text-slate-400';
  const valueClass = tone === 'dark'
    ? 'text-white'
    : 'text-slate-950 dark:text-white';
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs font-black uppercase tracking-[0.14em] ${labelClass}`}>{label}</span>
      <span className={`${large ? 'text-2xl font-black' : 'text-sm font-bold'} ${valueClass}`}>{value}</span>
    </div>
  );
}
