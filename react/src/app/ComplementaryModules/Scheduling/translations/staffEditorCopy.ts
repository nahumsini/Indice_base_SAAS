const en = {
  collaboratorStep: 'Collaborator', availabilityStep: 'Availability', servicesStep: 'Services and exceptions', reviewStep: 'Review',
  step: 'Step', of: 'of', back: 'Back', continue: 'Continue', reviewHint: 'Review the complete configuration before saving. You can go back to make changes.',
  reviewTitle: 'Ready to review', inactive: 'Inactive', retainedService: 'Previously selected service',
  identity: 'Collaborator details', editStaff: 'Edit collaborator',
  discardDescription: 'Unsaved changes to this collaborator will be lost. Keep editing to retain them.', discardLabel: 'Discard changes',
  description: 'Set this collaborator’s public name, booking hours and services.',
  publicName: 'Public name', publicNameHint: 'Shown on the booking page. Changing it does not rename the employee in Human Resources.',
  weeklyHint: 'Enable available days and set one or more time windows in the selected time zone.',
  noHours: 'Unavailable', exceptionsHint: 'Block specific dates without changing the weekly schedule.',
  noExceptions: 'No blocked dates', assignedServices: 'Services they can provide',
  daysConfigured: 'available days', timeWindows: 'time windows', requiredFields: '* Required fields',
};
export type StaffEditorCopy = { [K in keyof typeof en]: string };
const es: StaffEditorCopy = {
  collaboratorStep: 'Colaborador', availabilityStep: 'Disponibilidad', servicesStep: 'Servicios y excepciones', reviewStep: 'Revisión',
  step: 'Paso', of: 'de', back: 'Atrás', continue: 'Continuar', reviewHint: 'Revisa la configuración completa antes de guardar. Puedes volver para hacer ajustes.',
  reviewTitle: 'Todo listo para revisar', inactive: 'Inactivo', retainedService: 'Servicio seleccionado anteriormente',
  identity: 'Datos del colaborador', editStaff: 'Editar colaborador',
  discardDescription: 'Se perderán los cambios sin guardar de este colaborador. Puedes seguir editando para conservarlos.', discardLabel: 'Descartar cambios',
  description: 'Configura su nombre público, horarios de reserva y servicios.',
  publicName: 'Nombre público', publicNameHint: 'Se muestra en la página de reservas. Cambiarlo no modifica el nombre del empleado en Recursos Humanos.',
  weeklyHint: 'Activa los días disponibles y define uno o más horarios en la zona horaria elegida.',
  noHours: 'Sin disponibilidad', exceptionsHint: 'Bloquea fechas concretas sin cambiar el horario semanal.',
  noExceptions: 'Sin fechas bloqueadas', assignedServices: 'Servicios que puede atender',
  daysConfigured: 'días disponibles', timeWindows: 'intervalos', requiredFields: '* Campos obligatorios',
};
const fr: StaffEditorCopy = {
  collaboratorStep: 'Collaborateur', availabilityStep: 'Disponibilité', servicesStep: 'Services et exceptions', reviewStep: 'Vérification',
  step: 'Étape', of: 'sur', back: 'Retour', continue: 'Continuer', reviewHint: 'Vérifiez toute la configuration avant d’enregistrer. Vous pouvez revenir pour la modifier.',
  reviewTitle: 'Prêt pour la vérification', inactive: 'Inactif', retainedService: 'Service sélectionné précédemment',
  identity: 'Détails du collaborateur', editStaff: 'Modifier le collaborateur',
  discardDescription: 'Les modifications non enregistrées seront perdues. Continuez à modifier pour les conserver.', discardLabel: 'Abandonner les modifications',
  description: 'Configurez son nom public, ses horaires de réservation et ses services.',
  publicName: 'Nom public', publicNameHint: 'Affiché sur la page de réservation. Le nom dans les Ressources humaines reste inchangé.',
  weeklyHint: 'Activez les jours disponibles et définissez les plages dans le fuseau choisi.',
  noHours: 'Indisponible', exceptionsHint: 'Bloquez des dates précises sans modifier les horaires hebdomadaires.',
  noExceptions: 'Aucune date bloquée', assignedServices: 'Services proposés',
  daysConfigured: 'jours disponibles', timeWindows: 'plages horaires', requiredFields: '* Champs obligatoires',
};
const pt: StaffEditorCopy = {
  collaboratorStep: 'Colaborador', availabilityStep: 'Disponibilidade', servicesStep: 'Serviços e exceções', reviewStep: 'Revisão',
  step: 'Etapa', of: 'de', back: 'Voltar', continue: 'Continuar', reviewHint: 'Revise toda a configuração antes de salvar. Você pode voltar para fazer ajustes.',
  reviewTitle: 'Tudo pronto para revisar', inactive: 'Inativo', retainedService: 'Serviço selecionado anteriormente',
  identity: 'Dados do colaborador', editStaff: 'Editar colaborador',
  discardDescription: 'As alterações não salvas deste colaborador serão perdidas. Continue editando para mantê-las.', discardLabel: 'Descartar alterações',
  description: 'Configure o nome público, os horários de reserva e os serviços.',
  publicName: 'Nome público', publicNameHint: 'Exibido na página de reservas. Não altera o nome do funcionário em Recursos Humanos.',
  weeklyHint: 'Ative os dias disponíveis e defina os horários no fuso selecionado.',
  noHours: 'Indisponível', exceptionsHint: 'Bloqueie datas específicas sem alterar o horário semanal.',
  noExceptions: 'Nenhuma data bloqueada', assignedServices: 'Serviços que pode atender',
  daysConfigured: 'dias disponíveis', timeWindows: 'intervalos', requiredFields: '* Campos obrigatórios',
};
const ko: StaffEditorCopy = {
  collaboratorStep: '담당자', availabilityStep: '예약 가능 시간', servicesStep: '서비스 및 예외', reviewStep: '검토',
  step: '단계', of: '/', back: '이전', continue: '계속', reviewHint: '저장하기 전에 전체 설정을 검토하세요. 돌아가서 수정할 수 있습니다.',
  reviewTitle: '검토 준비 완료', inactive: '비활성', retainedService: '이전에 선택한 서비스',
  identity: '담당자 정보', editStaff: '담당자 수정', description: '공개 이름, 예약 가능 시간 및 서비스를 설정하세요.',
  discardDescription: '저장하지 않은 담당자 변경 사항이 사라집니다. 유지하려면 계속 수정하세요.', discardLabel: '변경 사항 삭제',
  publicName: '공개 이름', publicNameHint: '예약 페이지에 표시됩니다. 인사 관리의 직원 이름은 변경되지 않습니다.',
  weeklyHint: '가능한 요일을 켜고 선택한 시간대로 하나 이상의 시간대를 설정하세요.',
  noHours: '예약 불가', exceptionsHint: '주간 일정을 변경하지 않고 특정 날짜를 차단하세요.',
  noExceptions: '차단된 날짜 없음', assignedServices: '제공 가능한 서비스',
  daysConfigured: '가능한 요일 수', timeWindows: '시간대 수', requiredFields: '* 필수 항목',
};
const zh: StaffEditorCopy = {
  collaboratorStep: '工作人员', availabilityStep: '可用时间', servicesStep: '服务与例外', reviewStep: '审核',
  step: '步骤', of: '/', back: '上一步', continue: '继续', reviewHint: '保存前请审核完整设置。您可以返回进行修改。',
  reviewTitle: '准备审核', inactive: '未启用', retainedService: '先前选择的服务',
  identity: '工作人员信息', editStaff: '编辑工作人员', description: '设置公开名称、预约时间和服务。',
  discardDescription: '未保存的工作人员修改将丢失。继续编辑可保留这些修改。', discardLabel: '放弃修改',
  publicName: '公开名称', publicNameHint: '显示在预约页面，不会更改人力资源中的员工姓名。',
  weeklyHint: '启用可预约的星期，并按所选时区设置一个或多个时段。',
  noHours: '不可预约', exceptionsHint: '屏蔽特定日期，不改变每周时间。',
  noExceptions: '没有屏蔽日期', assignedServices: '可提供的服务',
  daysConfigured: '可预约天数', timeWindows: '时段数', requiredFields: '* 必填项',
};
export const staffEditorCopies: Record<string, StaffEditorCopy> = {
  'en-CA': en, 'en-US': en, 'es-MX': es, 'es-CO': es, 'fr-CA': fr, 'pt-BR': pt, 'ko-CA': ko, 'zh-CA': zh,
};
export const getStaffEditorCopy = (locale: string): StaffEditorCopy => staffEditorCopies[locale] ?? en;
