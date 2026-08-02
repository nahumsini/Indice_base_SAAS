import { useMemo } from 'react';
import { Download, Printer, FileText, TrendingUp, TrendingDown, CreditCard, Calendar } from 'lucide-react';
import { Customer } from '../types/customer.types';
import { Transaction } from '../types/transaction.types';
import { mockTransactions } from '../data/transactions.mock';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { buildDocumentFileName } from '../../../shared/print/documentFileName';
import { addStandardPdfFooters, applyStandardPdfMetadata, openStandardPdfForPrint } from '../../../shared/print/documentPdfEngine';
import {
  PosModalFrame,
  posModalModuleFooterClassName,
  posModalSecondaryActionClassName,
} from '../../Sale/components/PosModalFrame';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
}

export function AccountStatementModal({ isOpen, onClose, customer }: AccountStatementModalProps) {
  if (!isOpen) return null;

  const transactions = useMemo(() => {
    return mockTransactions
      .filter(t => t.customerId === customer.id)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [customer.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const getTransactionTypeLabel = (type: Transaction['type']) => {
    const labels = {
      sale: 'Venta',
      payment: 'Pago',
      credit_note: 'Nota de credito',
      debit_note: 'Nota de debito',
    };
    return labels[type];
  };

  const getTransactionTypeColor = (type: Transaction['type']) => {
    const colors = {
      sale: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
      payment: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
      credit_note: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
      debit_note: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
    };
    return colors[type];
  };

  const totals = useMemo(() => {
    const sales = transactions
      .filter(t => t.type === 'sale' || t.type === 'debit_note')
      .reduce((sum, t) => sum + t.amount, 0);

    const payments = transactions
      .filter(t => t.type === 'payment' || t.type === 'credit_note')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return { sales, payments };
  }, [transactions]);

  const generatePDF = () => {
    const doc = new jsPDF({ format: 'a4', orientation: 'portrait', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;
    applyStandardPdfMetadata(doc, {
      subject: 'Estado de cuenta de cliente',
      title: `Estado de cuenta - ${customer.name}`,
    });

    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Estado de Cuenta', 15, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 15, 26);

    yPos = 45;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const infoY = yPos;
    const col1X = 15;
    const col2X = 75;
    const col3X = 135;
    const col4X = 165;

    doc.setTextColor(100, 100, 100);
    doc.text('RFC', col1X, infoY);
    doc.text('Email', col2X, infoY);
    doc.text('Telefono', col3X, infoY);
    doc.text('Cuenta desde', col4X, infoY);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.rfc || 'N/A', col1X, infoY + 5);
    doc.text(customer.email, col2X, infoY + 5);
    doc.text(customer.phone, col3X, infoY + 5);
    doc.text(formatDate(customer.createdAt), col4X, infoY + 5);

    yPos += 18;

    const cardWidth = 45;
    const cardHeight = 20;
    const cardSpacing = 3;
    const cardsY = yPos;

    doc.setFillColor(219, 234, 254);
    doc.roundedRect(15, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Limite de credito', 17, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.creditLimit ? formatCurrency(customer.creditLimit) : 'N/A', 17, cardsY + 14);

    doc.setFillColor(254, 226, 226);
    doc.roundedRect(15 + cardWidth + cardSpacing, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo actual', 17 + cardWidth + cardSpacing, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.currentBalance), 17 + cardWidth + cardSpacing, cardsY + 14);

    doc.setFillColor(220, 252, 231);
    doc.roundedRect(15 + (cardWidth + cardSpacing) * 2, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Credito disponible', 17 + (cardWidth + cardSpacing) * 2, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(
      customer.creditLimit ? formatCurrency(customer.creditLimit - customer.currentBalance) : 'N/A',
      17 + (cardWidth + cardSpacing) * 2,
      cardsY + 14
    );

    doc.setFillColor(243, 232, 255);
    doc.roundedRect(15 + (cardWidth + cardSpacing) * 3, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(147, 51, 234);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total compras', 17 + (cardWidth + cardSpacing) * 3, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.totalPurchases), 17 + (cardWidth + cardSpacing) * 3, cardsY + 14);

    yPos = cardsY + cardHeight + 10;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de movimientos', 15, yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de transacciones: ${transactions.length}`, 15, yPos + 5);

    yPos += 10;

    const tableData = transactions.map(t => [
      formatDate(t.date),
      getTransactionTypeLabel(t.type),
      t.description,
      t.reference || t.invoice || '-',
      t.amount > 0 ? formatCurrency(t.amount) : '-',
      t.amount < 0 ? formatCurrency(Math.abs(t.amount)) : '-',
      formatCurrency(t.balance),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Tipo', 'Descripcion', 'Referencia', 'Cargos', 'Abonos', 'Saldo']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [55, 65, 81],
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [0, 0, 0],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        const rowIndex = data.row.index;
        if (data.column.index === 4 && data.section === 'body') {
          const transaction = transactions[rowIndex];
          if (transaction.amount > 0) {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
        if (data.column.index === 5 && data.section === 'body') {
          const transaction = transactions[rowIndex];
          if (transaction.amount < 0) {
            data.cell.styles.textColor = [22, 163, 74];
          }
        }
      },
    });

    let finalY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? yPos) + 10;
    if (finalY + 38 > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage();
      finalY = 18;
    }

    doc.setFillColor(249, 250, 251);
    doc.rect(0, finalY, pageWidth, 25, 'F');

    const totalsY = finalY + 8;
    const totalsStartX = pageWidth - 135;

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total cargos', totalsStartX, totalsY);
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totals.sales), totalsStartX, totalsY + 7, { align: 'left' });

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total abonos', totalsStartX + 45, totalsY);
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totals.payments), totalsStartX + 45, totalsY + 7, { align: 'left' });

    doc.setDrawColor(200, 200, 200);
    doc.line(totalsStartX + 85, totalsY - 5, totalsStartX + 85, totalsY + 12);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo final', totalsStartX + 92, totalsY);
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.currentBalance), totalsStartX + 92, totalsY + 8, { align: 'left' });

    addStandardPdfFooters(doc, {
      confidentiality: 'Confidencial',
      folio: customer.id,
      locale: 'es-MX',
    });

    return doc;
  };

  const handlePrint = () => {
    openStandardPdfForPrint(generatePDF());
  };

  const handleDownload = () => {
    const doc = generatePDF();
    doc.save(buildDocumentFileName({
      documentType: 'account-statement',
      identifier: customer.id,
      period: new Date().toISOString().slice(0, 10),
    }));
  };

  return (
    <PosModalFrame
      modalType="operational-workspace"
      onClose={onClose}
      closeLabel="Cerrar estado de cuenta"
      title="Estado de cuenta"
      subtitle={customer.name}
      eyebrow="Cliente POS"
      icon={<FileText className="h-6 w-6" />}
      tone="coral"
      size="lg"
      actions={
        <>
          <button
            type="button"
            onClick={handlePrint}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            title="Imprimir"
            aria-label="Imprimir estado de cuenta"
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
            title="Descargar PDF"
            aria-label="Descargar estado de cuenta en PDF"
          >
            <Download className="h-5 w-5" />
          </button>
        </>
      }
      footerClassName={posModalModuleFooterClassName}
      footer={
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {transactions.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] font-medium tracking-normal text-white/70">Total cargos</p>
                <p className="text-lg font-medium text-white">{formatCurrency(totals.sales)}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium tracking-normal text-white/70">Total abonos</p>
                <p className="text-lg font-medium text-white">{formatCurrency(totals.payments)}</p>
              </div>
              <div className="border-white/30 sm:border-l sm:pl-4">
                <p className="text-[11px] font-medium tracking-normal text-white/70">Saldo final</p>
                <p className="text-xl font-medium text-white">{formatCurrency(customer.currentBalance)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-white/80">Sin movimientos registrados.</p>
          )}

          <button type="button" onClick={onClose} className={posModalSecondaryActionClassName}>
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-1 text-xs font-medium tracking-normal text-gray-500 dark:text-gray-400">RFC</p>
              <p className="font-mono text-sm font-medium text-gray-900 dark:text-white">{customer.rfc || 'N/A'}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium tracking-normal text-gray-500 dark:text-gray-400">Email</p>
              <p className="break-words text-sm font-medium text-gray-900 dark:text-white">{customer.email}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium tracking-normal text-gray-500 dark:text-gray-400">Telefono</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.phone}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium tracking-normal text-gray-500 dark:text-gray-400">Cliente desde</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="mb-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <p className="text-xs font-medium tracking-normal text-blue-700 dark:text-blue-300">Limite de credito</p>
            </div>
            <p className="text-xl font-medium text-blue-950 dark:text-blue-200">
              {customer.creditLimit ? formatCurrency(customer.creditLimit) : 'N/A'}
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-xs font-medium tracking-normal text-red-700 dark:text-red-300">Saldo actual</p>
            </div>
            <p className="text-xl font-medium text-red-950 dark:text-red-200">{formatCurrency(customer.currentBalance)}</p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-2 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-xs font-medium tracking-normal text-green-700 dark:text-green-300">Credito disponible</p>
            </div>
            <p className="text-xl font-medium text-green-950 dark:text-green-200">
              {customer.creditLimit
                ? formatCurrency(customer.creditLimit - customer.currentBalance)
                : 'N/A'
              }
            </p>
          </div>

          <div className="rounded-lg border border-[#FF6B5E]/30 bg-[#FF6B5E]/10 p-4 dark:border-[#FF6B5E]/35 dark:bg-[#FF6B5E]/10">
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#C64237] dark:text-[#FFB5AE]" />
              <p className="text-xs font-medium tracking-normal text-[#C64237] dark:text-[#FFB5AE]">Total compras</p>
            </div>
            <p className="text-xl font-medium text-[#222831] dark:text-white">{formatCurrency(customer.totalPurchases)}</p>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-200 p-5 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Historial de movimientos</h3>
            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
              Total de transacciones: {transactions.length}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p className="font-medium text-gray-500 dark:text-gray-400">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px]">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Descripcion</th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Referencia</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Cargos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Abonos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium tracking-normal text-gray-600 dark:text-gray-400">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/70">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {transaction.reference || transaction.invoice || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {transaction.amount > 0 ? (
                          <span className="text-red-600 dark:text-red-400">{formatCurrency(transaction.amount)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {transaction.amount < 0 ? (
                          <span className="text-green-600 dark:text-green-400">{formatCurrency(Math.abs(transaction.amount))}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(transaction.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PosModalFrame>
  );
}
