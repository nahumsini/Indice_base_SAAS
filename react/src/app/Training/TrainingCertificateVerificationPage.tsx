import { useEffect, useState } from 'react';
import { Award, LoaderCircle, ShieldCheck, ShieldX } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { apiClient } from '../lib/apiClient';

type Verification = { authentic: boolean; folio: string; program_version: string; issued_at: string; expires_at: string; status: 'ACTIVE' | 'EXPIRED' };

export default function TrainingCertificateVerificationPage() {
  const { folio = '' } = useParams();
  const [params] = useSearchParams();
  const [result, setResult] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  useEffect(() => {
    const token = params.get('token') ?? '';
    void apiClient<Verification>(`/api/v1/public/training-certificates/${encodeURIComponent(folio)}?token=${encodeURIComponent(token)}`)
      .then(setResult).catch(() => setInvalid(true)).finally(() => setLoading(false));
  }, [folio, params]);
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-5 text-slate-950"><section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-950 text-white"><Award className="h-5 w-5" /></span><div><p className="text-xs font-medium uppercase tracking-wider text-[#177D66]">Academia Índice</p><h1 className="text-xl font-medium">Validación de certificado</h1></div></div>{loading ? <div className="mt-8 flex items-center gap-3 text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" />Validando autenticidad…</div> : invalid || !result ? <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5"><ShieldX className="h-8 w-8 text-red-600" /><h2 className="mt-3 text-lg font-medium">Certificado no válido</h2><p className="mt-2 text-sm text-slate-600">El folio o el código privado de verificación no coinciden con un certificado emitido por Índice.</p></div> : <div className={`mt-8 rounded-xl border p-5 ${result.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><ShieldCheck className={`h-8 w-8 ${result.status === 'ACTIVE' ? 'text-emerald-700' : 'text-amber-700'}`} /><h2 className="mt-3 text-lg font-medium">Certificado auténtico · {result.status === 'ACTIVE' ? 'Vigente' : 'Vencido'}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Folio</dt><dd className="mt-1 font-medium">{result.folio}</dd></div><div><dt className="text-slate-500">Programa</dt><dd className="mt-1 font-medium">Versión {result.program_version}</dd></div><div><dt className="text-slate-500">Expedido</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(result.issued_at))}</dd></div><div><dt className="text-slate-500">Vigencia</dt><dd className="mt-1 font-medium">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(result.expires_at))}</dd></div></dl><p className="mt-4 text-xs leading-5 text-slate-500">Por privacidad, esta consulta pública confirma autenticidad y vigencia, pero no muestra datos personales del titular.</p></div>}</section></main>;
}
