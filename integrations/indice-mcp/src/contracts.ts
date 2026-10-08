import {financeReadNames,financeActionNames} from "./financeContracts.js";
import { z } from "zod";

const nativeCurrencyTotalSchema = z.object({
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number()
});

const exchangeRateContextSchema = z.object({
  mode: z.string(),
  effectiveDate: z.iso.date(),
  source: z.string()
});

const monetaryTotalSchema = z.object({
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/),
  preferredTotal: z.number(),
  nativeTotals: z.array(nativeCurrencyTotalSchema),
  exchangeRate: exchangeRateContextSchema,
  partial: z.boolean(),
  excludedRecords: z.number().int().nonnegative(),
  excludedCurrencies: z.array(z.string())
});

export const salesTodaySummarySchema = z.object({
  date: z.iso.date(),
  timezone: z.string().min(1),
  saleCount: z.number().int().nonnegative(),
  monetaryTotal: monetaryTotalSchema
});

export type SalesTodaySummary = z.infer<typeof salesTodaySummarySchema>;

export const businessPeriodSchema = z.enum([
  "monthly",
  "bimonthly",
  "quarterly",
  "semester",
  "annual",
  "custom"
]);

export const businessSnapshotQuerySchema = z.object({
  period: businessPeriodSchema.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  preferredCurrency: z.string().regex(/^[A-Z]{3}$/).optional()
}).superRefine((value, context) => {
  if ((value.from || value.to) && value.period !== "custom") {
    context.addIssue({
      code: "custom",
      message: "from and to require period custom."
    });
  }
  if (value.period === "custom" && (!value.from || !value.to)) {
    context.addIssue({
      code: "custom",
      message: "period custom requires from and to."
    });
  }
});

export const businessSnapshotSchema = z.object({
  range: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
    period: businessPeriodSchema
  }),
  context: z.object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    generatedAt: z.iso.datetime(),
    scopeLabel: z.string().min(1)
  }),
  summary: z.object({
    salesTotal: z.number(),
    collectedTotal: z.number(),
    expensesTotal: z.number(),
    payablesTotal: z.number(),
    receivablesTotal: z.number(),
    overdueReceivables: z.number(),
    pettyCashBalance: z.number(),
    operatingProfit: z.number(),
    operatingMargin: z.number(),
    totalTasks: z.number().int().nonnegative(),
    overdueTasks: z.number().int().nonnegative(),
    absences: z.number().int().nonnegative(),
    attendanceRate: z.number(),
    organizationRows: z.number().int().nonnegative(),
    executiveScore: z.number().int()
  }),
  alerts: z.array(z.object({
    status: z.enum(["healthy", "watch", "critical"]),
    title: z.string().min(1),
    description: z.string().min(1)
  }))
});

export type BusinessSnapshotQuery = z.infer<typeof businessSnapshotQuerySchema>;
export type BusinessSnapshot = z.infer<typeof businessSnapshotSchema>;

export const attentionItemsSchema = z.object({
  range: businessSnapshotSchema.shape.range,
  context: businessSnapshotSchema.shape.context.extend({
    source: z.literal("executive_kpis")
  }),
  overview: z.object({
    executiveScore: z.number().int(),
    criticalCount: z.number().int().nonnegative(),
    watchCount: z.number().int().nonnegative(),
    healthy: z.boolean()
  }),
  items: z.array(z.object({
    status: z.enum(["critical", "watch"]),
    title: z.string().min(1),
    description: z.string().min(1)
  }))
});

export type AttentionItems = z.infer<typeof attentionItemsSchema>;

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);

export const taskPreviewRequestSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(2000).optional(),
  priority: taskPrioritySchema.optional(),
  dueDate: z.iso.date().optional(),
  assigneeUserCompanyId: z.number().int().positive().optional(),
  unitId: z.number().int().positive().optional(),
  businessId: z.number().int().positive().optional()
}).strict();

export const taskUpdateRequestSchema = taskPreviewRequestSchema.partial().extend({
  taskId: z.number().int().positive(),
  status: z.enum(["pending", "in_progress", "paused", "completed", "cancelled"]).optional(),
  clearDescription: z.boolean().optional(),
  clearDueDate: z.boolean().optional(),
  clearBusiness: z.boolean().optional()
}).strict();
export type TaskUpdateRequest = z.infer<typeof taskUpdateRequestSchema>;

export const taskOperationNameSchema = z.enum(["schedule_task", "add_task_follow_up", "update_task_contribution", "share_task", "complete_task", "audit_task", "cancel_task", "update_task_dependency"]);
export type TaskOperationName = z.infer<typeof taskOperationNameSchema>;
export const taskOperationSchema = z.object({
  action: taskOperationNameSchema,
  agendaDate: z.iso.date().nullable().optional(), startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(), timeZone: z.string().nullable().optional(),
  comment: z.string().max(2000).nullable().optional(), followUpDate: z.iso.date().nullable().optional(),
  entryType: z.enum(["update", "decision", "blocker", "reminder"]).nullable().optional(),
  contributionStatus: z.enum(["pending", "working", "ready"]).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(), completionPercent: z.number().int().min(0).max(100).nullable().optional(),
  weighting: z.number().int().min(0).max(5).nullable().optional(),
  collaboratorUserCompanyIds: z.array(z.number().int().positive()).min(1).max(25).nullable().optional(),
  predecessorTaskId:z.number().int().positive().nullable().optional(),lagDays:z.number().int().min(0).max(365).nullable().optional()
}).strict();
export const taskOperationRequestSchema = z.object({ taskId: z.number().int().positive(), operation: taskOperationSchema }).strict();
export type TaskOperationRequest = z.infer<typeof taskOperationRequestSchema>;

export const taskDraftSchema = z.object({
  title: z.string().min(1).max(220),
  description: z.string().nullable(),
  priority: taskPrioritySchema,
  dueDate: z.iso.date().nullable(),
  assignee: z.string().min(1),
  assigneeUserCompanyId: z.number().int().positive().nullable().optional(),
  unitId: z.number().int().positive().nullable().optional(),
  unitName: z.string().nullable().optional(),
  businessId: z.number().int().positive().nullable().optional(),
  businessName: z.string().nullable().optional(),
  taskId: z.number().int().positive().nullable().optional(),
  status: z.string().optional(),
  expectedVersion: z.string().nullable().optional(),
  changedFields: z.array(z.string()).optional(),
  operation: taskOperationSchema.nullable().optional(),
  teamReview: z.object({
    before: z.array(z.object({ userCompanyId: z.number().int().positive(), name: z.string() })),
    after: z.array(z.object({ userCompanyId: z.number().int().positive(), name: z.string() })),
    added: z.array(z.object({ userCompanyId: z.number().int().positive(), name: z.string() })),
    removed: z.array(z.object({ userCompanyId: z.number().int().positive(), name: z.string() }))
  }).nullable().optional()
});

export const taskPreviewResponseSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  expiresAt: z.iso.datetime(),
  requiresConfirmation: z.literal(true),
  task: taskDraftSchema,
  before: taskDraftSchema.nullable().optional()
});

export const taskCommitRequestSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  idempotencyKey: z.string().min(8).max(128)
}).strict();

export const taskResultSchema = z.object({
  id: z.number().int().positive(),
  folio: z.string().nullable(),
  title: z.string().min(1),
  status: z.string().min(1),
  dueDate: z.iso.date().nullable(),
  assigneeUserCompanyId: z.number().int().positive().nullable().optional(),
  assignee: z.string().nullable().optional()
});

export const taskCommitResponseSchema = z.object({
  replayed: z.boolean(),
  correlationId: z.uuid(),
  task: taskResultSchema
});

export type TaskPreviewRequest = z.infer<typeof taskPreviewRequestSchema>;
export type TaskPreviewResponse = z.infer<typeof taskPreviewResponseSchema>;
export type TaskCommitRequest = z.infer<typeof taskCommitRequestSchema>;
export type TaskCommitResponse = z.infer<typeof taskCommitResponseSchema>;

export const businessQueryResultSchema = z.object({
  tool: z.string().min(1),
  generatedAt: z.iso.datetime(),
  scope: z.string().min(1),
  count: z.number().int().nonnegative(),
  returnedCount: z.number().int().nonnegative().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  hasMore: z.boolean().optional(),
  nextCursor: z.string().nullable().optional(),
  summary: z.record(z.string(), z.unknown()),
  items: z.array(z.record(z.string(), z.unknown())),
  detail: z.unknown().optional()
});

export type BusinessQueryResult = z.infer<typeof businessQueryResultSchema>;

export const financeActionNameSchema = z.enum([
  "create_expense_draft",
  "register_fund_expense",
  "add_money_to_fund"
]);

export const financeActionPreviewResponseSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  expiresAt: z.iso.datetime(),
  requiresConfirmation: z.literal(true),
  action: financeActionNameSchema,
  preview: z.record(z.string(), z.unknown())
});

export const financeActionCommitRequestSchema = z.object({
  confirmationToken: z.string().startsWith("idx_confirm_"),
  idempotencyKey: z.string().min(8).max(128)
});

export const financeActionCommitResponseSchema = z.object({
  replayed: z.boolean(),
  correlationId: z.uuid(),
  action: financeActionNameSchema,
  result: z.record(z.string(), z.unknown())
});

export type FinanceActionName = z.infer<typeof financeActionNameSchema>;
export type FinanceActionPreviewResponse = z.infer<typeof financeActionPreviewResponseSchema>;
export type FinanceActionCommitRequest = z.infer<typeof financeActionCommitRequestSchema>;
export type FinanceActionCommitResponse = z.infer<typeof financeActionCommitResponseSchema>;

export const referencePageRequestSchema = z.object({
  query: z.string().trim().max(120).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: z.string().max(256).optional()
});

export const businessContextResponseSchema = z.object({
  generatedAt: z.iso.datetime(),
  companyId: z.number().int().positive(),
  companyName: z.string().min(1),
  userId: z.number().int().positive(),
  userCompanyId: z.number().int().positive(),
  userName: z.string().min(1),
  role: z.string().min(1),
  scopeType: z.string().min(1),
  assignedUnitId: z.number().int().positive().nullable(),
  assignedUnitName: z.string().nullable(),
  assignedBusinessId: z.number().int().positive().nullable(),
  assignedBusinessName: z.string().nullable()
});

const referencePageMetadataShape = {
  generatedAt: z.iso.datetime(),
  scopeType: z.string().min(1),
  returnedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable()
};

export const organizationReferencePageSchema = z.object({
  ...referencePageMetadataShape,
  items: z.array(z.object({
    referenceType: z.enum(["UNIT", "BUSINESS"]),
    id: z.number().int().positive(),
    name: z.string().min(1),
    unitId: z.number().int().positive().nullable(),
    unitName: z.string().nullable(),
    status: z.string().min(1)
  })).max(50)
});

export const paymentAccountReferencePageSchema = z.object({
  ...referencePageMetadataShape,
  items: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    type: z.string().min(1),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    currentBalance: z.number(),
    pendingBalance: z.number(),
    totalBalance: z.number(),
    unitId: z.number().int().positive().nullable(),
    businessId: z.number().int().positive().nullable(),
    status: z.string().min(1),
    systemManaged: z.boolean()
  })).max(50)
});

export const fundReferencePageSchema = z.object({
  ...referencePageMetadataShape,
  items: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    fundType: z.string().min(1),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    limitAmount: z.number(),
    currentBalanceAmount: z.number(),
    paymentAccountId: z.number().int().positive().nullable(),
    fundingSourcePaymentAccountId: z.number().int().positive().nullable(),
    unitId: z.number().int().positive().nullable(),
    businessId: z.number().int().positive().nullable(),
    status: z.string().min(1)
  })).max(50)
});

export type ReferencePageRequest = z.infer<typeof referencePageRequestSchema>;
export type BusinessContextResponse = z.infer<typeof businessContextResponseSchema>;
export type OrganizationReferencePage = z.infer<typeof organizationReferencePageSchema>;
export type PaymentAccountReferencePage = z.infer<typeof paymentAccountReferencePageSchema>;
export type FundReferencePage = z.infer<typeof fundReferencePageSchema>;

export const indiceToolNameSchema = z.enum([...financeReadNames,...financeActionNames,...financeActionNames.map(n=>`preview_${n}` as const),"export_finance_report","attach_expense_file","preview_attach_expense_file","attach_budget_line_file","preview_attach_budget_line_file","attach_petty_cash_receipt_file","preview_attach_petty_cash_receipt_file","get_learning_progress","get_next_learning_mission","preview_update_learning_progress","update_learning_progress","get_pos_terminal_binding","get_pos_terminal_payment","get_pos_terminal_payment_by_request","list_pos_pending_terminal_payments","get_pos_card_refund","get_pos_card_refund_by_request","get_pos_card_return_refund","create_pos_terminal_payment","recover_pos_terminal_payment","cancel_pos_terminal_payment","refund_pos_card_payment","recheck_pos_card_refund","confirm_pos_card_return","preview_create_pos_terminal_payment","preview_recover_pos_terminal_payment","preview_cancel_pos_terminal_payment","preview_refund_pos_card_payment","preview_recheck_pos_card_refund","preview_confirm_pos_card_return","list_pos_closings","get_pos_closing","list_pos_closing_settlements","list_pos_source_orders","get_pos_source_order","list_pos_pretickets","get_pos_preticket","confirm_pos_closing_settlement","claim_pos_source_order","release_pos_source_order","claim_pos_preticket","release_pos_preticket","preview_confirm_pos_closing_settlement","preview_claim_pos_source_order","preview_release_pos_source_order","preview_claim_pos_preticket","preview_release_pos_preticket","list_sales_commission_cuts","get_sales_commission_cut","list_sales_commission_schedules","get_sales_commission_schedule","create_sales_commission_cut","create_sales_commission_schedule","update_sales_commission_schedule","set_sales_commission_schedule_status","preview_create_sales_commission_cut","preview_create_sales_commission_schedule","preview_update_sales_commission_schedule","preview_set_sales_commission_schedule_status","list_inventory_providers",
  "get_inventory_provider",
  "list_inventory_discounts",
  "get_inventory_discount",
  "evaluate_inventory_discounts",
  "preview_create_inventory_provider",
  "preview_update_inventory_provider",
  "preview_set_inventory_provider_status",
  "preview_create_inventory_discount",
  "preview_update_inventory_discount",
  "preview_set_inventory_discount_status",
  "create_inventory_provider",
  "update_inventory_provider",
  "set_inventory_provider_status",
  "create_inventory_discount",
  "update_inventory_discount",
  "set_inventory_discount_status",
  "list_purchase_orders",
  "get_purchase_order",
  "list_supplier_submissions",
  "get_supplier_submission",
  "list_supplier_invoices",
  "get_supplier_invoice",
  "list_product_suppliers",
  "get_product_supplier",
  "preview_create_purchase_order",
  "preview_update_purchase_order_draft",
  "preview_request_purchase_order",
  "preview_approve_purchase_order",
  "preview_send_purchase_order",
  "preview_cancel_purchase_order",
  "preview_receive_purchase_order",
  "preview_create_supplier_submission",
  "preview_review_supplier_submission",
  "preview_convert_supplier_submission",
  "preview_submit_supplier_invoice",
  "preview_review_supplier_invoice",
  "preview_save_product_supplier",
  "preview_update_product_supplier",
  "create_purchase_order",
  "update_purchase_order_draft",
  "request_purchase_order",
  "approve_purchase_order",
  "send_purchase_order",
  "cancel_purchase_order",
  "receive_purchase_order",
  "create_supplier_submission",
  "review_supplier_submission",
  "convert_supplier_submission",
  "submit_supplier_invoice",
  "review_supplier_invoice",
  "save_product_supplier",
  "update_product_supplier",
  "list_pos_registers","get_pos_register","list_pos_shifts","get_pos_shift","get_my_pos_shift","get_pos_closing_summary","list_pos_tickets","get_pos_ticket","list_pos_cash_movements","list_pos_inventory_receipts","get_pos_return","recover_pos_checkout","preview_create_pos_register","create_pos_register","preview_update_pos_register","update_pos_register","preview_inactivate_pos_register","inactivate_pos_register","preview_open_pos_shift","open_pos_shift","preview_close_pos_shift","close_pos_shift","preview_cancel_pos_shift","cancel_pos_shift","preview_record_pos_cash_movement","record_pos_cash_movement","preview_complete_pos_checkout","complete_pos_checkout","preview_receive_pos_inventory","receive_pos_inventory","preview_reverse_pos_inventory_receipt","reverse_pos_inventory_receipt","preview_prepare_pos_return","prepare_pos_return","preview_confirm_pos_cash_return","confirm_pos_cash_return","preview_cancel_pos_return","cancel_pos_return","list_commercial_sales","get_commercial_sale","list_sales_contracts","get_sales_contract","list_sales_follow_ups","get_sales_follow_up","list_commission_rules","get_commission_rule","preview_create_commercial_sale","create_commercial_sale","preview_update_commercial_sale","update_commercial_sale","preview_convert_quote_to_sale","convert_quote_to_sale","preview_approve_sale_commercial","approve_sale_commercial","preview_confirm_sale_inventory","confirm_sale_inventory","preview_confirm_sale_collection","confirm_sale_collection","preview_update_sale_delivery","update_sale_delivery","preview_cancel_commercial_sale","cancel_commercial_sale","preview_create_sales_contract","create_sales_contract","preview_update_sales_contract","update_sales_contract","preview_review_sales_contract","review_sales_contract","preview_cancel_sales_contract","cancel_sales_contract","preview_create_sales_follow_up","create_sales_follow_up","preview_update_sales_follow_up","update_sales_follow_up","preview_set_sales_follow_up_status","set_sales_follow_up_status","preview_create_commission_rule","create_commission_rule","preview_update_commission_rule","update_commission_rule","preview_set_commission_rule_status","set_commission_rule_status","list_inventory_products","get_inventory_product","list_inventory_warehouses","get_inventory_warehouse","list_inventory_balances","get_inventory_balance","list_inventory_movements","get_inventory_movement","get_inventory_metrics","preview_create_inventory_product","create_inventory_product","preview_update_inventory_product","update_inventory_product","preview_inactivate_inventory_product","inactivate_inventory_product","preview_create_inventory_warehouse","create_inventory_warehouse","preview_update_inventory_warehouse","update_inventory_warehouse","preview_inactivate_inventory_warehouse","inactivate_inventory_warehouse","preview_configure_inventory_stock","configure_inventory_stock","preview_receive_inventory_stock","receive_inventory_stock","preview_issue_inventory_stock","issue_inventory_stock","preview_transfer_inventory_stock","transfer_inventory_stock","preview_count_inventory_stock","count_inventory_stock","preview_cancel_inventory_movement","cancel_inventory_movement","stage_chatgpt_file","get_my_attendance_calendar","get_my_attendance_events","get_hr_attendance_events","preview_assign_hr_rest_days","assign_hr_rest_days","stage_operational_file","list_operational_files","get_operational_file","export_hr_payroll","export_commerce_report","preview_attach_inventory_product_image","attach_inventory_product_image","preview_attach_sale_payment_evidence","attach_sale_payment_evidence","preview_attach_sales_contract_file","attach_sales_contract_file","preview_attach_supplier_invoice_file","attach_supplier_invoice_file","preview_attach_pos_receipt_file","attach_pos_receipt_file","preview_attach_employee_document","attach_employee_document","preview_attach_announcement_file","attach_announcement_file","preview_add_hr_asset_photo","add_hr_asset_photo","preview_attach_hr_record_file","attach_hr_record_file","preview_attach_my_hr_permission_file","attach_my_hr_permission_file","preview_attach_hr_permission_file","attach_hr_permission_file","preview_attach_task_evidence","attach_task_evidence","get_hr_kpis", "list_hr_payroll_runs", "get_hr_payroll_run", "preview_prepare_hr_payroll", "prepare_hr_payroll", "preview_adjust_hr_payroll_line", "adjust_hr_payroll_line", "preview_recalculate_hr_payroll", "recalculate_hr_payroll", "preview_approve_hr_payroll", "approve_hr_payroll", "preview_register_hr_payroll_paid", "register_hr_payroll_paid", "preview_cancel_hr_payroll", "cancel_hr_payroll", "list_projects", "get_project", "list_processes", "get_process", "list_process_collaborators", "list_process_runs", "get_process_run", "get_process_version", "preview_create_project", "create_project", "preview_update_project", "update_project", "preview_complete_project", "complete_project", "preview_cancel_project", "cancel_project", "preview_archive_project", "archive_project", "preview_create_process", "create_process", "preview_update_process", "update_process", "preview_pause_process", "pause_process", "preview_archive_process", "archive_process", "preview_generate_process_tasks", "generate_process_tasks", "preview_create_process_run", "create_process_run", "list_hr_schedule_candidates", "list_hr_schedules", "get_hr_schedule", "list_hr_locations", "get_hr_location", "get_hr_attendance_calendar", "preview_create_hr_schedule", "create_hr_schedule", "preview_update_hr_schedule", "update_hr_schedule", "preview_assign_hr_schedule", "assign_hr_schedule", "preview_create_hr_location", "create_hr_location", "preview_update_hr_location", "update_hr_location", "preview_set_hr_allowed_locations", "set_hr_allowed_locations", "preview_assign_hr_work_site", "assign_hr_work_site", "preview_clear_hr_work_assignments", "clear_hr_work_assignments", "preview_correct_hr_attendance", "correct_hr_attendance", "preview_record_hr_attendance_event", "record_hr_attendance_event", "get_process_task_kpis", "get_hr_asset_history","get_announcement_receipts",
  "list_hr_incentives",
  "get_hr_incentive",
  "preview_create_hr_incentive", "create_hr_incentive",
  "preview_cancel_hr_incentive", "cancel_hr_incentive",
  "list_my_hr_permissions",
  "get_my_hr_permission",
  "list_hr_permissions",
  "get_hr_permission",
  "preview_create_my_hr_permission", "create_my_hr_permission",
  "preview_withdraw_my_hr_permission", "withdraw_my_hr_permission",
  "preview_approve_hr_permission", "approve_hr_permission",
  "preview_reject_hr_permission", "reject_hr_permission",
  "preview_update_task_dependency", "update_task_dependency",
  "preview_terminate_employee", "terminate_employee",
  "preview_update_hr_asset", "update_hr_asset",
  "preview_reassign_hr_asset", "reassign_hr_asset",
  "preview_change_hr_asset_status", "change_hr_asset_status",
  "preview_update_announcement", "update_announcement",
  "preview_mark_announcement_read", "mark_announcement_read",
  "preview_mark_announcement_unread", "mark_announcement_unread",
  "preview_create_hr_record", "create_hr_record",
  "preview_update_hr_record", "update_hr_record",
  "list_announcement_audience",
  "list_hr_records", "get_hr_record_detail",
  "list_hr_organization",
  "get_employee_file", "list_hr_assets", "get_hr_asset_detail", "list_announcements", "get_announcement_detail",
  "create_employee", "preview_create_employee", "update_employee", "preview_update_employee",
  "import_employees", "preview_import_employees", "inactivate_employee", "preview_inactivate_employee",
  "create_hr_asset", "preview_create_hr_asset", "create_announcement", "preview_create_announcement",
  "get_system_guide",
  "schedule_task", "preview_schedule_task", "add_task_follow_up", "preview_add_task_follow_up",
  "update_task_contribution", "preview_update_task_contribution", "share_task", "preview_share_task",
  "complete_task", "preview_complete_task", "audit_task", "preview_audit_task", "cancel_task", "preview_cancel_task",
  "list_task_organization",
  "get_customer_detail",
  "list_opportunities",
  "get_opportunity_detail",
  "get_opportunity_pipeline",
  "list_quotes",
  "get_quote_detail",
  "search_commercial_assignees",
  "preview_create_customer",
  "create_customer",
  "preview_update_customer",
  "update_customer",
  "preview_create_opportunity",
  "create_opportunity",
  "preview_update_opportunity",
  "update_opportunity",
  "preview_create_quote",
  "create_quote",
  "preview_update_quote",
  "update_quote",

  "get_sales_today",
  "get_business_snapshot",
  "get_attention_items",
  "search_employees",
  "get_employee_overview",
  "get_attendance_exceptions",
  "list_tasks",
  "get_task_detail",
  "get_sales_summary",
  "list_sales",
  "get_sale_detail",
  "get_cash_status",
  "search_products",
  "get_product_detail",
  "get_inventory_summary",
  "get_expense_summary",
  "list_expenses",
  "get_expense_detail",
  "get_funds_status",
  "get_receivables_status",
  "get_my_business_context",
  "list_units_and_businesses",
  "list_payment_accounts",
  "list_funds",
  "search_customers",
  "search_providers",
  "list_warehouses",
  "search_budget_lines",
  "search_accounting_accounts",
  "search_task_assignees",
  "preview_update_task",
  "update_task",
  "preview_create_task",
  "create_task",
  "preview_create_expense_draft",
  "create_expense_draft",
  "preview_register_fund_expense",
  "register_fund_expense",
  "preview_add_money_to_fund",
  "add_money_to_fund"
]);

export const toolCapabilitiesSchema = z.object({
  version: z.literal("v1"),
  tools: z.array(indiceToolNameSchema).max(indiceToolNameSchema.options.length)
});

export type IndiceToolName = z.infer<typeof indiceToolNameSchema>;
export type ToolCapabilities = z.infer<typeof toolCapabilitiesSchema>;
