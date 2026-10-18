import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LanguageProvider } from '../../src/app/shared/context';
import { QuotePreviewModal } from '../../src/app/BasicModules/Sales/Cotizacion/components/QuotePreviewModal';
import { getQuotePdfBlob } from '../../src/app/BasicModules/Sales/Cotizacion/quotePdf';
import { context } from './quotePreviewFixture';
function Fixture() {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const [dark, setDark] = useState(false);
  const quote = long ? { ...context.quote, items: Array.from({ length: 32 }, (_, i) => ({ ...context.quote.items[0], id: String(i), productName: `Servicio de prueba ${i + 1}`, quantity: 2 })), notes: 'Nota extensa con información comercial completa. '.repeat(120), terms: 'Condiciones comerciales completas. '.repeat(120) } : context.quote;
  const binary = async () => {
    const url = URL.createObjectURL(await getQuotePdfBlob({ ...context, quote }));
    const a = document.createElement('a'); a.href = url; a.download = long ? 'quote-long-qa.pdf' : 'quote-short-qa.pdf'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
  return <div className={dark ? 'dark' : ''}>
    <div className="p-6"><h1>Vista previa · datos sintéticos</h1><button onClick={() => setLong(!long)}>{long ? 'Usar cotización corta' : 'Usar cotización larga'}</button> · <button onClick={() => { document.documentElement.classList.toggle('dark', !dark); setDark(!dark); }}>Cambiar tema de prueba</button> · <button onClick={() => setOpen(true)}>Abrir vista previa</button> · <button onClick={binary}>Descargar PDF binario de prueba</button></div>
    <QuotePreviewModal {...context} quote={open ? quote : null} onClose={() => setOpen(false)} />
  </div>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture /></LanguageProvider>);
