package com.indice.erp.ai.query;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.indice.erp.ai.access.AiAccessTokenService;
import org.junit.jupiter.api.Test;

class AiToolQueryApiControllerTest {

    @Test
    void keepsReadScopesSeparatedByBusinessDomain() {
        assertEquals(AiAccessTokenService.HR_PEOPLE_READ,
            AiToolQueryApiController.requiredScope("search_employees"));
        assertEquals(AiAccessTokenService.TASKS_READ,
            AiToolQueryApiController.requiredScope("get_task_detail"));
        assertEquals(AiAccessTokenService.SALES_READ,
            AiToolQueryApiController.requiredScope("list_sales"));
        assertEquals(AiAccessTokenService.POS_READ,
            AiToolQueryApiController.requiredScope("get_cash_status"));
        assertEquals(AiAccessTokenService.INVENTORY_READ,
            AiToolQueryApiController.requiredScope("get_inventory_summary"));
        assertEquals(AiAccessTokenService.EXPENSES_READ,
            AiToolQueryApiController.requiredScope("list_expenses"));
        assertEquals(AiAccessTokenService.PETTY_CASH_READ,
            AiToolQueryApiController.requiredScope("get_funds_status"));
        assertEquals(AiAccessTokenService.RECEIVABLES_READ,
            AiToolQueryApiController.requiredScope("get_receivables_status"));
    }
}
