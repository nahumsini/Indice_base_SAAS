import type { HumanResourcesTranslations } from './types';

export const zhCA = {
  title: '人力资源',
  subtitle: '管理员工、考勤、薪资和团队运营。',
  back: '返回',
  loading: {
    title: '正在加载人力资源标签',
    description: '仅下载所选的人力资源工作区。',
  },
  access: {
    loadingTitle: '正在加载人力资源权限',
    loadingDescription: '正在检查可用的工作区。',
    empty: '此用户没有可用的人力资源标签。',
  },
  tabError: {
    eyebrow: '标签不可用',
    title: '无法加载此人力资源标签',
    description: '应用无法下载此工作区。请刷新标签以重新请求该模块。',
    reload: '刷新标签',
  },
  tabs: {
    collaborators: '员工',
    attendance: '考勤',
    control: '考勤控制',
    payroll: '薪资',
    announcements: '公告',
    assets: '资产',
    records: '记录',
    permissions: '权限',
    incentives: '激励',
    kpis: '绩效指标',
  },
} satisfies HumanResourcesTranslations;
