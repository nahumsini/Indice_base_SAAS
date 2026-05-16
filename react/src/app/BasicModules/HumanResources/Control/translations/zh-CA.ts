import { enCA } from './en-CA';
import type { ControlTranslations } from './types';

export const zhCA = {
  ...enCA,
  title: '控制',
  subtitle: '实时监控考勤并管理运营规则。',
  refresh: '刷新',
  loading: '正在加载控制数据',
  retry: '重试',
  genericError: '无法加载考勤控制。',
  saveError: '无法保存请求的控制变更。',
  bulkAssignSuccess: '排班分配已更新。',
  locationSaved: '合同地点已保存。',
  templateSaved: '排班模板已保存。',
  searchPlaceholder: '搜索员工、编号、职位或排班',
  filters: {
    all: '全部',
    assigned: '已分配',
    unassigned: '无排班',
    late: '今日迟到',
    corrected: '已更正',
  },
  statuses: {
    ...enCA.statuses,
    on_time: '准时',
    late: '迟到',
    leave: '请假',
    rest: '休息',
    absence: '无记录',
    pending: '待处理',
    not_scheduled: '未排班',
    active: '启用',
    inactive: '停用',
  },
  labels: {
    ...enCA.labels,
    calendarKpiAttendances: '出勤',
    calendarKpiAbsences: '缺勤',
    calendarKpiLate: '迟到',
    calendarKpiRest: '休息',
    timeTable: '时间表',
    removeTimeTableDay: '移除班次',
    removeTimeTableDayTitle: '从时间表中移除此班次？',
    removeTimeTableDayDescription: '这只会移除该日期已分配的班次或合同地点。签到和签退记录会保留。',
    removeTimeTableDayConfirm: '移除班次',
    removeTimeTableDaySuccess: '班次已从时间表中移除。未来日期仍保持分配。',
    removingTimeTableDay: '正在移除班次',
    removingTimeTableDayDescription: '正在更新时间表，并保持窗口打开。',
    clearDaySchedule: '清除当天排班',
    clearDayScheduleTitle: '清除当天排班？',
    clearDayScheduleDescription: '这会清除该日期的排班或合同地点，使员工可被分配新的工作。签到和签退记录会保留。',
    clearDayScheduleConfirm: '清除当天排班',
    clearDayScheduleSuccess: '当天排班已清除。该员工可在此日期分配新工作。',
    clearingDaySchedule: '正在清除当天排班',
    clearingDayScheduleDescription: '正在清除该日期分配并刷新可用状态。',
    noScheduleToClear: '该日期没有已分配的排班或合同地点。',
    cancel: '取消',
  },
  kpi: {
    absences: '缺勤',
    activeShifts: '进行中班次',
    checkIns: '上班记录',
    checkOuts: '下班记录',
    late: '迟到',
    noRecords: '无记录',
    operationRate: '已上班',
    reviewBadge: (count: number) => `${count} 个需复核`,
    statusLabels: {
      absence: '缺勤',
      late: '迟到',
      noRecord: '无记录',
      onTrack: '准时',
      other: '其他',
    },
    summaryInsight: ({ activeShiftCount, checkInsCount, reviewCount, totalCount }: Parameters<ControlTranslations['kpi']['summaryInsight']>[0]) => {
      if (totalCount === 0) {
        return '今日运营：该日期没有员工。';
      }

      const reviewText = reviewCount > 0
        ? `${reviewCount} 个需要跟进。`
        : '没有待处理事项。';

      return `今日运营：${totalCount} 名员工中 ${checkInsCount} 名已上班，${activeShiftCount} 名仍在班次中，${reviewText}`;
    },
  },
} satisfies ControlTranslations;
