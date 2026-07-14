const copies = {
  en: {
    allStatuses: 'All statuses', clear: 'Clear', results: (count: number) => `${count} results`, operationalDate: 'Operational date', status: 'Attendance status', comparison: 'Comparison: equivalent previous date or period', topUnits: 'Units requiring attention', topDepartments: 'Departments with exceptions', topAttention: 'Employees requiring attention', performanceTitle: 'Operational follow-up by employee', performanceSubtitle: 'Score: 45% attendance, 20% permissions, 25% records, and 10% assigned assets.', focus: 'Focus', approved: 'Approved', rejected: 'Rejected', reviewed: 'In review', resolved: 'Resolved',
  },
  es: {
    allStatuses: 'Todos los estados', clear: 'Limpiar', results: (count: number) => `${count} resultados`, operationalDate: 'Fecha operativa', status: 'Estado de asistencia', comparison: 'Comparación: fecha o periodo anterior equivalente', topUnits: 'Unidades que requieren atención', topDepartments: 'Departamentos con excepciones', topAttention: 'Colaboradores que requieren atención', performanceTitle: 'Seguimiento operativo por colaborador', performanceSubtitle: 'Puntaje: 45% asistencia, 20% permisos, 25% actas y 10% activos asignados.', focus: 'Enfocar', approved: 'Aprobados', rejected: 'Rechazados', reviewed: 'En revisión', resolved: 'Resueltos',
  },
  fr: {
    allStatuses: 'Tous les états', clear: 'Effacer', results: (count: number) => `${count} résultats`, operationalDate: 'Date opérationnelle', status: 'État de présence', comparison: 'Comparaison : date ou période précédente équivalente', topUnits: 'Unités nécessitant une attention', topDepartments: 'Départements avec exceptions', topAttention: 'Employés nécessitant une attention', performanceTitle: 'Suivi opérationnel par employé', performanceSubtitle: 'Score : 45 % présence, 20 % congés, 25 % dossiers et 10 % actifs assignés.', focus: 'Cibler', approved: 'Approuvés', rejected: 'Rejetés', reviewed: 'En révision', resolved: 'Résolus',
  },
  pt: {
    allStatuses: 'Todos os estados', clear: 'Limpar', results: (count: number) => `${count} resultados`, operationalDate: 'Data operacional', status: 'Status de presença', comparison: 'Comparação: data ou período anterior equivalente', topUnits: 'Unidades que precisam de atenção', topDepartments: 'Departamentos com exceções', topAttention: 'Colaboradores que precisam de atenção', performanceTitle: 'Acompanhamento operacional por colaborador', performanceSubtitle: 'Pontuação: 45% presença, 20% permissões, 25% registros e 10% ativos atribuídos.', focus: 'Focar', approved: 'Aprovados', rejected: 'Rejeitados', reviewed: 'Em revisão', resolved: 'Resolvidos',
  },
  ko: {
    allStatuses: '모든 상태', clear: '초기화', results: (count: number) => `${count}개 결과`, operationalDate: '운영 날짜', status: '근태 상태', comparison: '비교: 이전의 동일 날짜 또는 기간', topUnits: '주의가 필요한 사업장', topDepartments: '예외가 있는 부서', topAttention: '주의가 필요한 직원', performanceTitle: '직원별 운영 추적', performanceSubtitle: '점수: 근태 45%, 휴가 20%, 기록 25%, 배정 자산 10%.', focus: '집중', approved: '승인됨', rejected: '거부됨', reviewed: '검토 중', resolved: '해결됨',
  },
  zh: {
    allStatuses: '所有状态', clear: '清除', results: (count: number) => `${count} 条结果`, operationalDate: '运营日期', status: '考勤状态', comparison: '比较：等效的上一日期或期间', topUnits: '需要关注的单位', topDepartments: '存在异常的部门', topAttention: '需要关注的员工', performanceTitle: '按员工进行运营跟踪', performanceSubtitle: '评分：考勤45%、请假20%、记录25%、已分配资产10%。', focus: '聚焦', approved: '已批准', rejected: '已拒绝', reviewed: '审核中', resolved: '已解决',
  },
} as const;

export function getHrKpiStandardCopy(locale: string) {
  const language = locale.slice(0, 2) as keyof typeof copies;
  return copies[language] ?? copies.en;
}
