import { getTrainingExamCopy, formatExamMessage } from "./translations/exam";
import { certificateText } from "./certificateText";
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

export async function downloadTrainingCertificate(certificate: TrainingCertificate, locale = "en-CA") {
  const copy = getTrainingExamCopy(locale);
  const format = (key: keyof typeof copy, values: Record<string, string | number>) => formatExamMessage(copy, key, values);
  const [{ jsPDF }, { default: QRCode }] = await Promise.all([import('jspdf'), import('qrcode')]);
  const verificationUrl = `${window.location.origin}${certificate.verification_path}`;
  await document.fonts.ready;
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
  certificateText(doc, 'ÍNDICE', 34, 37);
  doc.setFontSize(11);
  doc.setTextColor(90);
  certificateText(doc, copy.operatingSystem, 34, 45);

  doc.setFontSize(15);
  doc.setTextColor(45);
  certificateText(doc, copy.certificateTitle, width / 2, 68, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90);
  certificateText(doc, copy.certifies, width / 2, 82, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(25);
  certificateText(doc, certificate.holder_name, width / 2, 101, { align: 'center', maxWidth: 180 });
  doc.setDrawColor(100);
  doc.line(58, 107, width - 58, 107);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(65);
  certificateText(doc, copy.completion, width / 2, 121, { align: 'center' });
  certificateText(doc, copy.competency, width / 2, 128, { align: 'center' });

  const issued = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(certificate.issued_at));
  const expires = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(certificate.expires_at));
  doc.setFontSize(10);
  certificateText(doc, format("finalScore", { score: certificate.final_score, total: certificate.total_questions }), 38, 153);
  certificateText(doc, format("programVersion", { version: certificate.program_version }), 38, 161);
  certificateText(doc, format("issuedDate", { date: issued }), 38, 169);
  certificateText(doc, format("expiresDate", { date: expires }), 38, 177);
  doc.setFont('helvetica', 'bold');
  certificateText(doc, format("certificateNumber", { folio: certificate.folio }), 38, 185);

  doc.addImage(qr, 'PNG', width - 64, 143, 34, 34);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90);
  certificateText(doc, copy.scan, width - 47, 182, { align: 'center' });
  doc.save(`certificado-indice-${certificate.folio}.pdf`);
}
