package com.indice.erp.ai.files;

import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.hr.AiHrAccess;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.files.AiFileContracts.*;

@Service
public class AiFileAccess {
    public static final Map<String,Purpose> ACTIONS=Map.ofEntries(
        Map.entry("attach_employee_document",Purpose.employee_document),Map.entry("attach_announcement_file",Purpose.announcement_attachment),
        Map.entry("add_hr_asset_photo",Purpose.asset_photo),Map.entry("attach_hr_record_file",Purpose.hr_record_attachment),
        Map.entry("attach_my_hr_permission_file",Purpose.my_hr_permission_attachment),Map.entry("attach_hr_permission_file",Purpose.hr_permission_attachment),
        Map.entry("attach_task_evidence",Purpose.task_evidence),Map.entry("attach_inventory_product_image",Purpose.inventory_product_image),
        Map.entry("attach_sale_payment_evidence",Purpose.sale_payment_evidence),Map.entry("attach_sales_contract_file",Purpose.sales_contract_attachment),
        Map.entry("attach_supplier_invoice_file",Purpose.supplier_invoice_attachment),Map.entry("attach_pos_receipt_file",Purpose.pos_receipt_attachment),Map.entry("attach_expense_file",Purpose.expense_attachment),Map.entry("attach_budget_line_file",Purpose.budget_line_attachment),Map.entry("attach_petty_cash_receipt_file",Purpose.petty_cash_receipt_attachment));
    public static final Set<String> READS=Set.of("list_operational_files","get_operational_file","export_hr_payroll");
    private final AiHrAccess hr;private final AiToolAuthorizationService authorization;
    public AiFileAccess(AiHrAccess hr,AiToolAuthorizationService authorization){this.hr=hr;this.authorization=authorization;}
    public boolean allowed(StoredToken token,Purpose purpose,boolean write) {
        if(purpose==null||!token.scopes().contains(write?"files.attach":"files.read"))return false;
        if(Set.of(Purpose.expense_attachment,Purpose.budget_line_attachment,Purpose.petty_cash_receipt_attachment).contains(purpose)){String tool=switch(purpose){case expense_attachment->write?"remove_expense_attachment":"get_finance_expense";case budget_line_attachment->write?"remove_budget_line_attachment":"get_finance_budget_line";default->write?"remove_petty_cash_receipt_attachment":"get_petty_cash_receipt";};return token.scopes().contains(com.indice.erp.finance.assistant.FinanceAssistantTools.require(tool).scope())&&authorization.canUseFinanceWorkflowTool(token.user(),tool);}
        if(AiCommerceFileOwnerService.supports(purpose))return commerceAllowed(token,purpose,write);
        if(purpose==Purpose.task_evidence)return token.scopes().contains(write?"tasks.operate":"tasks.read")
            &&(write?authorization.canCreateTask(token.user()):authorization.canReadTasks(token.user()));
        String tool=switch(purpose) {
            case employee_document->write?"update_employee":"get_employee_file";
            case announcement_attachment->write?"update_announcement":"get_announcement_detail";
            case asset_photo->write?"update_hr_asset":"get_hr_asset_detail";
            case hr_record_attachment->write?"update_hr_record":"get_hr_record_detail";
            case my_hr_permission_attachment->write?"create_my_hr_permission":"get_my_hr_permission";
            case hr_permission_attachment->write?"approve_hr_permission":"get_hr_permission";
            default->throw new IllegalArgumentException("Unsupported purpose.");
        };
        return hr.allowed(token,tool);
    }
    public void require(StoredToken token,Purpose purpose,boolean write) {
        if(!allowed(token,purpose,write))throw new SecurityException("Current file consent and domain permissions required.");
    }
    public boolean exportAllowed(StoredToken token) { return token.scopes().contains("files.read")&&hr.allowed(token,"get_hr_payroll_run"); }
    public boolean any(StoredToken token,boolean write) { return Arrays.stream(Purpose.values()).anyMatch(p->allowed(token,p,write)); }
    private boolean commerceAllowed(StoredToken token,Purpose purpose,boolean write) {
        String scope=switch(purpose){case inventory_product_image->write?"inventory.products.manage":"inventory.read";
            case sale_payment_evidence->write?"sales.collections.confirm":"sales.read";case sales_contract_attachment->write?"sales.contracts.manage":"sales.read";
            case supplier_invoice_attachment->write?"inventory.invoices.manage":"inventory.read";case pos_receipt_attachment->write?"pos.inventory.receive":"pos.read";default->throw new IllegalArgumentException("Unsupported file purpose.");};
        if(!token.scopes().contains(scope))return false;
        return switch(purpose){case inventory_product_image->authorization.canUseInventoryTool(token.user(),write?"update_inventory_product":"get_inventory_product");
            case sale_payment_evidence->authorization.canUseSalesWorkflowTool(token.user(),write?"confirm_sale_collection":"get_commercial_sale");
            case sales_contract_attachment->authorization.canUseSalesWorkflowTool(token.user(),write?"update_sales_contract":"get_sales_contract");
            case supplier_invoice_attachment->authorization.canUseProcurementTool(token.user(),write?"review_supplier_invoice":"get_supplier_invoice");
            case pos_receipt_attachment->authorization.canUsePosWorkflowTool(token.user(),write?"receive_pos_inventory":"list_pos_inventory_receipts");default->false;};
    }
}
