import type { ConsultingTranslations } from './types';

export const zhCA: ConsultingTranslations = {
  title: '咨询', subtitle: '预约并跟进与 Indice 团队的咨询。',
  loading: '正在准备咨询日程…', errorDescription: '请重试以加载您的咨询和可用时间。', requestError: '无法发送请求。您填写的内容仍保留在页面上，请重试。', retry: '重试',
  benefitIncluded: '您的首次线上咨询已包含在服务中', benefitAdditional: '额外咨询', duration: '50 分钟', pendingNotice: '请选择方便的日期和时间。Indice 顾问将联系您，了解需求并确认咨询。',
  brandPromiseTitle: '在企业成长的路上，您从不孤单', brandPromiseDescription: 'Indice 陪伴企业成长的每一个阶段。当您需要帮助时，我们会与您一起分析业务情况、支持决策，并协助您以最高效的方式实施 Indice。', consultantChangeNote: '我们希望您感到被支持并安心。如果需要，您可以为下一次咨询申请更换顾问。',
  scheduleTitle: '申请咨询', scheduleDescription: '先告诉我们方便的时间，再一起确定最合适的支持方式。', stepSession: '2 · 形式', stepTime: '1 · 日期和时间', stepContext: '3 · 主题和联系方式', includedBadge: '已包含在账户中', additionalBadge: '需要单独付费',
  preferredDate: '首选日期', preferredTime: '首选时间', alternativeTitle: '备选时间', addAlternative: '添加备选时间', removeAlternative: '移除备选时间', timezone: '时区',
  consultationMode: '您希望采用哪种咨询方式？', virtualMode: '线上', virtualDescription: '可以从任何国家接入。会议链接会在确认时间临近时显示。', inPersonMode: '线下', inPersonDescription: '目前仅在墨西哥和加拿大的指定城市提供。', inPersonCost: '线下咨询需支付额外费用。我们会在确认前发送报价。', inPersonQuoteBadge: '线下咨询报价待处理',
  country: '线下咨询国家', city: '城市', cityPlaceholder: '选择城市', otherCity: '以上城市均不适用', unsupportedCountry: '此国家目前尚无可提供线下服务的顾问。', useVirtualInstead: '您可以选择线上咨询，从任何地点获得支持。',
  topic: '您希望解决什么问题？', topics: { ONBOARDING: 'Indice 初始实施', BUSINESS_CONSULTING: '商业咨询', OPERATIONS: '流程和运营', PEOPLE: '人员和组织', SALES: '销售和商业方案', FINANCE: '财务和指标', OTHER: '其他业务挑战' },
  notes: '说明背景', notesPlaceholder: '简要说明挑战、需要做出的决定或期望的结果。', attendeeName: '参会者姓名', attendeeEmail: '联系邮箱', attendeePhone: '联系电话', submit: '发送请求', submitting: '正在发送请求…', confirmationNote: '请求将保持“待确认”状态。顾问会联系您协调咨询。',
  upcomingTitle: '下一次咨询', requested: '待确认', confirmed: '已确认', paymentRequired: '付款或报价待处理', cancelled: '已取消', completed: '已完成', preferredLabel: '首选时间', alternativeLabel: '备选时间', meetingLink: '进入咨询', meetingPending: '链接将在咨询开始前 15 分钟开放。', meetingAvailableAt: '可进入时间', consultantLabel: '指定顾问',
  requestFlow: '请求进度', flowRequested: '请求已发送', flowConfirmed: '预约已确认', flowSession: '咨询', cancelAction: '取消请求', cancelling: '正在取消…', historyTitle: '咨询记录', historyEmpty: '您尚未申请咨询。', successTitle: '请求已发送', successDescription: '您的请求正在等待确认。顾问会联系您协调咨询。',
  requiredMessage: '请先填写必填信息。', invalidDateMessage: '请选择至少提前 24 小时的工作时段。', locationRequiredMessage: '请选择提供线下服务的城市，或改为线上咨询。', notificationWarning: '请求已保存，但邮件通知发送失败。团队仍可在 Root 中查看。',
  countries: { MX: '🇲🇽 墨西哥', CA: '🇨🇦 加拿大', US: '🇺🇸 美国', BR: '🇧🇷 巴西', CO: '🇨🇴 哥伦比亚' },
};
