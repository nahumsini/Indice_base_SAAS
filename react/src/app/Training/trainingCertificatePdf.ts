export type TrainingCertificate = {
  folio: string;
  holder_name: string;
  program_version: string;
  final_score: number;
  total_questions: number;
  issued_at: string;
  expires_at: string;
  status: 'ACTIVE' | 'EXPIRED';
  verification_path: string;
};

export async function downloadTrainingCertificate(certificate: TrainingCertificate) {
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([import('jspdf'), import('qrcode')]);
  const verificationUrl = `${window.location.origin}${certificate.verification_path}`;
  const qr = await QRCode.toDataURL(verificationUrl, { width: 360, margin: 1, color: { dark: '#111111', light: '#FFFFFF' } });
  const doc = new jsPDF({ format: 'a4', orientation: 'landscape', unit: 'mm' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setDrawColor(45);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, width - 20, height - 20);
  doc.setLineWidth(0.25);
  doc.rect(14, 14, width - 28, height - 28);
  doc.setFillColor(35, 35, 35);
  doc.rect(14, 14, 8, height - 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30);
  doc.setFontSize(27);
  doc.text('ÍNDICE', 34, 37);
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text('SISTEMA OPERATIVO EMPRESARIAL', 34, 45);

  doc.setFontSize(15);
  doc.setTextColor(45);
  doc.text('CERTIFICADO DE COMPETENCIA CONSULTIVA', width / 2, 68, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text('Índice Technologies Inc. certifica que', width / 2, 82, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(25);
  doc.text(certificate.holder_name, width / 2, 101, { align: 'center', maxWidth: 180 });
  doc.setDrawColor(100);
  doc.line(58, 107, width - 58, 107);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(65);
  doc.text('aprobó el programa de formación para distribuidores y demostró el conocimiento', width / 2, 121, { align: 'center' });
  doc.text('necesario para orientar, implementar y acompañar el uso de Índice.', width / 2, 128, { align: 'center' });

  const issued = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(certificate.issued_at));
  const expires = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(certificate.expires_at));
  doc.setFontSize(10);
  doc.text(`Resultado final: ${certificate.final_score}/${certificate.total_questions}`, 38, 153);
  doc.text(`Versión del programa: ${certificate.program_version}`, 38, 161);
  doc.text(`Expedido: ${issued}`, 38, 169);
  doc.text(`Vigente hasta: ${expires}`, 38, 177);
  doc.setFont('helvetica', 'bold');
  doc.text(`Folio: ${certificate.folio}`, 38, 185);

  doc.addImage(qr, 'PNG', width - 64, 143, 34, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  doc.text('Escanea para validar autenticidad y vigencia', width - 47, 182, { align: 'center' });
  doc.save(`certificado-indice-${certificate.folio}.pdf`);
}
