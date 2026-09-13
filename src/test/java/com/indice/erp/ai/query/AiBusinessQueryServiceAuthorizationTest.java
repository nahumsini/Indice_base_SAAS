package com.indice.erp.ai.query;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivableAccountResponse;
import com.indice.erp.finance.receivables.ReceivablesDtos.ReceivablesWorkspaceResponse;
import com.indice.erp.finance.receivables.ReceivablesService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.pos.PosAccessService;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.shift.ShiftService;
import com.indice.erp.pos.ticket.TicketService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import com.indice.erp.sales.SalesService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiBusinessQueryServiceAuthorizationTest {

    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "user");

    @Mock private AiToolAuthorizationService authorizationService;
    @Mock private HrAccessService hrAccessService;
    @Mock private HrUserService hrUserService;
    @Mock private HrAttendanceService attendanceService;
    @Mock private ProcessTasksService tasksService;
    @Mock private SalesService salesService;
    @Mock private FinanceAccessService financeAccessService;
    @Mock private ExpenseService expenseService;
    @Mock private PettyCashService pettyCashService;
    @Mock private ReceivablesService receivablesService;
    @Mock private PosAccessService posAccessService;
    @Mock private TicketService ticketService;
    @Mock private CashRegisterService cashRegisterService;
    @Mock private ShiftService shiftService;

    private AiBusinessQueryService service;

    @BeforeEach
    void setUp() {
        service = new AiBusinessQueryService(
            authorizationService,
            hrAccessService,
            hrUserService,
            attendanceService,
            tasksService,
            salesService,
            financeAccessService,
            expenseService,
            pettyCashService,
            receivablesService,
            posAccessService,
            ticketService,
            cashRegisterService,
            shiftService,
            new ObjectMapper(),
            Clock.systemUTC()
        );
    }

    @Test
    void salesScopeCannotBypassCurrentCommercialOrPosPermissions() {
        assertThrows(SecurityException.class, () -> service.execute(USER, "list_sales", Map.of()));

        verify(authorizationService).canReadCommercialSales(USER);
        verify(authorizationService).canReadPosSales(USER);
        verifyNoInteractions(salesService, ticketService);
    }

    @Test
    void inventoryScopeCannotBypassTheCurrentInventoryPermission() {
        assertThrows(SecurityException.class, () -> service.execute(USER, "get_inventory_summary", Map.of()));

        verify(authorizationService).canReadInventory(USER);
        verifyNoInteractions(salesService);
    }

    @Test
    void commercialProductAccessDoesNotExposeInventoryBalances() {
        when(authorizationService.canReadProductCatalog(USER)).thenReturn(true);
        when(salesService.get(23L, "products", 7L)).thenReturn(Map.of("id", 7L, "name", "Widget"));

        service.execute(USER, "get_product_detail", Map.of("productId", 7L));

        verify(authorizationService).canReadInventory(USER);
        verify(salesService, never()).list(23L, "inventory-balances", Map.of());
    }

    @Test
    void expensesScopeCannotBypassTheCurrentExpensesPermission() {
        assertThrows(SecurityException.class, () -> service.execute(USER, "list_expenses", Map.of()));

        verify(authorizationService).canReadExpenses(USER);
        verifyNoInteractions(financeAccessService, expenseService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void receivablesSummaryCoversEveryMatchEvenWhenTheReturnedListIsLimited() {
        var today = LocalDate.now(Clock.systemUTC());
        var context = new FinanceContext(41L, 23L, "Reader", "user", true, FinanceScope.corporateOffice());
        var overdue = receivable(1L, "Customer one", new BigDecimal("80.00"), today.minusDays(1));
        var pending = receivable(2L, "Customer two", new BigDecimal("20.00"), today.plusDays(1));
        var workspace = new ReceivablesWorkspaceResponse(
            List.of(), List.of(overdue, pending), List.of(), List.of(), List.of(), List.of(), 2
        );
        when(authorizationService.canReadReceivables(USER)).thenReturn(true);
        when(financeAccessService.resolveContext(USER)).thenReturn(Optional.of(context));
        when(receivablesService.workspace(context)).thenReturn(workspace);

        var response = service.execute(USER, "get_receivables_status", Map.of("limit", 1));
        var summary = (Map<String, Object>) response.get("summary");

        assertEquals(1, response.get("count"));
        assertEquals(2, summary.get("accountCount"));
        assertEquals(1, summary.get("returnedCount"));
        assertEquals(1L, summary.get("overdueCount"));
        assertEquals(new BigDecimal("100.00"), ((Map<String, BigDecimal>) summary.get("balanceByCurrency")).get("MXN"));
    }

    private ReceivableAccountResponse receivable(Long id, String customer, BigDecimal balance, LocalDate dueDate) {
        return new ReceivableAccountResponse(
            id, 23L, null, null, null, null, null, null,
            "SALE-" + id, "CUSTOMER-" + id, customer, null, null,
            balance, balance, BigDecimal.ZERO, balance, "MXN", dueDate, dueDate,
            balance, 1, BigDecimal.ZERO, "pending"
        );
    }
}
