import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../src/styles/index.css';
import { LanguageProvider } from '../../src/app/shared/context';
import { TaskAuditDialog } from '../../src/app/BasicModules/ProcessesTasks/Tasks/components/TaskAuditDialog';
import { CreateAnnouncementModal } from '../../src/app/BasicModules/HumanResources/Announcements/components/CreateAnnouncementModal';
import { esMX } from '../../src/app/BasicModules/HumanResources/Announcements/translations/es-MX';

// Isolated UI fixture: no API calls or business records.
function Fixture() {
  const [modal, setModal] = useState<'audit' | 'announcement' | null>(null);
  const [score, setScore] = useState('5');
  const [notes, setNotes] = useState('');
  return <main className="p-6 space-y-4">
    <h1 className="text-xl font-semibold">Índice · Prueba local sin guardar datos</h1>
    <button className="m-3 rounded-xl border p-3" onClick={() => setModal('audit')}>Probar auditoría</button>
    <button className="m-3 rounded-xl border p-3" onClick={() => setModal('announcement')}>Probar comunicado</button>
    <TaskAuditDialog open={modal === 'audit'} task={{ folio: 'PRUEBA-01', title: 'Revisar el inventario', description: null }} weighting={score} onWeightingChange={setScore} auditNotes={notes} onAuditNotesChange={setNotes} isSubmitting={false} onConfirm={() => setModal(null)} onOpenChange={open => { if (!open) setModal(null); }} />
    <CreateAnnouncementModal copy={esMX.modal} isOpen={modal === 'announcement'} onClose={() => setModal(null)} saveErrorFallback={esMX.feedback.saveAnnouncementFailed} onSave={async () => { throw new Error('No se pudo guardar el comunicado. Revisa tu conexión e inténtalo de nuevo.'); }} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<LanguageProvider><Fixture /></LanguageProvider>);
