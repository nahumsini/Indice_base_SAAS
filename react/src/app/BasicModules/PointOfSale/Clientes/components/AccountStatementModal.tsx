import { useMemo } from 'react';
import { X, Download, Printer, FileText, TrendingUp, TrendingDown, CreditCard, Calendar } from 'lucide-react';
import { Customer } from '../types/customer.types';
import { Transaction } from '../types/transaction.types';
import { mockTransactions } from '../data/transactions.mock';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      credit_note: 'Nota de Crédito',
      debit_note: 'Nota de Débito',
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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Header
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Estado de Cuenta', 15, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.name, 15, 26);

    yPos = 45;

    // Customer Information
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const infoY = yPos;
    const col1X = 15;
    const col2X = 75;
    const col3X = 135;
    const col4X = 165;

    // Labels
    doc.setTextColor(100, 100, 100);
    doc.text('RFC', col1X, infoY);
    doc.text('Email', col2X, infoY);
    doc.text('Teléfono', col3X, infoY);
    doc.text('Cuenta desde', col4X, infoY);

    // Values
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.rfc || 'N/A', col1X, infoY + 5);
    doc.text(customer.email, col2X, infoY + 5);
    doc.text(customer.phone, col3X, infoY + 5);
    doc.text(formatDate(customer.createdAt), col4X, infoY + 5);

    yPos += 18;

    // Summary Cards
    const cardWidth = 45;
    const cardHeight = 20;
    const cardSpacing = 3;
    const cardsY = yPos;

    // Card 1 - Límite de Crédito
    doc.setFillColor(219, 234, 254);
    doc.roundedRect(15, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Límite de Crédito', 17, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.creditLimit ? formatCurrency(customer.creditLimit) : 'N/A', 17, cardsY + 14);

    // Card 2 - Saldo Actual
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(15 + cardWidth + cardSpacing, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo Actual', 17 + cardWidth + cardSpacing, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.currentBalance), 17 + cardWidth + cardSpacing, cardsY + 14);

    // Card 3 - Crédito Disponible
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(15 + (cardWidth + cardSpacing) * 2, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Crédito Disponible', 17 + (cardWidth + cardSpacing) * 2, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(
      customer.creditLimit ? formatCurrency(customer.creditLimit - customer.currentBalance) : 'N/A',
      17 + (cardWidth + cardSpacing) * 2,
      cardsY + 14
    );

    // Card 4 - Total Compras
    doc.setFillColor(243, 232, 255);
    doc.roundedRect(15 + (cardWidth + cardSpacing) * 3, cardsY, cardWidth, cardHeight, 2, 2, 'F');
    doc.setTextColor(147, 51, 234);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Compras', 17 + (cardWidth + cardSpacing) * 3, cardsY + 5);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.totalPurchases), 17 + (cardWidth + cardSpacing) * 3, cardsY + 14);

    yPos = cardsY + cardHeight + 10;

    // Transactions Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Historial de Movimientos', 15, yPos);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Total de transacciones: ${transactions.length}`, 15, yPos + 5);

    yPos += 10;

    // Transactions Table
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
      head: [['Fecha', 'Tipo', 'Descripción', 'Referencia', 'Cargos', 'Abonos', 'Saldo']],
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

    // Footer with Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFillColor(249, 250, 251);
    doc.rect(0, finalY, pageWidth, 25, 'F');

    const totalsY = finalY + 8;
    const totalsStartX = pageWidth - 135;

    // Total Cargos
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Cargos', totalsStartX, totalsY);
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totals.sales), totalsStartX, totalsY + 7, { align: 'left' });

    // Total Abonos
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Abonos', totalsStartX + 45, totalsY);
    doc.setTextColor(22, 163, 74);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(totals.payments), totalsStartX + 45, totalsY + 7, { align: 'left' });

    // Saldo Final
    doc.setDrawColor(200, 200, 200);
    doc.line(totalsStartX + 85, totalsY - 5, totalsStartX + 85, totalsY + 12);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Saldo Final', totalsStartX + 92, totalsY);
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(customer.currentBalance), totalsStartX + 92, totalsY + 8, { align: 'left' });

    return doc;
  };

  const handlePrint = () => {
    const doc = generatePDF();
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    const doc = generatePDF();
    doc.save(`Estado_Cuenta_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Estado de Cuenta
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {customer.name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Info & Summary */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
          {/* Customer Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">RFC</p>
              <p className="font-medium text-gray-900 dark:text-white font-mono">
                {customer.rfc || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</p>
              <p className="font-medium text-gray-900 dark:text-white text-sm">
                {customer.email}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Teléfono</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {customer.phone}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cliente desde</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Límite de Crédito</p>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {customer.creditLimit ? formatCurrency(customer.creditLimit) : 'N/A'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Saldo Actual</p>
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-300">
                {formatCurrency(customer.currentBalance)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Crédito Disponible</p>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-300">
                {customer.creditLimit
                  ? formatCurrency(customer.creditLimit - customer.currentBalance)
                  : 'N/A'
                }
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">Total Compras</p>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                {formatCurrency(customer.totalPurchases)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Historial de Movimientos
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total de transacciones: {transactions.length}
            </p>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                No hay movimientos registrados
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Descripción
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Referencia
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Cargos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Abonos
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Saldo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {transaction.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {transaction.reference || transaction.invoice || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {transaction.amount > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(transaction.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {transaction.amount < 0 ? (
                          <span className="text-green-600 dark:text-green-400">
                            {formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                        {formatCurrency(transaction.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer with Totals */}
        {transactions.length > 0 && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex justify-end gap-8">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Cargos</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totals.sales)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Abonos</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totals.payments)}
                </p>
              </div>
              <div className="text-right border-l-2 border-gray-300 dark:border-gray-600 pl-8">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Final</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(customer.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
