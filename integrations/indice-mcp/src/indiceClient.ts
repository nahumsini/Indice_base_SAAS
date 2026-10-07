import {financeReadNameSchema,financeActionNameSchema,financeInputs,financeQuerySchema,financeCommitRequestSchema,PageSchema,PreviewSchema,CommittedSchema,type FinanceReadName,type FinanceWorkflowActionName,type FinanceQuery,type FinanceChange,type FinancePage,type FinancePreview,type FinanceCommitted} from "./financeContracts.js";
import { terminalReadNameSchema,terminalActionNameSchema,terminalQuerySchema,terminalInputs,terminalReadSchema,terminalPreviewSchema,terminalCommittedSchema,terminalCommitRequestSchema,type TerminalReadName,type TerminalActionName,type TerminalQuery,type TerminalChange,type TerminalReadResult,type TerminalPreview,type TerminalCommitted } from "./terminalContracts.js";
import { posOperationsReadNameSchema,posOperationsActionNameSchema,posOperationsQuerySchema,posOperationsInputs,posOperationsReadSchema,posOperationsPreviewSchema,posOperationsCommittedSchema,posOperationsCommitRequestSchema,type PosOperationsReadName,type PosOperationsActionName,type PosOperationsQuery,type PosOperationsChange,type PosOperationsReadResult,type PosOperationsPreview,type PosOperationsCommitted } from "./posOperationsContracts.js";
import { commissionReadNameSchema,commissionActionNameSchema,commissionQuerySchema,commissionInputs,commissionReadSchema,commissionPreviewSchema,commissionCommittedSchema,commissionCommitRequestSchema,type CommissionReadName,type CommissionActionName,type CommissionQuery,type CommissionChange,type CommissionReadResult,type CommissionPreview,type CommissionCommitted } from "./commissionContracts.js";
import { inventoryCatalogReadNameSchema,inventoryCatalogActionNameSchema,inventoryCatalogQuerySchema,inventoryCatalogInputs,inventoryCatalogReadSchema,inventoryCatalogPreviewSchema,inventoryCatalogCommittedSchema,inventoryCatalogCommitRequestSchema,type InventoryCatalogReadName,type InventoryCatalogActionName,type InventoryCatalogQuery,type InventoryCatalogChange,type InventoryCatalogReadResult,type InventoryCatalogPreview,type InventoryCatalogCommitted } from "./inventoryCatalogContracts.js";
import { procurementReadNameSchema,procurementActionNameSchema,procurementQuerySchema,procurementInputs,procurementReadSchema,procurementPreviewSchema,procurementCommittedSchema,procurementCommitRequestSchema,type ProcurementReadName,type ProcurementActionName,type ProcurementQuery,type ProcurementChange,type ProcurementReadResult,type ProcurementPreview,type ProcurementCommitted } from "./procurementContracts.js";
import { posReadNameSchema,posActionNameSchema,posQuerySchema,posInputs,posReadSchema,posPreviewSchema,posCommittedSchema,posCommitRequestSchema,type PosReadName,type PosActionName,type PosQuery,type PosChange,type PosReadResult,type PosPreview,type PosCommitted } from "./posContracts.js";
import { salesWorkflowReadNameSchema,salesWorkflowActionNameSchema,salesWorkflowQuerySchema,salesWorkflowInputs,salesWorkflowReadSchema,salesWorkflowPreviewSchema,salesWorkflowCommittedSchema,salesWorkflowCommitRequestSchema,type SalesWorkflowReadName,type SalesWorkflowActionName,type SalesWorkflowQuery,type SalesWorkflowChange,type SalesWorkflowReadResult,type SalesWorkflowPreview,type SalesWorkflowCommitted } from "./salesWorkflowContracts.js";
import { inventoryReadNameSchema,inventoryActionNameSchema,inventoryQuerySchema,inventoryInputs,inventoryReadSchemas,inventoryPreviewSchema,inventoryCommittedSchema,inventoryCommitRequestSchema,type InventoryReadName,type InventoryActionName,type InventoryQuery,type InventoryChange,type InventoryReadResult,type InventoryPreview,type InventoryCommitted } from "./inventoryContracts.js";
import { financeReportRequestSchema,commerceReportRequestSchema,stageFileRequestSchema,stagedFileSchema,fileActionSchema,attachFileRequestSchema,filePreviewSchema,fileCommittedSchema,fileCommitRequestSchema,fileListRequestSchema,fileListSchema,fileReadRequestSchema,fileExportRequestSchema,fileContentSchema,type StageFileRequest,type StagedFile,type FileAction,type FilePreview,type FileCommitted,type FileListRequest,type FileReadRequest,type FileExportRequest,type FileList,type FileContent } from "./fileContracts.js";
import { hrKpiRequestSchema,hrKpiResultSchema,type HrKpiRequest,type HrKpiResult } from "./hrKpiTools.js";
import { processReadNameSchema,processActionNameSchema,processReadRequestSchema,processChangeRequestSchema,processReadSchemas,processPreviewSchema,processCommittedSchema,processCommitRequestSchema,type ProcessReadName,type ProcessActionName,type ProcessReadRequest,type ProcessReadResult,type ProcessChangeRequest,type ProcessPreview,type ProcessCommitted } from "./processWorkflowContracts.js";
import { commercialTools } from "./commercialTools.js";
import { processTaskKpiRequestSchema, processTaskKpiResultSchema, type ProcessTaskKpiRequest, type ProcessTaskKpiResult } from "./processTaskKpiTools.js";
import { hrActionNameSchema, hrReadNameSchema, hrReadSchemas, hrReadRequestSchema, hrChangeSchema, hrPreviewSchema, hrCommitSchema,
  type HrActionName, type HrReadName, type HrReadRequest, type HrReadResult, type HrChange, type HrPreview, type HrCommitted } from "./hrContracts.js";
import { learningRequestSchema, learningGuideSchema, type LearningRequest, type LearningGuide } from "./learningTools.js";
import {learningProgressRequestSchema,learningChangeSchema,learningCommitSchema,learningProgressSchema,learningPreviewSchema,learningCommittedSchema,
  type LearningProgressRequest,type LearningChange,type LearningCommit,type LearningProgress,type LearningPreview,type LearningCommitted} from './learningProgressTools.js';
import type { IndiceMcpConfig } from "./config.js";
import { backendRequest, type RequestContext } from "./backendTransport.js";
import { bearerChallenge } from "./toolPolicy.js";
import * as z from "zod/v4";
import {
  taskAssigneeReferencePageSchema,
  customerReferencePageSchema, warehouseReferencePageSchema, providerReferencePageSchema,
  budgetLineReferencePageSchema, accountingAccountReferencePageSchema
} from "./operationalReferenceContracts.js";
import {
  businessSnapshotQuerySchema,
  taskOperationRequestSchema, taskOperationNameSchema, type TaskOperationName, type TaskOperationRequest,
  businessSnapshotSchema,
  businessContextResponseSchema,
  businessQueryResultSchema,
  financeActionCommitRequestSchema,
  financeActionCommitResponseSchema,
  financeActionPreviewResponseSchema,
  fundReferencePageSchema,
  organizationReferencePageSchema,
  paymentAccountReferencePageSchema,
  referencePageRequestSchema,
  salesTodaySummarySchema,
  taskCommitRequestSchema,
  taskCommitResponseSchema,
  taskPreviewRequestSchema,
  taskUpdateRequestSchema,
  type TaskUpdateRequest,
  taskPreviewResponseSchema,
  toolCapabilitiesSchema,
  type BusinessSnapshot,
  type BusinessSnapshotQuery,
  type BusinessContextResponse,
  type BusinessQueryResult,
  type FinanceActionCommitRequest,
  type FinanceActionCommitResponse,
  type FinanceActionName,
  type FinanceActionPreviewResponse,
  type FundReferencePage,
  type OrganizationReferencePage,
  type PaymentAccountReferencePage,
  type ReferencePageRequest,
  type SalesTodaySummary,
  type TaskCommitRequest,
  type TaskCommitResponse,
  type TaskPreviewRequest,
  type TaskPreviewResponse,
  type ToolCapabilities
} from "./contracts.js";

export class IndiceApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly authenticate?: string
  ) {
    super(message);
    this.name = "IndiceApiError";
  }
}

export class IndiceClient {
  private readonly cookies = new Map<string, string>();
  private authenticated = false;
  private authenticationPromise?: Promise<void>;

  constructor(
    private readonly config: IndiceMcpConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly delegatedAccessToken: string | undefined = config.accessToken,
    private readonly requestContext: RequestContext = {}
  ) {
  }

  async stageOperationalFile(request:StageFileRequest):Promise<StagedFile>{return this.fileRequest("stage_operational_file",stageFileRequestSchema.parse(request),stagedFileSchema);}
  async previewFileAttachment(action:FileAction,request:{stagedFileId:string}):Promise<FilePreview>{fileActionSchema.parse(action);return this.fileRequest(action+"/preview",attachFileRequestSchema.parse(request),filePreviewSchema);}
  async commitFileAttachment(action:FileAction,request:TaskCommitRequest):Promise<FileCommitted>{fileActionSchema.parse(action);return this.fileRequest(action+"/commit",fileCommitRequestSchema.parse(request),fileCommittedSchema);}
  async listOperationalFiles(request:FileListRequest):Promise<FileList>{return this.fileRequest("list_operational_files",fileListRequestSchema.parse(request),fileListSchema);}
  async getOperationalFile(request:FileReadRequest):Promise<FileContent>{return this.fileRequest("get_operational_file",fileReadRequestSchema.parse(request),fileContentSchema);}
  async exportCommerceReport(request:import("./fileContracts.js").CommerceReportRequest):Promise<import("./fileContracts.js").FileContent>{return this.fileRequest("export_commerce_report",commerceReportRequestSchema.parse(request),fileContentSchema);}
  async exportHrPayroll(request:FileExportRequest):Promise<FileContent>{return this.fileRequest("export_hr_payroll",fileExportRequestSchema.parse(request),fileContentSchema);}
  private async fileRequest<T>(operation:string,request:unknown,schema:z.ZodType<T>):Promise<T>{
    const response=await this.request(`/api/v1/ai/tools/files/${operation}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(request)});
    if(!response.ok)throw await this.apiError(response,"Private file operation unavailable.");
    const parsed=schema.safeParse(await response.json());if(!parsed.success)throw new IndiceApiError("Invalid private file contract.");return parsed.data;
  }

  async readFinance(tool:FinanceReadName,request:FinanceQuery):Promise<FinancePage>{financeReadNameSchema.parse(tool);return this.financeRequest(tool,financeQuerySchema.parse(request),PageSchema);}
  async previewFinance(action:FinanceWorkflowActionName,request:FinanceChange):Promise<FinancePreview>{financeActionNameSchema.parse(action);return this.financeRequest(action+"/preview",financeInputs[action].parse(request),PreviewSchema);}
  async commitFinance(action:FinanceWorkflowActionName,request:TaskCommitRequest):Promise<FinanceCommitted>{financeActionNameSchema.parse(action);return this.financeRequest(action+"/commit",financeCommitRequestSchema.parse(request),CommittedSchema);}
  private async financeRequest<T>(operation:string,request:unknown,schema:z.ZodType<T>):Promise<T>{const response=await this.request(`/api/v1/ai/tools/finance_workflows/${operation}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(request)});if(!response.ok)throw await this.apiError(response,"Finance workflow unavailable.");const result=schema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid finance workflow contract.");return result.data;}
  async exportFinanceReport(request:import("./fileContracts.js").FinanceReportRequest):Promise<FileContent>{return this.fileRequest("export_finance_report",financeReportRequestSchema.parse(request),fileContentSchema);}
  async readInventory(tool:InventoryReadName,request:InventoryQuery):Promise<InventoryReadResult>{
    inventoryReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/inventory_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=inventoryReadSchemas[tool].safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewInventory(action:InventoryActionName,request:InventoryChange):Promise<InventoryPreview>{
    inventoryActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/inventory_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=inventoryPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitInventory(action:InventoryActionName,request:TaskCommitRequest):Promise<InventoryCommitted>{
    inventoryActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/inventory_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=inventoryCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readSalesWorkflow(tool:SalesWorkflowReadName,request:SalesWorkflowQuery):Promise<SalesWorkflowReadResult>{
    salesWorkflowReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/sales_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(salesWorkflowQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=salesWorkflowReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewSalesWorkflow(action:SalesWorkflowActionName,request:SalesWorkflowChange):Promise<SalesWorkflowPreview>{
    salesWorkflowActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/sales_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(salesWorkflowInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=salesWorkflowPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitSalesWorkflow(action:SalesWorkflowActionName,request:TaskCommitRequest):Promise<SalesWorkflowCommitted>{
    salesWorkflowActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/sales_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(salesWorkflowCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=salesWorkflowCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readPos(tool:PosReadName,request:PosQuery):Promise<PosReadResult>{
    posReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/pos_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=posReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewPos(action:PosActionName,request:PosChange):Promise<PosPreview>{
    posActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/pos_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=posPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitPos(action:PosActionName,request:TaskCommitRequest):Promise<PosCommitted>{
    posActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/pos_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=posCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readProcurement(tool:ProcurementReadName,request:ProcurementQuery):Promise<ProcurementReadResult>{
    procurementReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/procurement_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(procurementQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=procurementReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewProcurement(action:ProcurementActionName,request:ProcurementChange):Promise<ProcurementPreview>{
    procurementActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/procurement_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(procurementInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=procurementPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitProcurement(action:ProcurementActionName,request:TaskCommitRequest):Promise<ProcurementCommitted>{
    procurementActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/procurement_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(procurementCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=procurementCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readInventoryCatalog(tool:InventoryCatalogReadName,request:InventoryCatalogQuery):Promise<InventoryCatalogReadResult>{
    inventoryCatalogReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/inventory_catalog_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryCatalogQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=inventoryCatalogReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewInventoryCatalog(action:InventoryCatalogActionName,request:InventoryCatalogChange):Promise<InventoryCatalogPreview>{
    inventoryCatalogActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/inventory_catalog_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryCatalogInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=inventoryCatalogPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitInventoryCatalog(action:InventoryCatalogActionName,request:TaskCommitRequest):Promise<InventoryCatalogCommitted>{
    inventoryCatalogActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/inventory_catalog_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(inventoryCatalogCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=inventoryCatalogCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readTerminal(tool:TerminalReadName,request:TerminalQuery):Promise<TerminalReadResult>{
    terminalReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/terminal_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(terminalQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=terminalReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewTerminal(action:TerminalActionName,request:TerminalChange):Promise<TerminalPreview>{
    terminalActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/terminal_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(terminalInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=terminalPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitTerminal(action:TerminalActionName,request:TaskCommitRequest):Promise<TerminalCommitted>{
    terminalActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/terminal_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(terminalCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=terminalCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readPosOperations(tool:PosOperationsReadName,request:PosOperationsQuery):Promise<PosOperationsReadResult>{
    posOperationsReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/pos_operations/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posOperationsQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=posOperationsReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewPosOperations(action:PosOperationsActionName,request:PosOperationsChange):Promise<PosOperationsPreview>{
    posOperationsActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/pos_operations/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posOperationsInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=posOperationsPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitPosOperations(action:PosOperationsActionName,request:TaskCommitRequest):Promise<PosOperationsCommitted>{
    posOperationsActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/pos_operations/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(posOperationsCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=posOperationsCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async readCommission(tool:CommissionReadName,request:CommissionQuery):Promise<CommissionReadResult>{
    commissionReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/commission_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(commissionQuerySchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=commissionReadSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewCommission(action:CommissionActionName,request:CommissionChange):Promise<CommissionPreview>{
    commissionActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/commission_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(commissionInputs[action].parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=commissionPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitCommission(action:CommissionActionName,request:TaskCommitRequest):Promise<CommissionCommitted>{
    commissionActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/commission_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(commissionCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=commissionCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }


  async readProcessWorkflow(tool:ProcessReadName,request:ProcessReadRequest):Promise<ProcessReadResult>{
    processReadNameSchema.parse(tool);
    const response=await this.request(`/api/v1/ai/tools/process_workflows/${tool}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(processReadRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read the workflow.");
    const result=processReadSchemas[tool].safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow read contract.");return result.data;
  }
  async previewProcessWorkflow(action:ProcessActionName,request:ProcessChangeRequest):Promise<ProcessPreview>{
    processActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/process_workflows/${action}/preview`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(processChangeRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to prepare the workflow.");
    const result=processPreviewSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow preview contract.");return result.data;
  }
  async commitProcessWorkflow(action:ProcessActionName,request:TaskCommitRequest):Promise<ProcessCommitted>{
    processActionNameSchema.parse(action);
    const response=await this.request(`/api/v1/ai/tools/process_workflows/${action}/commit`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(processCommitRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to apply the workflow.");
    const result=processCommittedSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid workflow commit contract.");return result.data;
  }

  async getHrKpis(request:HrKpiRequest):Promise<HrKpiResult> {
    const response=await this.request("/api/v1/ai/tools/kpis/get_hr_kpis",{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(hrKpiRequestSchema.parse(request))});
    if(!response.ok)throw await this.apiError(response,"Unable to read HR indicators.");
    const result=hrKpiResultSchema.safeParse(await response.json());if(!result.success)throw new IndiceApiError("Invalid HR KPI contract.");return result.data;
  }
  async commercial(tool: string, input: Record<string, unknown>): Promise<unknown> {
    const definition = commercialTools[tool];
    if (!definition) throw new IndiceApiError("Unsupported commercial tool.");
    const request = definition.input.parse(input);
    const response = await this.request(`/api/v1/ai/tools/commercial/${tool}`, {
      method: "POST", headers: { Authorization: `Bearer ${this.requireDelegatedToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw await this.apiError(response, "Unable to complete the commercial operation.");
    const parsed = definition.output.safeParse(await response.json());
    if (!parsed.success) throw new IndiceApiError("Indice returned an invalid commercial contract.");
    return parsed.data;
  }

  async getProcessTaskKpis(request: ProcessTaskKpiRequest): Promise<ProcessTaskKpiResult> {
    const response = await this.request("/api/v1/ai/tools/kpis/get_process_task_kpis", {
      method: "POST", headers: { Authorization: `Bearer ${this.requireDelegatedToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(processTaskKpiRequestSchema.parse(request))
    });
    if (!response.ok) throw await this.apiError(response, "Unable to load process task indicators.");
    const result = processTaskKpiResultSchema.safeParse(await response.json());
    if (!result.success) throw new IndiceApiError("Indice returned an invalid KPI contract.");
    return result.data;
  }

  async getSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary> {
    if (this.config.authMode === "delegated") {
      return this.getDelegatedSalesToday(preferredCurrency);
    }
    await this.ensureAuthenticated();
    const currency = normalizeCurrency(preferredCurrency ?? this.config.preferredCurrency);
    let response = await this.request(
      `/api/v1/sales/kpis/today?preferredCurrency=${encodeURIComponent(currency)}`,
      { method: "GET" }
    );

    if (response.status === 401) {
      this.authenticated = false;
      await this.ensureAuthenticated();
      response = await this.request(
        `/api/v1/sales/kpis/today?preferredCurrency=${encodeURIComponent(currency)}`,
        { method: "GET" }
      );
    }

    if (!response.ok) {
      throw await this.apiError(response, "Unable to load today's sales from Indice.");
    }

    const payload: unknown = await response.json();
    const parsed = salesTodaySummarySchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid sales summary contract.");
    }
    return parsed.data;
  }

  async getBusinessSnapshot(query: BusinessSnapshotQuery = {}): Promise<BusinessSnapshot> {
    const normalized = normalizeBusinessSnapshotQuery(query, this.config.preferredCurrency);
    if (this.config.authMode === "delegated") {
      return this.getDelegatedBusinessSnapshot(normalized);
    }
    await this.ensureAuthenticated();
    let response = await this.request(businessSnapshotPath("/api/v1/kpis/executive-panel", normalized), {
      method: "GET"
    });
    if (response.status === 401) {
      this.authenticated = false;
      await this.ensureAuthenticated();
      response = await this.request(businessSnapshotPath("/api/v1/kpis/executive-panel", normalized), {
        method: "GET"
      });
    }
    return this.parseBusinessSnapshot(response);
  }

  async previewCreateTask(request: TaskPreviewRequest): Promise<TaskPreviewResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = taskPreviewRequestSchema.safeParse(request);
    if (!normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid task details.");
    }
    const response = await this.request("/api/v1/ai/tools/tasks/preview", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(normalized.data)
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow task creation."
        : "Indice could not prepare the task.");
    }
    const payload: unknown = await response.json();
    const parsed = taskPreviewResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid task preview contract.");
    }
    return parsed.data;
  }

  async previewUpdateTask(request: TaskUpdateRequest): Promise<TaskPreviewResponse> {
    return this.taskUpdate("preview", taskUpdateRequestSchema.parse(request), taskPreviewResponseSchema);
  }

  async getSystemGuide(request: LearningRequest): Promise<LearningGuide> {
    const response = await this.request("/api/v1/ai/tools/learning/guide", {
      method: "POST", headers: { Authorization: `Bearer ${this.requireDelegatedToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(learningRequestSchema.parse(request))
    });
    if (!response.ok) throw await this.apiError(response, "No hay una guía revisada disponible con los permisos actuales.");
    return learningGuideSchema.parse(await response.json());
  }

  async getLearningProgress(request:LearningProgressRequest):Promise<LearningProgress> { return this.learningProgressRequest('',learningProgressRequestSchema.parse(request),learningProgressSchema); }
  async previewLearningProgress(request:LearningChange):Promise<LearningPreview> { return this.learningProgressRequest('/preview',learningChangeSchema.parse(request),learningPreviewSchema); }
  async commitLearningProgress(request:LearningCommit):Promise<LearningCommitted> { return this.learningProgressRequest('/commit',learningCommitSchema.parse(request),learningCommittedSchema); }
  private async learningProgressRequest<S extends z.ZodType>(path:string,request:unknown,schema:S):Promise<z.infer<S>> {
    const response=await this.request(`/api/v1/ai/tools/learning/progress${path}`,{method:'POST',headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,'Content-Type':'application/json'},body:JSON.stringify(request)});
    if(!response.ok)throw await this.apiError(response,'No se pudo consultar o guardar tu aprendizaje con los permisos actuales.');
    return schema.parse(await response.json());
  }

  async readHr(tool: HrReadName, request: HrReadRequest): Promise<HrReadResult> {
    const name=hrReadNameSchema.parse(tool);
    return this.hrRequest(name,hrReadRequestSchema.parse(request),hrReadSchemas[name]);
  }
  async previewHr(action: HrActionName, request: HrChange): Promise<HrPreview> {
    return this.hrRequest(`${hrActionNameSchema.parse(action)}/preview`,hrChangeSchema.parse(request),hrPreviewSchema);
  }
  async commitHr(action: HrActionName, request: TaskCommitRequest): Promise<HrCommitted> {
    return this.hrRequest(`${hrActionNameSchema.parse(action)}/commit`,taskCommitRequestSchema.parse(request),hrCommitSchema);
  }
  private async hrRequest<S extends z.ZodType>(path:string,request:unknown,schema:S):Promise<z.infer<S>> {
    const response=await this.request(`/api/v1/ai/tools/hr/${path}`,{method:"POST",headers:{Authorization:`Bearer ${this.requireDelegatedToken()}`,"Content-Type":"application/json"},body:JSON.stringify(request)});
    if(!response.ok) throw await this.apiError(response,response.status===409?"El expediente cambió, faltan lugares del plan o la confirmación caducó. Revisa el código del error y prepara otra vista previa.":"No se pudo completar la operación de RH con los permisos actuales.");
    return schema.parse(await response.json());
  }

  async updateTask(request: TaskCommitRequest): Promise<TaskCommitResponse> {
    return this.taskUpdate("commit", taskCommitRequestSchema.parse(request), taskCommitResponseSchema);
  }

  async previewTaskOperation(action: TaskOperationName, request: TaskOperationRequest): Promise<TaskPreviewResponse> {
    return this.taskOperation(action, "preview", taskOperationRequestSchema.parse(request), taskPreviewResponseSchema);
  }

  async commitTaskOperation(action: TaskOperationName, request: TaskCommitRequest): Promise<TaskCommitResponse> {
    return this.taskOperation(action, "commit", taskCommitRequestSchema.parse(request), taskCommitResponseSchema);
  }

  private async taskOperation<S extends z.ZodObject>(action: TaskOperationName, step: string, request: unknown, schema: S): Promise<z.infer<S>> {
    const response = await this.request(`/api/v1/ai/tools/tasks/operations/${taskOperationNameSchema.parse(action)}/${step}`, {
      method: "POST", headers: { Authorization: `Bearer ${this.requireDelegatedToken()}`, "Content-Type": "application/json" }, body: JSON.stringify(request)
    });
    if (!response.ok) throw await this.apiError(response, response.status === 409
      ? "La tarea cambió o la confirmación caducó. Prepara otra vista previa."
      : "No se pudo aplicar la operación de tarea con los permisos actuales.");
    return schema.parse(await response.json());
  }

  private async taskUpdate<S extends z.ZodObject>(step: string, request: unknown, schema: S): Promise<z.infer<S>> {
    const response = await this.request(`/api/v1/ai/tools/tasks/update/${step}`, {
      method: "POST", headers: { Authorization: `Bearer ${this.requireDelegatedToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });
    if (!response.ok) throw await this.apiError(response, response.status === 409
      ? "La tarea cambió o la confirmación dejó de ser válida. Prepara una nueva vista previa."
      : response.status === 403 ? "La conexión necesita permiso para editar o delegar tareas."
      : "No se pudo actualizar la tarea en Índice.");
    return schema.parse(await response.json());
  }

  async createTask(request: TaskCommitRequest): Promise<TaskCommitResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = taskCommitRequestSchema.safeParse(request);
    if (!normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid task confirmation.");
    }
    const response = await this.request("/api/v1/ai/tools/tasks/commit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(normalized.data)
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow task creation."
        : response.status === 409
          ? "The task confirmation expired, was already used, or conflicts with another request. Prepare it again."
          : "Indice could not create the confirmed task.");
    }
    const payload: unknown = await response.json();
    const parsed = taskCommitResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid created task contract.");
    }
    return parsed.data;
  }

  async queryBusiness(tool: string, args: Record<string, unknown> = {}): Promise<BusinessQueryResult> {
    const delegatedToken = this.requireDelegatedToken();
    const response = await this.request(`/api/v1/ai/tools/query/${encodeURIComponent(tool)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(args)
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow this business query."
        : "Indice could not load the requested business information.");
    }
    const payload: unknown = await response.json();
    const parsed = businessQueryResultSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid business query contract.");
    }
    return parsed.data;
  }

  async getMyBusinessContext(): Promise<BusinessContextResponse> {
    const response = await this.delegatedReferenceRequest("/api/v1/ai/tools/references/business-context", "GET");
    const payload: unknown = await response.json();
    const parsed = businessContextResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid business context contract.");
    }
    return parsed.data;
  }

  async listUnitsAndBusinesses(request: ReferencePageRequest = {}): Promise<OrganizationReferencePage> {
    const response = await this.delegatedReferenceRequest(
      "/api/v1/ai/tools/references/organization", "POST", request
    );
    const payload: unknown = await response.json();
    const parsed = organizationReferencePageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid organization reference contract.");
    }
    return parsed.data;
  }

  async listTaskOrganization(request: ReferencePageRequest = {}): Promise<OrganizationReferencePage> {
    const response = await this.delegatedReferenceRequest("/api/v1/ai/tools/references/task-organization", "POST", request);
    return organizationReferencePageSchema.parse(await response.json());
  }

  async listPaymentAccounts(request: ReferencePageRequest = {}): Promise<PaymentAccountReferencePage> {
    const response = await this.delegatedReferenceRequest(
      "/api/v1/ai/tools/references/payment-accounts", "POST", request
    );
    const payload: unknown = await response.json();
    const parsed = paymentAccountReferencePageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid payment account reference contract.");
    }
    return parsed.data;
  }

  async listFunds(request: ReferencePageRequest = {}): Promise<FundReferencePage> {
    const response = await this.delegatedReferenceRequest("/api/v1/ai/tools/references/funds", "POST", request);
    const payload: unknown = await response.json();
    const parsed = fundReferencePageSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid fund reference contract.");
    }
    return parsed.data;
  }

  async previewFinanceAction(
    action: FinanceActionName,
    request: Record<string, unknown>
  ): Promise<FinanceActionPreviewResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const response = await this.request(
      `/api/v1/ai/tools/finance/actions/${encodeURIComponent(action)}/preview`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${delegatedToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request)
      }
    );
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow this finance action."
        : "Indice could not prepare the finance action.");
    }
    const payload: unknown = await response.json();
    const parsed = financeActionPreviewResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid finance action preview contract.");
    }
    return parsed.data;
  }

  async commitFinanceAction(
    action: FinanceActionName,
    request: FinanceActionCommitRequest
  ): Promise<FinanceActionCommitResponse> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = financeActionCommitRequestSchema.safeParse(request);
    if (!normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid finance action confirmation.");
    }
    const response = await this.request(
      `/api/v1/ai/tools/finance/actions/${encodeURIComponent(action)}/commit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${delegatedToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(normalized.data)
      }
    );
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow this finance action."
        : response.status === 409
          ? "The confirmation expired, was already used, or conflicts with another request. Prepare it again."
          : "Indice could not execute the confirmed finance action.");
    }
    const payload: unknown = await response.json();
    const parsed = financeActionCommitResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid finance action result contract.");
    }
    return parsed.data;
  }

  async hasValidDelegatedAccess(): Promise<boolean> {
    if (this.config.authMode !== "delegated" || !this.delegatedAccessToken) {
      return false;
    }
    const response = await this.request("/api/v1/ai/access/verify", {
      method: "GET",
      headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
    });
    if (response.status === 401) {
      return false;
    }
    if (!response.ok) {
      throw await this.apiError(response, "Indice could not verify delegated authorization.");
    }
    return true;
  }

  async getDelegatedToolCapabilities(): Promise<ToolCapabilities | undefined> {
    if (this.config.authMode !== "delegated" || !this.delegatedAccessToken) {
      return undefined;
    }
    const response = await this.request("/api/v1/ai/access/capabilities", {
      method: "GET",
      headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
    });
    if (response.status === 401) {
      return undefined;
    }
    if (!response.ok) {
      throw await this.apiError(response, "Indice could not resolve delegated tool capabilities.");
    }
    const payload: unknown = await response.json();
    const parsed = toolCapabilitiesSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid tool capability contract.");
    }
    return parsed.data;
  }

  private async getDelegatedSalesToday(preferredCurrency?: string): Promise<SalesTodaySummary> {
    if (!this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required.", 401);
    }
    const currency = normalizeCurrency(preferredCurrency ?? this.config.preferredCurrency);
    const response = await this.request(
      `/api/v1/ai/tools/sales/today?preferredCurrency=${encodeURIComponent(currency)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
      }
    );
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow today's sales tool."
        : "Indice delegated authorization failed.");
    }

    const payload: unknown = await response.json();
    const parsed = salesTodaySummarySchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid sales summary contract.");
    }
    return parsed.data;
  }

  private requireDelegatedToken(): string {
    if (this.config.authMode !== "delegated" || !this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required for actions.", 401);
    }
    return this.delegatedAccessToken;
  }

  searchTaskAssignees(request: ReferencePageRequest = {}) {
    return this.operationalReference("task-assignees", taskAssigneeReferencePageSchema, request);
  }

  searchCustomers(request: ReferencePageRequest = {}) {
    return this.operationalReference("customers", customerReferencePageSchema, request);
  }

  searchProviders(request: ReferencePageRequest = {}) {
    return this.operationalReference("providers", providerReferencePageSchema, request);
  }

  listWarehouses(request: ReferencePageRequest = {}) {
    return this.operationalReference("warehouses", warehouseReferencePageSchema, request);
  }

  searchBudgetLines(request: ReferencePageRequest = {}) {
    return this.operationalReference("budget-lines", budgetLineReferencePageSchema, request);
  }

  searchAccountingAccounts(request: ReferencePageRequest = {}) {
    return this.operationalReference("accounting-accounts", accountingAccountReferencePageSchema, request);
  }

  private async operationalReference<S extends z.ZodObject>(path: string, schema: S, request: ReferencePageRequest): Promise<z.infer<S>> {
    if (!referencePageRequestSchema.strict().safeParse(request).success) throw new IndiceApiError("Invalid reference filters.");
    const response = await this.delegatedReferenceRequest(`/api/v1/ai/tools/references/${path}`, "POST", request);
    const result = schema.safeParse(await response.json());
    if (!result.success) throw new IndiceApiError("Indice returned an invalid reference response.");
    return result.data;
  }

  private async delegatedReferenceRequest(
    path: string,
    method: "GET" | "POST",
    request?: ReferencePageRequest
  ): Promise<Response> {
    const delegatedToken = this.requireDelegatedToken();
    const normalized = request === undefined ? undefined : referencePageRequestSchema.safeParse(request);
    if (normalized && !normalized.success) {
      throw new IndiceApiError(normalized.error.issues[0]?.message ?? "Invalid reference filters.");
    }
    const response = await this.request(path, {
      method,
      headers: {
        Authorization: `Bearer ${delegatedToken}`,
        ...(method === "POST" ? { "Content-Type": "application/json" } : {})
      },
      ...(method === "POST" ? { body: JSON.stringify(normalized?.data ?? {}) } : {})
    });
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow this reference tool."
        : "Indice could not load the requested references.");
    }
    return response;
  }

  private async getDelegatedBusinessSnapshot(query: BusinessSnapshotQuery): Promise<BusinessSnapshot> {
    if (!this.delegatedAccessToken) {
      throw new IndiceApiError("Indice delegated authorization is required.", 401);
    }
    const response = await this.request(
      businessSnapshotPath("/api/v1/ai/tools/business/snapshot", query),
      {
        method: "GET",
        headers: { Authorization: `Bearer ${this.delegatedAccessToken}` }
      }
    );
    return this.parseBusinessSnapshot(response);
  }

  private async parseBusinessSnapshot(response: Response): Promise<BusinessSnapshot> {
    if (!response.ok) {
      throw await this.apiError(response, response.status === 403
        ? "Your current Indice permissions do not allow the business snapshot tool."
        : "Indice could not load the business snapshot.");
    }
    const payload: unknown = await response.json();
    const parsed = businessSnapshotSchema.safeParse(payload);
    if (!parsed.success) {
      throw new IndiceApiError("Indice returned an invalid business snapshot contract.");
    }
    return parsed.data;
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authenticated) {
      return;
    }

    if (!this.authenticationPromise) {
      this.authenticationPromise = this.authenticate().finally(() => {
        this.authenticationPromise = undefined;
      });
    }
    await this.authenticationPromise;
  }

  private async authenticate(): Promise<void> {
    this.cookies.clear();
    const csrfResponse = await this.request("/api/v1/auth/csrf", { method: "GET" });
    if (!csrfResponse.ok) {
      throw await this.apiError(csrfResponse, "Unable to initialize the Indice session.");
    }
    const csrfPayload = await csrfResponse.json() as { csrfToken?: unknown };
    if (typeof csrfPayload.csrfToken !== "string" || !csrfPayload.csrfToken) {
      throw new IndiceApiError("Indice did not return a CSRF token.");
    }

    const loginResponse = await this.request("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfPayload.csrfToken
      },
      body: JSON.stringify({
        companyName: requiredSessionValue(this.config.companyName, "company name"),
        email: requiredSessionValue(this.config.email, "email"),
        password: requiredSessionValue(this.config.password, "password")
      })
    });
    if (!loginResponse.ok) {
      throw await this.apiError(loginResponse, "Indice authentication failed.");
    }
    this.authenticated = true;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const headers = new Headers(init.headers);
    const cookie = this.cookieHeader();
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    let response: Response;
    try {
      response = await backendRequest(this.config, this.fetchImplementation, path, { ...init, headers }, this.requestContext);
    } catch (error) {
      const message = error instanceof Error && error.name === "TimeoutError"
        ? "Indice did not respond before the timeout."
        : "Indice is temporarily unavailable. No operation has been confirmed.";
      throw new IndiceApiError(message);
    }
    this.captureCookies(response.headers);
    return response;
  }

  private captureCookies(headers: Headers): void {
    const values = typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie") ? [headers.get("set-cookie") as string] : [];
    for (const value of values) {
      const pair = value.split(";", 1)[0];
      const separator = pair?.indexOf("=") ?? -1;
      if (!pair || separator <= 0) {
        continue;
      }
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  private async apiError(response: Response, fallback: string): Promise<IndiceApiError> {
    return new IndiceApiError(fallback, response.status, response.status === 401
      ? bearerChallenge(this.config.oauthResourceMetadataUrl, "invalid_token") : undefined);
  }
}

function normalizeCurrency(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new IndiceApiError("preferred_currency must use a three-letter ISO code.");
  }
  return normalized;
}

function normalizeBusinessSnapshotQuery(
  query: BusinessSnapshotQuery,
  defaultCurrency: string
): BusinessSnapshotQuery {
  const candidate = {
    ...query,
    preferredCurrency: normalizeCurrency(query.preferredCurrency ?? defaultCurrency)
  };
  const parsed = businessSnapshotQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    throw new IndiceApiError(parsed.error.issues[0]?.message ?? "Invalid business snapshot filters.");
  }
  return parsed.data;
}

function businessSnapshotPath(path: string, query: BusinessSnapshotQuery): string {
  const params = new URLSearchParams();
  if (query.period) params.set("period", query.period);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.preferredCurrency) params.set("preferredCurrency", query.preferredCurrency);
  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function requiredSessionValue(value: string | undefined, field: string): string {
  if (!value) {
    throw new IndiceApiError(`Indice session ${field} is required.`);
  }
  return value;
}
