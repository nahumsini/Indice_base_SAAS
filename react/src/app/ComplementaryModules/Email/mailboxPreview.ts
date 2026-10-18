export type MailFolder = 'inbox' | 'sent' | 'drafts' | 'archive' | 'trash';
export type MailMessage = { id: string; sender: string; address: string; subject: string; body: string; folder: MailFolder; read: boolean; starred: boolean };
export const previewMessages: MailMessage[] = [
    { id: 'demo-1', sender: 'Equipo de compras', address: 'compras@example.com', subject: 'Revisión de propuesta comercial', body: 'Hola,\n\nGracias por compartir la propuesta. ¿Podemos revisar los tiempos de entrega esta semana?\n\nQuedamos atentos a tus comentarios.', folder: 'inbox', read: false, starred: true },
    { id: 'demo-2', sender: 'Operaciones', address: 'operaciones@example.com', subject: 'Documentación para la reunión', body: 'Hola,\n\nLa agenda está lista. Revisaremos las actividades pendientes y los siguientes pasos.\n\nSaludos.', folder: 'inbox', read: false, starred: false },
    { id: 'demo-3', sender: 'Equipo Indice', address: 'equipo@example.com', subject: 'Bienvenido a tu espacio de correo', body: 'Este mensaje es ficticio. Puedes buscar, destacar, archivar y guardar borradores. Los cambios se borran al recargar.', folder: 'inbox', read: true, starred: false },
    { id: 'demo-4', sender: 'Yo', address: 'cliente@example.com', subject: 'Seguimiento de nuestra conversación', body: 'Hola,\n\nTe comparto los siguientes pasos que acordamos.\n\nSaludos.', folder: 'sent', read: true, starred: false },
];
