import { useState } from 'react';
import { ArrowLeft, FileKey2, Handshake } from 'lucide-react';
import { useNavigate } from 'react-router';
import { IndiceBrandLogo } from '../Auth/components/IndiceBrandLogo';
import { useLanguage } from '../shared/context';
import { ContractsAccessPage } from './contracts-access/ContractsAccessPage';
import { getDistributorPortalCopy } from './contracts-access/translations';
import { DistributorConsultingPage } from './DistributorConsultingPage';

export default function DistributorPortalPage() {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const copy = getDistributorPortalCopy(currentLanguage.code);
  const [activeTab, setActiveTab] = useState<'contracts' | 'consulting'>('contracts');

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#222831] dark:bg-slate-950 dark:text-white">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <IndiceBrandLogo alt="Índice" className="h-10 w-28" imageClassName="w-[132px]" />
            <span className="h-9 w-px bg-slate-200" />
            <div><div className="flex items-center gap-2"><h1 className="text-lg font-semibold">{copy.navigation.portalName}</h1><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-[#143675]">{copy.navigation.local}</span></div></div>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            <ArrowLeft className="h-4 w-4" />{copy.navigation.backToErp}
          </button>
        </div>
        <nav className="mx-auto max-w-[1600px] px-5" aria-label={copy.navigation.portalName}>
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <button type="button" onClick={() => setActiveTab('contracts')} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${activeTab === 'contracts' ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <FileKey2 className="h-4 w-4" />{copy.tabs.contractsAccess}
            </button>
            <button type="button" onClick={() => setActiveTab('consulting')} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${activeTab === 'consulting' ? 'bg-[#2563EB] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <Handshake className="h-4 w-4" />{copy.tabs.consulting}
            </button>
          </div>
        </nav>
        <div className="h-1 bg-[linear-gradient(90deg,#59C3A5_0_25%,#F4C84A_25%_50%,#FF6B5E_50%_75%,#2563EB_75%)]" />
      </header>
      <main className="mx-auto max-w-[1600px] px-5 py-6">
        {activeTab === 'contracts' ? <ContractsAccessPage copy={copy} locale={currentLanguage.code} /> : <DistributorConsultingPage />}
      </main>
    </div>
  );
}
