import { useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../shared/context';
import { Button } from './ui/button';

type SupportedLanguageCode =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

type TerminationReasonType =
  | 'resignation'
  | 'termination_for_cause'
  | 'contract_end'
  | 'mutual_agreement'
  | 'other';

interface TerminationOption {
  value: string;
  label: string;
}

interface TerminationModalCopy {
  title: string;
  employeeLabel: string;
  exitDateLabel: string;
  lastWorkingDayLabel: string;
  lastWorkingDayPlaceholder: string;
  reasonTypeLabel: string;
  reasonTypePlaceholder: string;
  specificReasonLabel: string;
  specificReasonPlaceholder: string;
  summaryLabel: string;
  summaryHelp: string;
  summaryPlaceholder: string;
  warningTitle: string;
  warningDescription: string;
  cancelLabel: string;
  confirmLabel: string;
  characterCounterLabel: string;
  reasonOptions: Array<{ value: TerminationReasonType; label: string }>;
  specificReasonOptions: Record<TerminationReasonType, TerminationOption[]>;
}

export interface ContractTerminationFormData {
  exitDate: string;
  reasonType: TerminationReasonType | '';
  specificReason: string;
  summary: string;
  lastWorkingDay: string;
}

interface TerminateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ContractTerminationFormData) => void;
  employeeName: string;
}

const createSpanishCopy = (): TerminationModalCopy => ({
  title: 'Terminar contrato',
  employeeLabel: 'Colaborador',
  exitDateLabel: 'Fecha de salida',
  lastWorkingDayLabel: 'Último día laborado',
  lastWorkingDayPlaceholder: 'Selecciona fecha de salida',
  reasonTypeLabel: 'Tipo de motivo',
  reasonTypePlaceholder: 'Selecciona...',
  specificReasonLabel: 'Motivo específico',
  specificReasonPlaceholder: 'Selecciona...',
  summaryLabel: 'Explicación breve',
  summaryHelp: 'Describe la razón de la terminación del contrato',
  summaryPlaceholder: 'Escribe aquí los detalles...',
  warningTitle: 'Esta acción es permanente',
  warningDescription:
    'Una vez confirmada la terminación del contrato, el colaborador será dado de baja del sistema. Esta información quedará registrada en el historial.',
  cancelLabel: 'Cancelar',
  confirmLabel: 'Confirmar terminación',
  characterCounterLabel: 'caracteres',
  reasonOptions: [
    { value: 'resignation', label: 'Renuncia' },
    { value: 'termination_for_cause', label: 'Terminación por causa' },
    { value: 'contract_end', label: 'Fin de contrato' },
    { value: 'mutual_agreement', label: 'Mutuo acuerdo' },
    { value: 'other', label: 'Otro' },
  ],
  specificReasonOptions: {
    resignation: [
      { value: 'better_offer', label: 'Mejor oferta laboral' },
      { value: 'relocation', label: 'Cambio de residencia' },
      { value: 'personal_reasons', label: 'Motivos personales' },
      { value: 'education', label: 'Continuación de estudios' },
      { value: 'job_dissatisfaction', label: 'Insatisfacción laboral' },
      { value: 'other', label: 'Otro' },
    ],
    termination_for_cause: [
      { value: 'poor_performance', label: 'Bajo desempeño' },
      { value: 'unexcused_absences', label: 'Inasistencias injustificadas' },
      { value: 'serious_misconduct', label: 'Falta grave' },
      { value: 'contract_breach', label: 'Incumplimiento de contrato' },
      { value: 'other', label: 'Otro' },
    ],
    contract_end: [
      { value: 'project_end', label: 'Término de proyecto' },
      { value: 'temporary_contract_end', label: 'Fin de contrato temporal' },
      { value: 'non_renewal', label: 'No renovación de contrato' },
      { value: 'other', label: 'Otro' },
    ],
    mutual_agreement: [
      { value: 'separation_agreement', label: 'Acuerdo de separación' },
      { value: 'business_reorg', label: 'Reorganización empresarial' },
      { value: 'role_change', label: 'Cambio de funciones' },
      { value: 'other', label: 'Otro' },
    ],
    other: [
      { value: 'retirement', label: 'Jubilación' },
      { value: 'health_reasons', label: 'Razones de salud' },
      { value: 'deceased', label: 'Fallecimiento' },
      { value: 'other', label: 'Otro' },
    ],
  },
});

const createEnglishCopy = (): TerminationModalCopy => ({
  title: 'Terminate contract',
  employeeLabel: 'Employee',
  exitDateLabel: 'Exit date',
  lastWorkingDayLabel: 'Last working day',
  lastWorkingDayPlaceholder: 'Select an exit date',
  reasonTypeLabel: 'Reason type',
  reasonTypePlaceholder: 'Select...',
  specificReasonLabel: 'Specific reason',
  specificReasonPlaceholder: 'Select...',
  summaryLabel: 'Brief explanation',
  summaryHelp: 'Describe the reason for ending the contract',
  summaryPlaceholder: 'Write the details here...',
  warningTitle: 'This action is permanent',
  warningDescription:
    'Once the contract termination is confirmed, the employee will be removed from the active system. This information will remain in the historical record.',
  cancelLabel: 'Cancel',
  confirmLabel: 'Confirm termination',
  characterCounterLabel: 'characters',
  reasonOptions: [
    { value: 'resignation', label: 'Resignation' },
    { value: 'termination_for_cause', label: 'Termination for cause' },
    { value: 'contract_end', label: 'Contract end' },
    { value: 'mutual_agreement', label: 'Mutual agreement' },
    { value: 'other', label: 'Other' },
  ],
  specificReasonOptions: {
    resignation: [
      { value: 'better_offer', label: 'Better job offer' },
      { value: 'relocation', label: 'Relocation' },
      { value: 'personal_reasons', label: 'Personal reasons' },
      { value: 'education', label: 'Continuing education' },
      { value: 'job_dissatisfaction', label: 'Job dissatisfaction' },
      { value: 'other', label: 'Other' },
    ],
    termination_for_cause: [
      { value: 'poor_performance', label: 'Poor performance' },
      { value: 'unexcused_absences', label: 'Unexcused absences' },
      { value: 'serious_misconduct', label: 'Serious misconduct' },
      { value: 'contract_breach', label: 'Contract breach' },
      { value: 'other', label: 'Other' },
    ],
    contract_end: [
      { value: 'project_end', label: 'Project completion' },
      { value: 'temporary_contract_end', label: 'Temporary contract end' },
      { value: 'non_renewal', label: 'Non-renewal of contract' },
      { value: 'other', label: 'Other' },
    ],
    mutual_agreement: [
      { value: 'separation_agreement', label: 'Separation agreement' },
      { value: 'business_reorg', label: 'Business reorganization' },
      { value: 'role_change', label: 'Role change' },
      { value: 'other', label: 'Other' },
    ],
    other: [
      { value: 'retirement', label: 'Retirement' },
      { value: 'health_reasons', label: 'Health reasons' },
      { value: 'deceased', label: 'Death' },
      { value: 'other', label: 'Other' },
    ],
  },
});

const terminationModalTranslations: Record<SupportedLanguageCode, TerminationModalCopy> = {
  'es-MX': createSpanishCopy(),
  'es-CO': createSpanishCopy(),
  'en-US': createEnglishCopy(),
  'en-CA': createEnglishCopy(),
  'fr-CA': {
    title: 'Mettre fin au contrat',
    employeeLabel: 'Employé',
    exitDateLabel: 'Date de départ',
    lastWorkingDayLabel: 'Dernier jour travaillé',
    lastWorkingDayPlaceholder: 'Sélectionnez une date de départ',
    reasonTypeLabel: 'Type de motif',
    reasonTypePlaceholder: 'Sélectionnez...',
    specificReasonLabel: 'Motif précis',
    specificReasonPlaceholder: 'Sélectionnez...',
    summaryLabel: 'Brève explication',
    summaryHelp: 'Décrivez la raison de la fin du contrat',
    summaryPlaceholder: 'Écrivez les détails ici...',
    warningTitle: 'Cette action est permanente',
    warningDescription:
      "Une fois la fin du contrat confirmée, l'employé sera retiré du système actif. Cette information restera enregistrée dans l'historique.",
    cancelLabel: 'Annuler',
    confirmLabel: 'Confirmer la fin',
    characterCounterLabel: 'caractères',
    reasonOptions: [
      { value: 'resignation', label: 'Démission' },
      { value: 'termination_for_cause', label: 'Congédiement pour motif valable' },
      { value: 'contract_end', label: 'Fin de contrat' },
      { value: 'mutual_agreement', label: 'Accord mutuel' },
      { value: 'other', label: 'Autre' },
    ],
    specificReasonOptions: {
      resignation: [
        { value: 'better_offer', label: 'Meilleure offre' },
        { value: 'relocation', label: 'Déménagement' },
        { value: 'personal_reasons', label: 'Raisons personnelles' },
        { value: 'education', label: 'Poursuite des études' },
        { value: 'job_dissatisfaction', label: 'Insatisfaction au travail' },
        { value: 'other', label: 'Autre' },
      ],
      termination_for_cause: [
        { value: 'poor_performance', label: 'Faible rendement' },
        { value: 'unexcused_absences', label: 'Absences injustifiées' },
        { value: 'serious_misconduct', label: 'Faute grave' },
        { value: 'contract_breach', label: 'Violation du contrat' },
        { value: 'other', label: 'Autre' },
      ],
      contract_end: [
        { value: 'project_end', label: 'Fin du projet' },
        { value: 'temporary_contract_end', label: 'Fin du contrat temporaire' },
        { value: 'non_renewal', label: 'Non-renouvellement du contrat' },
        { value: 'other', label: 'Autre' },
      ],
      mutual_agreement: [
        { value: 'separation_agreement', label: 'Entente de séparation' },
        { value: 'business_reorg', label: "Réorganisation de l'entreprise" },
        { value: 'role_change', label: 'Changement de rôle' },
        { value: 'other', label: 'Autre' },
      ],
      other: [
        { value: 'retirement', label: 'Retraite' },
        { value: 'health_reasons', label: 'Raisons de santé' },
        { value: 'deceased', label: 'Décès' },
        { value: 'other', label: 'Autre' },
      ],
    },
  },
  'pt-BR': {
    title: 'Encerrar contrato',
    employeeLabel: 'Colaborador',
    exitDateLabel: 'Data de saída',
    lastWorkingDayLabel: 'Último dia trabalhado',
    lastWorkingDayPlaceholder: 'Selecione uma data de saída',
    reasonTypeLabel: 'Tipo de motivo',
    reasonTypePlaceholder: 'Selecione...',
    specificReasonLabel: 'Motivo específico',
    specificReasonPlaceholder: 'Selecione...',
    summaryLabel: 'Explicação breve',
    summaryHelp: 'Descreva o motivo do encerramento do contrato',
    summaryPlaceholder: 'Escreva os detalhes aqui...',
    warningTitle: 'Esta ação é permanente',
    warningDescription:
      'Depois de confirmar o encerramento do contrato, o colaborador será removido do sistema ativo. Essas informações permanecerão no histórico.',
    cancelLabel: 'Cancelar',
    confirmLabel: 'Confirmar encerramento',
    characterCounterLabel: 'caracteres',
    reasonOptions: [
      { value: 'resignation', label: 'Pedido de demissão' },
      { value: 'termination_for_cause', label: 'Demissão por justa causa' },
      { value: 'contract_end', label: 'Fim do contrato' },
      { value: 'mutual_agreement', label: 'Acordo mútuo' },
      { value: 'other', label: 'Outro' },
    ],
    specificReasonOptions: {
      resignation: [
        { value: 'better_offer', label: 'Melhor oferta de trabalho' },
        { value: 'relocation', label: 'Mudança de cidade' },
        { value: 'personal_reasons', label: 'Motivos pessoais' },
        { value: 'education', label: 'Continuação dos estudos' },
        { value: 'job_dissatisfaction', label: 'Insatisfação profissional' },
        { value: 'other', label: 'Outro' },
      ],
      termination_for_cause: [
        { value: 'poor_performance', label: 'Baixo desempenho' },
        { value: 'unexcused_absences', label: 'Faltas injustificadas' },
        { value: 'serious_misconduct', label: 'Falta grave' },
        { value: 'contract_breach', label: 'Descumprimento do contrato' },
        { value: 'other', label: 'Outro' },
      ],
      contract_end: [
        { value: 'project_end', label: 'Término do projeto' },
        { value: 'temporary_contract_end', label: 'Fim do contrato temporário' },
        { value: 'non_renewal', label: 'Não renovação do contrato' },
        { value: 'other', label: 'Outro' },
      ],
      mutual_agreement: [
        { value: 'separation_agreement', label: 'Acordo de desligamento' },
        { value: 'business_reorg', label: 'Reorganização da empresa' },
        { value: 'role_change', label: 'Mudança de função' },
        { value: 'other', label: 'Outro' },
      ],
      other: [
        { value: 'retirement', label: 'Aposentadoria' },
        { value: 'health_reasons', label: 'Motivos de saúde' },
        { value: 'deceased', label: 'Falecimento' },
        { value: 'other', label: 'Outro' },
      ],
    },
  },
  'ko-CA': {
    title: '계약 종료',
    employeeLabel: '직원',
    exitDateLabel: '퇴사일',
    lastWorkingDayLabel: '마지막 근무일',
    lastWorkingDayPlaceholder: '퇴사일을 선택하세요',
    reasonTypeLabel: '사유 유형',
    reasonTypePlaceholder: '선택하세요...',
    specificReasonLabel: '세부 사유',
    specificReasonPlaceholder: '선택하세요...',
    summaryLabel: '간단한 설명',
    summaryHelp: '계약 종료 사유를 설명하세요',
    summaryPlaceholder: '세부 내용을 입력하세요...',
    warningTitle: '이 작업은 되돌릴 수 없습니다',
    warningDescription:
      '계약 종료가 확인되면 해당 직원은 활성 시스템에서 제거됩니다. 이 정보는 이력 기록에 남습니다.',
    cancelLabel: '취소',
    confirmLabel: '종료 확인',
    characterCounterLabel: '자',
    reasonOptions: [
      { value: 'resignation', label: '자진 퇴사' },
      { value: 'termination_for_cause', label: '사유 있는 해고' },
      { value: 'contract_end', label: '계약 만료' },
      { value: 'mutual_agreement', label: '상호 합의' },
      { value: 'other', label: '기타' },
    ],
    specificReasonOptions: {
      resignation: [
        { value: 'better_offer', label: '더 나은 제안' },
        { value: 'relocation', label: '이주' },
        { value: 'personal_reasons', label: '개인 사유' },
        { value: 'education', label: '학업 계속' },
        { value: 'job_dissatisfaction', label: '업무 불만족' },
        { value: 'other', label: '기타' },
      ],
      termination_for_cause: [
        { value: 'poor_performance', label: '저조한 성과' },
        { value: 'unexcused_absences', label: '무단 결근' },
        { value: 'serious_misconduct', label: '중대한 위반' },
        { value: 'contract_breach', label: '계약 위반' },
        { value: 'other', label: '기타' },
      ],
      contract_end: [
        { value: 'project_end', label: '프로젝트 종료' },
        { value: 'temporary_contract_end', label: '임시 계약 종료' },
        { value: 'non_renewal', label: '계약 미갱신' },
        { value: 'other', label: '기타' },
      ],
      mutual_agreement: [
        { value: 'separation_agreement', label: '퇴직 합의' },
        { value: 'business_reorg', label: '조직 개편' },
        { value: 'role_change', label: '직무 변경' },
        { value: 'other', label: '기타' },
      ],
      other: [
        { value: 'retirement', label: '정년퇴직' },
        { value: 'health_reasons', label: '건강상 이유' },
        { value: 'deceased', label: '사망' },
        { value: 'other', label: '기타' },
      ],
    },
  },
  'zh-CA': {
    title: '终止合同',
    employeeLabel: '员工',
    exitDateLabel: '离职日期',
    lastWorkingDayLabel: '最后工作日',
    lastWorkingDayPlaceholder: '请选择离职日期',
    reasonTypeLabel: '原因类型',
    reasonTypePlaceholder: '请选择...',
    specificReasonLabel: '具体原因',
    specificReasonPlaceholder: '请选择...',
    summaryLabel: '简要说明',
    summaryHelp: '请说明终止合同的原因',
    summaryPlaceholder: '请在此填写详细信息...',
    warningTitle: '此操作不可撤销',
    warningDescription:
      '一旦确认终止合同，该员工将从当前系统中移除。此信息会保留在历史记录中。',
    cancelLabel: '取消',
    confirmLabel: '确认终止',
    characterCounterLabel: '个字符',
    reasonOptions: [
      { value: 'resignation', label: '辞职' },
      { value: 'termination_for_cause', label: '因故解雇' },
      { value: 'contract_end', label: '合同结束' },
      { value: 'mutual_agreement', label: '双方协商' },
      { value: 'other', label: '其他' },
    ],
    specificReasonOptions: {
      resignation: [
        { value: 'better_offer', label: '更好的工作机会' },
        { value: 'relocation', label: '搬迁' },
        { value: 'personal_reasons', label: '个人原因' },
        { value: 'education', label: '继续深造' },
        { value: 'job_dissatisfaction', label: '工作不满意' },
        { value: 'other', label: '其他' },
      ],
      termination_for_cause: [
        { value: 'poor_performance', label: '绩效不佳' },
        { value: 'unexcused_absences', label: '无故缺勤' },
        { value: 'serious_misconduct', label: '严重违规' },
        { value: 'contract_breach', label: '违反合同' },
        { value: 'other', label: '其他' },
      ],
      contract_end: [
        { value: 'project_end', label: '项目结束' },
        { value: 'temporary_contract_end', label: '临时合同结束' },
        { value: 'non_renewal', label: '合同不续签' },
        { value: 'other', label: '其他' },
      ],
      mutual_agreement: [
        { value: 'separation_agreement', label: '离职协议' },
        { value: 'business_reorg', label: '业务重组' },
        { value: 'role_change', label: '岗位调整' },
        { value: 'other', label: '其他' },
      ],
      other: [
        { value: 'retirement', label: '退休' },
        { value: 'health_reasons', label: '健康原因' },
        { value: 'deceased', label: '去世' },
        { value: 'other', label: '其他' },
      ],
    },
  },
};

const emptyFormState: ContractTerminationFormData = {
  exitDate: '',
  reasonType: '',
  specificReason: '',
  summary: '',
  lastWorkingDay: '',
};

export function TerminarContratoModal({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
}: TerminateContractModalProps) {
  const { currentLanguage } = useLanguage();
  const [formData, setFormData] = useState<ContractTerminationFormData>(emptyFormState);

  const modalCopy =
    terminationModalTranslations[currentLanguage.code as SupportedLanguageCode] ??
    terminationModalTranslations['en-US'];

  const handleInputChange = <T extends keyof ContractTerminationFormData>(
    field: T,
    value: ContractTerminationFormData[T],
  ) => {
    setFormData((previousData) => {
      const nextData = { ...previousData, [field]: value };

      if (field === 'exitDate') {
        nextData.lastWorkingDay = value;
      }

      if (field === 'reasonType') {
        nextData.specificReason = '';
      }

      return nextData;
    });
  };

  const handleSubmit = () => {
    if (formData.exitDate && formData.reasonType && formData.summary) {
      onConfirm(formData);
      handleCancel();
    }
  };

  const handleCancel = () => {
    setFormData(emptyFormState);
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  const isFormValid = Boolean(formData.exitDate && formData.reasonType && formData.summary);
  const specificReasonOptions = formData.reasonType
    ? modalCopy.specificReasonOptions[formData.reasonType]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between bg-[#143675] px-6 py-5 dark:bg-[#0f2855]">
          <h2 className="text-xl font-semibold text-white">{modalCopy.title}</h2>
          <button
            onClick={handleCancel}
            className="text-white/80 transition-colors hover:text-white"
            aria-label={modalCopy.cancelLabel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {modalCopy.employeeLabel}
              </label>
              <div className="rounded-md bg-gray-100 px-3 py-2.5 font-medium text-gray-900 dark:bg-gray-700 dark:text-white">
                {employeeName}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {modalCopy.exitDateLabel}
                </label>
                <input
                  type="date"
                  value={formData.exitDate}
                  onChange={(event) => handleInputChange('exitDate', event.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {modalCopy.lastWorkingDayLabel}
                </label>
                <div className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {formData.lastWorkingDay || modalCopy.lastWorkingDayPlaceholder}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {modalCopy.reasonTypeLabel}
                </label>
                <select
                  value={formData.reasonType}
                  onChange={(event) =>
                    handleInputChange('reasonType', event.target.value as TerminationReasonType)
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{modalCopy.reasonTypePlaceholder}</option>
                  {modalCopy.reasonOptions.map((reasonOption) => (
                    <option key={reasonOption.value} value={reasonOption.value}>
                      {reasonOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {modalCopy.specificReasonLabel}
                </label>
                <select
                  value={formData.specificReason}
                  onChange={(event) => handleInputChange('specificReason', event.target.value)}
                  disabled={!formData.reasonType}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                >
                  <option value="">{modalCopy.specificReasonPlaceholder}</option>
                  {specificReasonOptions.map((reasonOption) => (
                    <option key={reasonOption.value} value={reasonOption.value}>
                      {reasonOption.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {modalCopy.summaryLabel}
              </label>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {modalCopy.summaryHelp}
              </p>
              <textarea
                value={formData.summary}
                onChange={(event) => handleInputChange('summary', event.target.value)}
                placeholder={modalCopy.summaryPlaceholder}
                rows={4}
                maxLength={500}
                className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
              />
              <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-400">
                {formData.summary.length} / 500 {modalCopy.characterCounterLabel}
              </p>
            </div>

            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <span className="text-lg text-red-600 dark:text-red-400">⚠️</span>
                <div className="flex-1">
                  <p className="mb-1 text-sm font-medium text-red-900 dark:text-red-200">
                    {modalCopy.warningTitle}
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {modalCopy.warningDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/50">
          <Button variant="outline" onClick={handleCancel} className="text-sm">
            {modalCopy.cancelLabel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`text-sm ${
              isFormValid
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
            }`}
          >
            {modalCopy.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
