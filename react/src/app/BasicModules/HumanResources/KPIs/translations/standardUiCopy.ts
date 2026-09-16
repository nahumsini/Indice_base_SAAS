const copies = {
  en: {
    allStatuses: 'All statuses', clear: 'Clear', results: (count: number) => `${count} results`, operationalDate: 'Operational date', status: 'Attendance status', comparison: 'Attendance comparison: same weekday 7 days earlier', topUnits: 'Units requiring attention', topDepartments: 'Departments with exceptions', topAttention: 'Employees requiring attention', performanceTitle: 'Operational follow-up by employee', performanceSubtitle: 'Concrete attendance, pending-permission, and open-record signals; no composite score.', focus: 'Focus', approved: 'Approved', rejected: 'Rejected', reviewed: 'In review', resolved: 'Resolved', pagination: { next: 'Next', previous: 'Previous', rows: 'Rows per page', item: 'employees' },
  },
  es: {
    allStatuses: 'Todos los estados', clear: 'Limpiar', results: (count: number) => `${count} resultados`, operationalDate: 'Fecha operativa', status: 'Estado de asistencia', comparison: 'Comparación de asistencia: mismo día de la semana, 7 días antes', topUnits: 'Unidades que requieren atención', topDepartments: 'Departamentos con excepciones', topAttention: 'Colaboradores que requieren atención', performanceTitle: 'Seguimiento operativo por colaborador', performanceSubtitle: 'Señales concretas de asistencia, permisos pendientes y actas abiertas; sin puntaje compuesto.', focus: 'Enfocar', approved: 'Aprobados', rejected: 'Rechazados', reviewed: 'En revisión', resolved: 'Resueltos', pagination: { next: 'Siguiente', previous: 'Anterior', rows: 'Filas por página', item: 'colaboradores' },
  },
  fr: {
    allStatuses: 'Tous les états', clear: 'Effacer', results: (count: number) => `${count} résultats`, operationalDate: 'Date opérationnelle', status: 'État de présence', comparison: 'Comparaison de présence : même jour de semaine, 7 jours plus tôt', topUnits: 'Unités nécessitant une attention', topDepartments: 'Départements avec exceptions', topAttention: 'Employés nécessitant une attention', performanceTitle: 'Suivi opérationnel par employé', performanceSubtitle: 'Signaux concrets de présence, congés en attente et dossiers ouverts; aucun score composé.', focus: 'Cibler', approved: 'Approuvés', rejected: 'Rejetés', reviewed: 'En révision', resolved: 'Résolus', pagination: { next: 'Suivant', previous: 'Précédent', rows: 'Lignes par page', item: 'employés' },
  },
  pt: {
    allStatuses: 'Todos os estados', clear: 'Limpar', results: (count: number) => `${count} resultados`, operationalDate: 'Data operacional', status: 'Status de presença', comparison: 'Comparação de presença: mesmo dia da semana, 7 dias antes', topUnits: 'Unidades que precisam de atenção', topDepartments: 'Departamentos com exceções', topAttention: 'Colaboradores que precisam de atenção', performanceTitle: 'Acompanhamento operacional por colaborador', performanceSubtitle: 'Sinais concretos de presença, afastamentos pendentes e registros abertos; sem pontuação composta.', focus: 'Focar', approved: 'Aprovados', rejected: 'Rejeitados', reviewed: 'Em revisão', resolved: 'Resolvidos', pagination: { next: 'Próxima', previous: 'Anterior', rows: 'Linhas por página', item: 'colaboradores' },
  },
  ko: {
    allStatuses: '모든 상태', clear: '초기화', results: (count: number) => `${count}개 결과`, operationalDate: '운영 날짜', status: '근태 상태', comparison: '근태 비교: 7일 전 같은 요일', topUnits: '주의가 필요한 사업장', topDepartments: '예외가 있는 부서', topAttention: '주의가 필요한 직원', performanceTitle: '직원별 운영 추적', performanceSubtitle: '근태, 대기 휴가 및 열린 기록의 구체적 신호이며 복합 점수는 사용하지 않습니다.', focus: '집중', approved: '승인됨', rejected: '거부됨', reviewed: '검토 중', resolved: '해결됨', pagination: { next: '다음', previous: '이전', rows: '페이지당 행', item: '직원' },
  },
  zh: {
    allStatuses: '所有状态', clear: '清除', results: (count: number) => `${count} 条结果`, operationalDate: '运营日期', status: '考勤状态', comparison: '考勤比较：7天前同一星期', topUnits: '需要关注的单位', topDepartments: '存在异常的部门', topAttention: '需要关注的员工', performanceTitle: '按员工进行运营跟踪', performanceSubtitle: '仅显示考勤、待处理请假和未关闭记录的明确信号，不使用综合评分。', focus: '聚焦', approved: '已批准', rejected: '已拒绝', reviewed: '审核中', resolved: '已解决', pagination: { next: '下一页', previous: '上一页', rows: '每页行数', item: '员工' },
  },
} as const;

export function getHrKpiStandardCopy(locale: string) {
  const language = locale.slice(0, 2) as keyof typeof copies;
  return copies[language] ?? copies.en;
}
