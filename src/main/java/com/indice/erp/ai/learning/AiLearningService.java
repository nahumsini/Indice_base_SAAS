package com.indice.erp.ai.learning;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.access.AiToolCapabilityService;
import static com.indice.erp.ai.learning.AiLearningContracts.*;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.NoSuchElementException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class AiLearningService {
    private final Catalog catalog;
    private final AiToolAuthorizationService authorization;
    private final AiToolCapabilityService capabilities;
    private final com.indice.erp.hr.HrAccessService hr;

    public AiLearningService(ObjectMapper mapper, AiToolAuthorizationService authorization, AiToolCapabilityService capabilities,
            com.indice.erp.hr.HrAccessService hr) throws IOException {
        this.authorization = authorization; this.capabilities = capabilities;
        this.hr = hr;
        try (var input = new ClassPathResource("ai/learning-catalog-v1.json").getInputStream()) {
            catalog = mapper.readValue(input, Catalog.class);
        }
    }

    public Guide guide(StoredToken token, Request request) {
        var args = request == null ? new Request(null, null, null) : request;
        var locale = args.locale() == null ? "es-MX" : args.locale();
        if (!Set.of("es-MX", "en-CA").contains(locale) || args.tab() != null && args.module() == null)
            throw new IllegalArgumentException("Choose a supported locale and a module when selecting a tab.");
        var allowedTools = capabilities.allowedTools(token);
        var modules = catalog.modules().stream().filter(module -> locale.equals(module.locale()))
            .filter(module -> args.module() == null || args.module().equals(module.module()))
            .map(module -> {
                var tabs = module.tabs().stream().filter(tab -> args.tab() == null || args.tab().equals(tab.tab()))
                    .filter(tab -> authorization.canReadGuideTab(token.user(), module.module(), tab.tab())
                        && (!"human_resources".equals(module.module()) || hr.canAccessReadableTab(token.user(), com.indice.erp.hr.HrAccessService.HrTab.valueOf(tab.tab().toUpperCase(java.util.Locale.ROOT)))))
                    .map(tab -> new TabGuide(tab.tab(), tab.label(), tab.title(), tab.purpose(), tab.effect(), tab.steps(),
                        "en-CA".equals(locale) ? "Open " + module.pageId() + ", select " + tab.label() + " and enable Learning mode."
                            : "Abre " + module.pageId() + ", selecciona " + tab.label() + " y activa Modo aprendiz.",
                        toolsFor(module.module(), tab.tab(), allowedTools, token))).toList();
                return new ModuleGuide(module.module(), module.pageId(), module.purpose(), tabs);
            }).filter(module -> !module.tabs().isEmpty()).toList();
        if (args.module() != null && modules.isEmpty()) throw new NoSuchElementException("No reviewed guide available in the current authorized scope.");
        if (modules.isEmpty()) throw new SecurityException("An active, authorized module is required to use its training guide.");
        var logic = "en-CA".equals(locale)
            ? "Business structure defines units and businesses. People receive roles, schedules and responsibilities. Processes generate work; projects group tasks. Products and financial operations feed owner-calculated indicators. A guide explains the interface; availableTools lists only actions this connection can currently use. Completing a guide does not execute work or certify a result."
            : "La estructura define unidades y negocios. Las personas reciben roles, horarios y responsabilidades. Los procesos generan trabajo; los proyectos agrupan tareas. Productos y operaciones financieras alimentan indicadores calculados por sus módulos. La guía explica la interfaz; availableTools indica solamente las acciones que esta conexión puede usar ahora. Leer una guía no ejecuta trabajo ni certifica un resultado.";
        return new Guide(catalog.version(), locale, logic, modules);
    }

    private List<String> toolsFor(String module, String tab, List<String> permitted, StoredToken token) {
        var fileTools=fileToolsFor(module,tab,permitted,token);
        var allowed=permitted.stream().filter(t->!fileTools.contains(t)).toList();
        var domainTools=domainToolsFor(module,tab,allowed);
        return java.util.stream.Stream.concat(domainTools.stream(),fileTools.stream()).distinct().toList();
    }
    private List<String> fileToolsFor(String module,String tab,List<String> allowed,StoredToken token) {
        var access=new com.indice.erp.ai.files.AiFileAccess(new com.indice.erp.ai.hr.AiHrAccess(authorization,hr),authorization);
        var purposes=new java.util.HashSet<com.indice.erp.ai.files.AiFileContracts.Purpose>();
        if(module.equals("inventory")&&tab.equals("products"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.inventory_product_image);
        if(module.equals("inventory")&&tab.equals("purchase-orders"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.supplier_invoice_attachment);
        if(module.equals("crm")&&tab.equals("sales"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.sale_payment_evidence);
        if(module.equals("crm")&&tab.equals("contracts"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.sales_contract_attachment);
        if(module.equals("pos")&&tab.equals("sale"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.pos_receipt_attachment);
        if(module.equals("processes")&&tab.equals("calendar"))purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.task_evidence);
        if(module.equals("human_resources"))switch(tab) {
            case "collaborators"->purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.employee_document);
            case "assets"->purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.asset_photo);
            case "records"->purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.hr_record_attachment);
            case "announcements"->purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.announcement_attachment);
            case "permissions"->{purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.my_hr_permission_attachment);purposes.add(com.indice.erp.ai.files.AiFileContracts.Purpose.hr_permission_attachment);}
            default->{ }
        }
        return allowed.stream().filter(tool->{
            var action=tool.startsWith("preview_")?tool.substring(8):tool;
            if(tool.equals("export_commerce_report"))return commerceReportsFor(module,tab).stream().anyMatch(r->com.indice.erp.ai.files.AiCommerceReportService.allowed(token,r,authorization));
            if(tool.equals("export_hr_payroll"))return module.equals("human_resources")&&tab.equals("payroll");
            if(Set.of("stage_operational_file","stage_chatgpt_file").contains(tool))return purposes.stream().anyMatch(p->access.allowed(token,p,true));
            if(Set.of("list_operational_files","get_operational_file").contains(tool))return purposes.stream().anyMatch(p->access.allowed(token,p,false));
            return purposes.contains(com.indice.erp.ai.files.AiFileAccess.ACTIONS.get(action));
        }).toList();
    }
    private static List<com.indice.erp.ai.files.AiCommerceReportContracts.Report> commerceReportsFor(String module,String tab){
        var reports=com.indice.erp.ai.files.AiCommerceReportContracts.Report.class;
        var names=switch(module+"."+tab){case "inventory.products"->List.of("inventory_products");case "inventory.inventory"->List.of("inventory_balances","inventory_movements");case "inventory.purchase-orders"->List.of("purchase_orders","supplier_invoices");case "crm.sales"->List.of("commercial_sales");case "crm.commissions"->List.of("commission_cuts");case "pos.sale"->List.of("pos_tickets");case "pos.cortes"->List.of("pos_closings","pos_settlements");default->List.<String>of();};
        return names.stream().map(n->Enum.valueOf(reports,n)).toList();
    }
    private boolean salesDomain(String tool,String kind) {var action=tool.startsWith("preview_")?tool.substring(8):tool;return (com.indice.erp.sales.SalesWorkflowService.READS.contains(action)||com.indice.erp.sales.SalesWorkflowService.ACTIONS.contains(action))&&com.indice.erp.sales.SalesWorkflowService.kind(action).equals(kind);}
    private boolean posDomain(String tool) {var action=tool.startsWith("preview_")?tool.substring(8):tool;return com.indice.erp.pos.assistant.PosTerminalReadService.READS.contains(action)||com.indice.erp.pos.assistant.PosTerminalPreparation.ACTIONS.contains(action)||com.indice.erp.pos.assistant.PosAssistantService.READS.contains(action)||com.indice.erp.pos.assistant.PosAssistantService.ACTIONS.contains(action)||com.indice.erp.pos.assistant.PosOperationsService.READS.contains(action)||com.indice.erp.pos.assistant.PosOperationsService.ACTIONS.contains(action);}
    private List<String> domainToolsFor(String module, String tab, List<String> allowed) {
        if("inventory".equals(module)) return allowed.stream().filter(tool->{
            var action=tool.startsWith("preview_")?tool.substring(8):tool;
            return switch(tab) {
                case "products"->action.endsWith("_product")||tool.equals("list_inventory_products")||Set.of("search_products","get_product_detail").contains(tool);
                case "warehouses"->action.endsWith("_warehouse")||Set.of("list_inventory_warehouses","list_warehouses").contains(tool);
                case "inventory"->Set.of("list_inventory_balances","get_inventory_balance","list_inventory_movements","get_inventory_movement","get_inventory_metrics","get_inventory_summary").contains(tool)
                    ||Set.of("configure_inventory_stock","receive_inventory_stock","issue_inventory_stock","transfer_inventory_stock","count_inventory_stock","cancel_inventory_movement").contains(action);
                case "discounts"->action.contains("inventory_discount");
                case "providers"->action.contains("inventory_provider")||tool.equals("search_providers")||action.contains("supplier_submission")||action.contains("product_supplier");
                case "purchase-orders"->action.contains("purchase_order")||action.contains("supplier_invoice");
                default->false;
            };
        }).toList();
        if("crm".equals(module)) return allowed.stream().filter(tool->switch(tab) {
            case "contacts"->tool.contains("customer")||tool.equals("search_commercial_assignees");
            case "leads"->tool.contains("opportunity")||tool.contains("opportunities")||tool.equals("search_commercial_assignees");
            case "quotes"->tool.contains("quote")||Set.of("search_customers","search_products","search_commercial_assignees").contains(tool);
            case "sales"->Set.of("list_sales","get_sale_detail","list_warehouses","list_payment_accounts","get_product_detail").contains(tool)||salesDomain(tool,"sale")||salesDomain(tool,"followUp");
            case "contracts"->salesDomain(tool,"contract");
            case "commissions"->salesDomain(tool,"rule")||tool.contains("sales_commission_cut")||tool.contains("sales_commission_schedule");
            case "kpis"->Set.of("get_sales_today","get_sales_summary","get_opportunity_pipeline").contains(tool);
            case "payment-accounts"->tool.equals("list_payment_accounts");
            default->false;
        }).toList();
        if("pos".equals(module)) return allowed.stream().filter(tool->switch(tab) {
            case "sale"->Set.of("list_sales","get_sale_detail","search_products","get_product_detail").contains(tool)||posDomain(tool)&&!tool.contains("register")&&!tool.contains("closing")&&!tool.contains("return");
            case "cajas"->tool.equals("get_cash_status")||posDomain(tool)&&(tool.contains("register")||tool.contains("shift"));
            case "cortes"->tool.equals("get_cash_status")||posDomain(tool)&&(tool.contains("closing")||tool.contains("return")||tool.contains("shift"));
            case "clientes"->Set.of("search_customers","get_customer_detail").contains(tool);
            case "kpis"->Set.of("get_sales_summary","get_sales_today","get_cash_status").contains(tool);
            default->false;
        }).toList();
        if ("processes".equals(module)) return allowed.stream().filter(tool -> {
            var action=tool.startsWith("preview_")?tool.substring(8):tool;
            return switch(tab){
                case "kpis" -> Set.of("get_process_task_kpis","list_tasks","get_task_detail").contains(tool);
                case "projects" -> tool.contains("project") || Set.of("list_tasks","get_task_detail","preview_update_task","update_task").contains(tool);
                case "processes" -> com.indice.erp.processTasks.assistant.ProcessAssistantService.READS.contains(tool)
                    && !tool.contains("project") || com.indice.erp.processTasks.assistant.ProcessAssistantService.ACTIONS.contains(action)
                    && !action.endsWith("_project");
                default -> tool.contains("task") && !com.indice.erp.processTasks.assistant.ProcessAssistantService.ACTIONS.contains(action);
            };
        }).toList();
        return allowed.stream().filter(tool -> switch (tab) {
            case "collaborators" -> Set.of("search_employees", "get_employee_overview", "get_employee_file", "list_hr_organization", "preview_create_employee", "create_employee", "preview_update_employee", "update_employee", "preview_import_employees", "import_employees", "preview_inactivate_employee", "inactivate_employee", "preview_terminate_employee", "terminate_employee").contains(tool);
            case "incentives" -> Set.of("list_hr_incentives","get_hr_incentive","preview_create_hr_incentive","create_hr_incentive","preview_cancel_hr_incentive","cancel_hr_incentive").contains(tool);
            case "permissions" -> Set.of("list_my_hr_permissions","get_my_hr_permission","list_hr_permissions","get_hr_permission","preview_create_my_hr_permission","create_my_hr_permission","preview_withdraw_my_hr_permission","withdraw_my_hr_permission","preview_approve_hr_permission","approve_hr_permission","preview_reject_hr_permission","reject_hr_permission").contains(tool);
            case "kpis" -> tool.equals("get_hr_kpis");
            case "payroll" -> com.indice.erp.hr.assistant.HrAssistantPayrollService.READS.contains(tool)||com.indice.erp.hr.assistant.HrAssistantPayrollService.ACTIONS.contains(tool.startsWith("preview_")?tool.substring(8):tool);
            case "attendance" -> Set.of("get_attendance_exceptions","get_my_attendance_calendar","get_my_attendance_events").contains(tool);
            case "control" -> com.indice.erp.hr.assistant.HrAssistantAttendanceService.READS.contains(tool) && !tool.startsWith("get_my_attendance_")
                || com.indice.erp.hr.assistant.HrAssistantAttendanceService.ACTIONS.contains(tool)
                || tool.startsWith("preview_") && com.indice.erp.hr.assistant.HrAssistantAttendanceService.ACTIONS.contains(tool.substring(8));
            case "records" -> Set.of("list_hr_records", "get_hr_record_detail", "preview_create_hr_record", "create_hr_record", "preview_update_hr_record", "update_hr_record").contains(tool);
            case "assets" -> Set.of("get_hr_asset_history", "list_hr_assets", "get_hr_asset_detail", "preview_create_hr_asset", "create_hr_asset", "preview_update_hr_asset", "update_hr_asset", "preview_reassign_hr_asset", "reassign_hr_asset", "preview_change_hr_asset_status", "change_hr_asset_status").contains(tool);
            case "announcements" -> Set.of("get_announcement_receipts", "list_announcement_audience", "list_announcements", "get_announcement_detail", "preview_create_announcement", "create_announcement", "preview_update_announcement", "update_announcement", "preview_mark_announcement_read", "mark_announcement_read", "preview_mark_announcement_unread", "mark_announcement_unread").contains(tool);
            default -> false;
        }).toList();
    }
}
