type TrainingWorkspaceCopy = { title: string; subtitle: string; backToErp: string; language: string };

const spanish: TrainingWorkspaceCopy = {
  title: 'Centro de capacitación',
  subtitle: 'Aprende, practica y sigue tu avance en Índice.',
  backToErp: 'Volver al ERP', language: 'Idioma',
};
const english: TrainingWorkspaceCopy = {
  title: 'Training centre', subtitle: 'Learn, practise and track your progress in Índice.',
  backToErp: 'Back to ERP', language: 'Language',
};

export const trainingWorkspaceCopies: Record<string, TrainingWorkspaceCopy> = {
  'es-MX': spanish,
  'es-CO': spanish,
  'en-CA': english,
  'en-US': { ...english, title: 'Training center', subtitle: 'Learn, practice and track your progress in Índice.' },
  'fr-CA': {
    title: 'Centre de formation', subtitle: 'Apprenez, pratiquez et suivez votre progression dans Índice.',
    backToErp: 'Retour à l’ERP', language: 'Langue',
  },
  'pt-BR': {
    title: 'Centro de capacitação', subtitle: 'Aprenda, pratique e acompanhe seu progresso no Índice.',
    backToErp: 'Voltar ao ERP', language: 'Idioma',
  },
  'ko-CA': {
    title: '교육 센터', subtitle: 'Índice에서 학습하고 연습하며 진행 상황을 확인하세요.',
    backToErp: 'ERP로 돌아가기', language: '언어',
  },
  'zh-CA': {
    title: '培训中心', subtitle: '在 Índice 中学习、练习并跟踪您的学习进度。',
    backToErp: '返回 ERP', language: '语言',
  },
};

export function getTrainingWorkspaceCopy(locale: string): TrainingWorkspaceCopy {
  return trainingWorkspaceCopies[locale] ?? english;
}
