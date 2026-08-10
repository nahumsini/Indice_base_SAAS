import type { BillingTranslations } from './types';

export const zhCA = {
  billingDayLabel: (day: number) => `每月 ${day} 日`,
  recovery: {
    loadError: '无法查询订阅信息。',
    portalError: '无法打开账单门户。',
    loading: '正在查询当前商业状态...',
    title: '商业状态',
    syncing: '正在同步',
    enabled: '帐户操作已启用。',
    actionRequired: '请更新账单信息以恢复完整操作。',
    manage: '在 Stripe 中管理',
  },
  storage: {
    title: '帐户存储空间',
    summary: (purchased: number, benefit: number) =>
      `包含 5 GB · 已购买 ${purchased} 个 · 赠送 ${benefit} 个`,
    usageLabel: '存储空间使用量',
    note: '包括已保存的文件和预留上传。商业定价获批后即可购买存储空间块。',
  },
} as const satisfies BillingTranslations;
