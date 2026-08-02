import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../../../shared/context';
import { IndiceViewState } from '../../../components/frontend-os';
import { cn } from '../../../components/ui/utils';
import { useSalesCrm } from '../salesCrmContext';

type DataStateCopy = {
  loadingTitle: string;
  loadingDescription: string;
  loadErrorTitle: string;
  loadErrorDescription: string;
  partialTitle: string;
  partialDescription: string;
  syncErrorTitle: string;
  syncErrorDescription: string;
  syncing: string;
  retry: string;
  dismiss: string;
};

const copyByLocale: Record<string, DataStateCopy> = {
  'es-MX': {
    loadingTitle: 'Preparando el control comercial',
    loadingDescription: 'Estamos consultando la información más reciente de ventas.',
    loadErrorTitle: 'No pudimos cargar Sales',
    loadErrorDescription: 'La información no está disponible todavía. Reintenta para consultar el estado real.',
    partialTitle: 'Hay información parcial',
    partialDescription: 'Una parte de Sales no respondió. Puedes continuar consultando los datos disponibles o reintentar.',
    syncErrorTitle: 'El cambio no se guardó',
    syncErrorDescription: 'No pudimos confirmar el cambio con el servidor. Reintenta antes de continuar.',
    syncing: 'Actualizando información…',
    retry: 'Reintentar',
    dismiss: 'Cerrar aviso',
  },
  'es-CO': {
    loadingTitle: 'Preparando el control comercial', loadingDescription: 'Estamos consultando la información más reciente de ventas.',
    loadErrorTitle: 'No pudimos cargar Sales', loadErrorDescription: 'La información no está disponible todavía. Vuelve a intentarlo para consultar el estado real.',
    partialTitle: 'Hay información parcial', partialDescription: 'Una parte de Sales no respondió. Puedes continuar con los datos disponibles o volver a intentarlo.',
    syncErrorTitle: 'El cambio no se guardó', syncErrorDescription: 'No pudimos confirmar el cambio con el servidor. Vuelve a intentarlo antes de continuar.',
    syncing: 'Actualizando información…', retry: 'Volver a intentar', dismiss: 'Cerrar aviso',
  },
  'en-CA': {
    loadingTitle: 'Preparing commercial control', loadingDescription: 'We are retrieving the latest sales information.',
    loadErrorTitle: 'Sales could not be loaded', loadErrorDescription: 'The information is not available yet. Retry to retrieve the confirmed state.',
    partialTitle: 'Some information is unavailable', partialDescription: 'Part of Sales did not respond. You can use the available data or retry.',
    syncErrorTitle: 'The change was not saved', syncErrorDescription: 'The server did not confirm this change. Retry before continuing.',
    syncing: 'Updating information…', retry: 'Retry', dismiss: 'Dismiss notice',
  },
  'en-US': {
    loadingTitle: 'Preparing commercial control', loadingDescription: 'We are retrieving the latest sales information.',
    loadErrorTitle: 'Sales could not be loaded', loadErrorDescription: 'The information is not available yet. Retry to retrieve the confirmed state.',
    partialTitle: 'Some information is unavailable', partialDescription: 'Part of Sales did not respond. You can use the available data or retry.',
    syncErrorTitle: 'The change was not saved', syncErrorDescription: 'The server did not confirm this change. Retry before continuing.',
    syncing: 'Updating information…', retry: 'Retry', dismiss: 'Dismiss notice',
  },
  'fr-CA': {
    loadingTitle: 'Préparation du contrôle commercial', loadingDescription: 'Nous récupérons les données de vente les plus récentes.',
    loadErrorTitle: 'Impossible de charger Sales', loadErrorDescription: 'Les données ne sont pas encore disponibles. Réessayez pour obtenir l’état confirmé.',
    partialTitle: 'Certaines données sont indisponibles', partialDescription: 'Une partie de Sales ne répond pas. Vous pouvez utiliser les données disponibles ou réessayer.',
    syncErrorTitle: 'La modification n’a pas été enregistrée', syncErrorDescription: 'Le serveur n’a pas confirmé cette modification. Réessayez avant de continuer.',
    syncing: 'Mise à jour des données…', retry: 'Réessayer', dismiss: 'Fermer l’avis',
  },
  'pt-BR': {
    loadingTitle: 'Preparando o controle comercial', loadingDescription: 'Estamos buscando as informações de vendas mais recentes.',
    loadErrorTitle: 'Não foi possível carregar Sales', loadErrorDescription: 'As informações ainda não estão disponíveis. Tente novamente para obter o estado confirmado.',
    partialTitle: 'Há informações indisponíveis', partialDescription: 'Parte de Sales não respondeu. Você pode usar os dados disponíveis ou tentar novamente.',
    syncErrorTitle: 'A alteração não foi salva', syncErrorDescription: 'O servidor não confirmou esta alteração. Tente novamente antes de continuar.',
    syncing: 'Atualizando informações…', retry: 'Tentar novamente', dismiss: 'Fechar aviso',
  },
  'ko-CA': {
    loadingTitle: '영업 관리 준비 중', loadingDescription: '최신 영업 정보를 불러오고 있습니다.',
    loadErrorTitle: 'Sales를 불러올 수 없습니다', loadErrorDescription: '정보를 아직 사용할 수 없습니다. 확인된 상태를 불러오려면 다시 시도하세요.',
    partialTitle: '일부 정보를 사용할 수 없습니다', partialDescription: 'Sales의 일부가 응답하지 않았습니다. 사용 가능한 데이터를 보거나 다시 시도할 수 있습니다.',
    syncErrorTitle: '변경 사항이 저장되지 않았습니다', syncErrorDescription: '서버에서 변경 사항을 확인하지 못했습니다. 계속하기 전에 다시 시도하세요.',
    syncing: '정보 업데이트 중…', retry: '다시 시도', dismiss: '알림 닫기',
  },
  'zh-CA': {
    loadingTitle: '正在准备销售管理', loadingDescription: '正在获取最新销售数据。',
    loadErrorTitle: '无法加载 Sales', loadErrorDescription: '数据暂不可用。请重试以获取服务器确认的状态。',
    partialTitle: '部分数据不可用', partialDescription: 'Sales 的部分服务未响应。您可以继续查看现有数据或重试。',
    syncErrorTitle: '更改未保存', syncErrorDescription: '服务器未确认此更改。请重试后再继续。',
    syncing: '正在更新数据…', retry: '重试', dismiss: '关闭提示',
  },
};

export function SalesDataStateBoundary({ children }: { children: ReactNode }) {
  const { currentLanguage } = useLanguage();
  const {
    contacts, opportunities, products, quotes, salesRecords, postSaleCases, contracts,
    isLoading, isSyncing, loadError, hasPartialData, syncIssue, reloadAll, clearSyncIssue,
  } = useSalesCrm();
  const copy = copyByLocale[currentLanguage.code] ?? copyByLocale['en-CA'];
  const hasData = [contacts, opportunities, products, quotes, salesRecords, postSaleCases, contracts]
    .some((collection) => collection.length > 0);
  const hasFatalLoadError = Boolean(loadError) && !hasData;

  if (isLoading && !hasData) {
    return (
      <IndiceViewState
        description={copy.loadingDescription}
        title={copy.loadingTitle}
        tone="coral"
        variant="loading"
      />
    );
  }

  if (hasFatalLoadError) {
    return (
      <IndiceViewState
        action={<button type="button" onClick={() => void reloadAll()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FF6B5E] px-4 text-sm font-medium text-[#222831] transition hover:bg-[#e85a4f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B5E]/40">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {copy.retry}
        </button>}
        description={copy.loadErrorDescription}
        title={copy.loadErrorTitle}
        tone="coral"
        variant="error"
      />
    );
  }

  const notice = syncIssue
    ? { title: copy.syncErrorTitle, description: copy.syncErrorDescription, tone: 'error' as const }
    : hasPartialData
      ? { title: copy.partialTitle, description: copy.partialDescription, tone: 'warning' as const }
      : null;

  return (
    <>
      {(isLoading || isSyncing) ? (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#FF6B5E]/25 bg-[#FF6B5E]/5 px-4 py-2 text-sm font-medium text-[#9f352e] dark:text-[#FFB0AA]" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {copy.syncing}
        </div>
      ) : null}
      {notice ? (
        <div className={cn(
          'mb-4 flex items-start gap-3 rounded-2xl border px-4 py-3',
          notice.tone === 'error'
            ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/20'
            : 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/20',
        )} role="alert">
          <AlertTriangle className={cn('mt-0.5 h-5 w-5 shrink-0', notice.tone === 'error' ? 'text-rose-600' : 'text-amber-600')} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-950 dark:text-white">{notice.title}</p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{notice.description}</p>
            <button type="button" onClick={() => void reloadAll()} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-800 underline-offset-4 hover:underline dark:text-white">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.retry}
            </button>
          </div>
          {syncIssue ? (
            <button type="button" onClick={clearSyncIssue} aria-label={copy.dismiss} className="rounded-lg p-1 text-slate-500 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      ) : null}
      {children}
    </>
  );
}
