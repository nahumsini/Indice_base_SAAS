import React, { useState } from 'react';
import {
  Search,
  Filter,
  Star,
  Paperclip,
  Clock,
  Mail,
  MailOpen,
  AlertCircle,
  Archive,
  Send,
  Trash2,
  Inbox,
  Tag,
  X,
  User,
  ShoppingCart,
  Ticket,
  FileText,
  Receipt,
  Briefcase,
  TrendingUp,
  Phone,
  Building,
} from 'lucide-react';
import { mockEmails, mockFolders, mockLabels } from './mocks/email.mock';
import type { EmailThread } from './types/email.types';

export default function BandejaEntradaTab() {
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(mockEmails[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'no_leido':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'leido':
        return <MailOpen className="h-4 w-4 text-gray-400" />;
      case 'seguimiento':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'urgente':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Mail className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      urgente: 'bg-red-100 text-red-700 border-red-200',
      importante: 'bg-amber-100 text-amber-700 border-amber-200',
      normal: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return styles[priority as keyof typeof styles] || styles.normal;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `Hace ${minutes}m`;
    }
    if (hours < 24) return `Hace ${hours}h`;
    if (hours < 48) return 'Ayer';
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-[calc(100vh-140px)]">
      {/* Sidebar Izquierdo */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        {/* Carpetas */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Carpetas</h3>
          <div className="space-y-1">
            {mockFolders.map((folder) => {
              const Icon = {
                Inbox,
                Clock,
                Send,
                Archive,
                AlertCircle,
                Trash2,
              }[folder.icon] || Inbox;

              return (
                <button
                  key={folder.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{folder.name}</span>
                  </div>
                  {folder.count > 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      folder.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {folder.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Etiquetas */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Etiquetas</h3>
          <div className="space-y-1">
            {mockLabels.map((label) => (
              <button
                key={label.id}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full bg-${label.color}-500`} />
                  <span className="text-sm text-gray-700">{label.name}</span>
                </div>
                <span className="text-xs text-gray-500">{label.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista Central de Correos */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header de búsqueda */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar correos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros rápidos */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['No leídos', 'Importantes', 'Ventas', 'Soporte'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(activeFilter === filter ? null : filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  activeFilter === filter
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de correos */}
        <div className="flex-1 overflow-y-auto">
          {mockEmails.map((email) => (
            <button
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`w-full p-4 border-b border-gray-200 text-left hover:bg-gray-50 transition-colors ${
                selectedEmail?.id === email.id ? 'bg-blue-50' : ''
              } ${!email.isRead ? 'bg-blue-50/30' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(email.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium text-sm ${!email.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                      {email.sender.name}
                    </span>
                    {email.isStarred && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                    {email.hasAttachments && <Paperclip className="h-3 w-3 text-gray-400" />}
                  </div>
                  <p className={`text-sm mb-1 truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {email.subject}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{email.preview}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{formatDate(email.receivedAt)}</span>
                    {email.labels.length > 0 && (
                      <div className="flex gap-1">
                        {email.labels.slice(0, 2).map((label) => (
                          <span
                            key={label}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel Derecho - Vista de Correo + CONTEXTO OPERATIVO */}
      <div className="flex-1 bg-white overflow-y-auto">
        {selectedEmail ? (
          <div className="max-w-4xl mx-auto p-6">
            {/* Header del correo */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedEmail.subject}</h2>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                    {selectedEmail.sender.avatar}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{selectedEmail.sender.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityBadge(selectedEmail.priority)}`}>
                      {selectedEmail.priority}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{selectedEmail.sender.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{selectedEmail.receivedAt.toLocaleString('es-MX')}</p>
                </div>
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Responder
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Marcar seguimiento
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Vincular
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                  Archivar
                </button>
              </div>
            </div>

            {/* Cuerpo del correo */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-gray-700 whitespace-pre-line">{selectedEmail.body}</p>
            </div>

            {/* Adjuntos */}
            {selectedEmail.attachments.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Archivos adjuntos ({selectedEmail.attachments.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedEmail.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                        <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respuestas */}
            {selectedEmail.replies.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Conversación ({selectedEmail.replies.length})</h3>
                <div className="space-y-4">
                  {selectedEmail.replies.map((reply) => (
                    <div key={reply.id} className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm text-gray-900">{reply.sender.name}</span>
                        <span className="text-xs text-gray-500">{reply.sentAt.toLocaleString('es-MX')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{reply.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ⚠️ CONTEXTO OPERATIVO - EL DIFERENCIADOR DE ÍNDICE */}
            <div className="border-t-4 border-blue-500 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Contexto Operativo
              </h3>

              {/* Cliente Relacionado */}
              {selectedEmail.relatedClient && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{selectedEmail.relatedClient.name}</h4>
                        <p className="text-sm text-gray-600">{selectedEmail.relatedClient.email}</p>
                        {selectedEmail.relatedClient.company && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Building className="h-3 w-3" />
                            {selectedEmail.relatedClient.company}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      Última interacción: {selectedEmail.relatedClient.lastInteraction.toLocaleDateString('es-MX')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-gray-600">Ventas Totales</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        ${selectedEmail.relatedClient.totalSales.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Ticket className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-gray-600">Tickets Abiertos</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{selectedEmail.relatedClient.openTickets}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Phone className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-medium text-gray-600">Teléfono</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedEmail.relatedClient.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid de relaciones */}
              <div className="grid grid-cols-2 gap-4">
                {/* Ventas Relacionadas */}
                {selectedEmail.relatedSales && selectedEmail.relatedSales.length > 0 && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-green-600" />
                      Ventas ({selectedEmail.relatedSales.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedEmail.relatedSales.map((sale) => (
                        <div key={sale.id} className="bg-white rounded p-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-gray-600">{sale.folio}</span>
                            <span className="text-xs font-bold text-green-700">
                              ${sale.amount.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{sale.date.toLocaleDateString('es-MX')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tickets Relacionados */}
                {selectedEmail.relatedTickets && selectedEmail.relatedTickets.length > 0 && (
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-amber-600" />
                      Tickets ({selectedEmail.relatedTickets.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedEmail.relatedTickets.map((ticket) => (
                        <div key={ticket.id} className="bg-white rounded p-2">
                          <span className="text-xs font-medium text-gray-900">{ticket.folio}</span>
                          <p className="text-xs text-gray-600 mt-1">{ticket.title}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                              {ticket.status}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facturas Relacionadas */}
                {selectedEmail.relatedInvoices && selectedEmail.relatedInvoices.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-purple-600" />
                      Facturas ({selectedEmail.relatedInvoices.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedEmail.relatedInvoices.map((invoice) => (
                        <div key={invoice.id} className="bg-white rounded p-2">
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-medium text-gray-600">{invoice.folio}</span>
                            <span className="text-xs font-bold text-purple-700">
                              ${invoice.amount.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              invoice.status === 'Vencida' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {invoice.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {invoice.dueDate.toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contratos Relacionados */}
                {selectedEmail.relatedContracts && selectedEmail.relatedContracts.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-600" />
                      Contratos ({selectedEmail.relatedContracts.length})
                    </h5>
                    <div className="space-y-2">
                      {selectedEmail.relatedContracts.map((contract) => (
                        <div key={contract.id} className="bg-white rounded p-2">
                          <span className="text-xs font-medium text-gray-900">{contract.folio}</span>
                          <p className="text-xs text-gray-600 mt-1">{contract.type}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              contract.status === 'Por vencer' 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {contract.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              Vence: {contract.endDate.toLocaleDateString('es-MX')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones rápidas desde contexto */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-3">Acciones Rápidas</h5>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium">
                    Crear Ticket
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium">
                    Crear Tarea
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium">
                    Crear Lead
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium">
                    Crear Seguimiento
                  </button>
                  <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium">
                    Ver Historial Completo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Mail className="h-16 w-16 mx-auto mb-4" />
              <p className="text-lg font-medium">Selecciona un correo para ver su contenido</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
