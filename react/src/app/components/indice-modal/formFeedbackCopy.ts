const copyByLanguage = {
  es: { saveFailed: 'No se pudo guardar', required: 'Completa este campo.', positiveAmount: 'Escribe un monto mayor que cero.', nonNegativeAmount: 'Escribe cero o un monto mayor.', saving: 'Guardando…', missingFields: (fields: string[]) => `Para guardar, completa: ${fields.join(', ')}.` },
  en: { saveFailed: 'Could not save', required: 'Complete this field.', positiveAmount: 'Enter an amount greater than zero.', nonNegativeAmount: 'Enter zero or a greater amount.', saving: 'Saving…', missingFields: (fields: string[]) => `To save, complete: ${fields.join(', ')}.` },
  fr: { saveFailed: 'Enregistrement impossible', required: 'Remplissez ce champ.', positiveAmount: 'Saisissez un montant supérieur à zéro.', nonNegativeAmount: 'Saisissez zéro ou un montant supérieur.', saving: 'Enregistrement…', missingFields: (fields: string[]) => `Pour enregistrer, remplissez : ${fields.join(', ')}.` },
  pt: { saveFailed: 'Não foi possível salvar', required: 'Preencha este campo.', positiveAmount: 'Digite um valor maior que zero.', nonNegativeAmount: 'Digite zero ou um valor maior.', saving: 'Salvando…', missingFields: (fields: string[]) => `Para salvar, preencha: ${fields.join(', ')}.` },
  ko: { saveFailed: '저장하지 못했습니다', required: '이 항목을 입력하세요.', positiveAmount: '0보다 큰 금액을 입력하세요.', nonNegativeAmount: '0 이상의 금액을 입력하세요.', saving: '저장 중…', missingFields: (fields: string[]) => `저장하려면 다음 항목을 입력하세요: ${fields.join(', ')}.` },
  zh: { saveFailed: '保存失败', required: '请填写此项。', positiveAmount: '请输入大于零的金额。', nonNegativeAmount: '请输入零或更大的金额。', saving: '正在保存…', missingFields: (fields: string[]) => `请填写以下内容后保存：${fields.join('、')}。` },
};
export function getFormFeedbackCopy(locale: string) {
  return copyByLanguage[locale.split('-')[0] as keyof typeof copyByLanguage] ?? copyByLanguage.en;
}
