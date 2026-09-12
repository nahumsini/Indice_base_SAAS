package com.indice.erp.ai.query;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.finance.receivables.ReceivablesService;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Set;
import java.util.function.Predicate;
import org.springframework.stereotype.Service;

@Service
public class AiBusinessQueryService {

    public static final Set<String> TOOLS = Set.of(
        "search_employees", "get_employee_overview", "get_attendance_exceptions",
        "list_tasks", "get_task_detail", "get_sales_summary", "list_sales",
        "get_sale_detail", "get_cash_status", "search_products", "get_product_detail",
        "get_inventory_summary", "get_expense_summary", "list_expenses",
        "get_expense_detail", "get_funds_status", "get_receivables_status"
    );

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() { };

    private final AiToolAuthorizationService authorizationService;
    private final HrAccessService hrAccessService;
    private final HrUserService hrUserService;
    private final HrAttendanceService attendanceService;
    private final ProcessTasksService tasksService;
    private final SalesService salesService;
    private final FinanceAccessService financeAccessService;
    private final ExpenseService expenseService;
    private final PettyCashService pettyCashService;
    private final ReceivablesService receivablesService;
    private final PosAccessService posAccessService;
    private final TicketService ticketService;
    private final CashRegisterService cashRegisterService;
    private final ShiftService shiftService;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public AiBusinessQueryService(
        AiToolAuthorizationService authorizationService,
        HrAccessService hrAccessService,
        HrUserService hrUserService,
        HrAttendanceService attendanceService,
        ProcessTasksService tasksService,
        SalesService salesService,
        FinanceAccessService financeAccessService,
        ExpenseService expenseService,
        PettyCashService pettyCashService,
        ReceivablesService receivablesService,
        PosAccessService posAccessService,
        TicketService ticketService,
        CashRegisterService cashRegisterService,
        ShiftService shiftService,
        ObjectMapper objectMapper,
        Clock clock
    ) {
        this.authorizationService = authorizationService;
        this.hrAccessService = hrAccessService;
        this.hrUserService = hrUserService;
        this.attendanceService = attendanceService;
        this.tasksService = tasksService;
        this.salesService = salesService;
        this.financeAccessService = financeAccessService;
        this.expenseService = expenseService;
        this.pettyCashService = pettyCashService;
        this.receivablesService = receivablesService;
        this.posAccessService = posAccessService;
        this.ticketService = ticketService;
        this.cashRegisterService = cashRegisterService;
        this.shiftService = shiftService;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    public Map<String, Object> execute(AuthSessionUser user, String tool, Map<String, Object> rawArgs) {
        if (!TOOLS.contains(tool)) {
            throw new IllegalArgumentException("Unknown business query tool.");
        }
        var args = rawArgs == null ? Map.<String, Object>of() : rawArgs;
        return switch (tool) {
            case "search_employees" -> searchEmployees(user, args);
            case "get_employee_overview" -> employeeOverview(user, args);
            case "get_attendance_exceptions" -> attendanceExceptions(user, args);
            case "list_tasks" -> listTasks(user, args);
            case "get_task_detail" -> taskDetail(user, args);
            case "get_sales_summary" -> salesSummary(user, args);
            case "list_sales" -> listSales(user, args);
            case "get_sale_detail" -> saleDetail(user, args);
            case "get_cash_status" -> cashStatus(user, args);
            case "search_products" -> searchProducts(user, args);
            case "get_product_detail" -> productDetail(user, args);
            case "get_inventory_summary" -> inventorySummary(user, args);
            case "get_expense_summary" -> expenseSummary(user, args);
            case "list_expenses" -> listExpenses(user, args);
            case "get_expense_detail" -> expenseDetail(user, args);
            case "get_funds_status" -> fundsStatus(user, args);
            case "get_receivables_status" -> receivablesStatus(user, args);
            default -> throw new IllegalArgumentException("Unknown business query tool.");
        };
    }

    private Map<String, Object> searchEmployees(AuthSessionUser user, Map<String, Object> args) {
        requireHr(user, HrTab.COLLABORATORS);
        var query = text(args, "query");
        var status = text(args, "status");
        var department = text(args, "department");
        var rows = rows(hrUserService.listUsers(user), "rows").stream()
            .filter(row -> matches(row, query, "full_name", "user_code", "email", "position", "department"))
            .filter(row -> equalsFilter(row.get("status"), status))
            .filter(row -> equalsFilter(row.get("department"), department))
            .map(this::safeEmployee)
            .limit(limit(args))
            .toList();
        return result("search_employees", "Alcance autorizado de Recursos Humanos", Map.of("matches", rows.size()), rows, null);
    }

    private Map<String, Object> employeeOverview(AuthSessionUser user, Map<String, Object> args) {
        requireHr(user, HrTab.COLLABORATORS);
        var employeeId = requiredLong(args, "employeeId");
        var employee = rows(hrUserService.listUsers(user), "rows").stream()
            .filter(row -> longValue(row.get("user_company_id")) == employeeId || longValue(row.get("id")) == employeeId)
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Employee not found in the authorized scope."));
        var userCompanyId = longValue(employee.get("user_company_id"));
        if (userCompanyId <= 0) userCompanyId = employeeId;
        final long visibleEmployeeId = userCompanyId;

        var taskItems = authorizationService.canReadTasks(user)
            ? rows(tasksService.listTasks(user.companyId(), user.userId()), "items").stream()
                .filter(row -> longValue(row.get("assignedUserCompanyId")) == visibleEmployeeId
                    || longValue(row.get("assigned_user_company_id")) == visibleEmployeeId
                    || collectionContains(row.get("assigneeUserCompanyIds"), visibleEmployeeId))
                .map(this::safeTask)
                .limit(limit(args))
                .toList()
            : List.<Map<String, Object>>of();

        Object attendance = null;
        if (hrAccessService.canAccessReadableTab(user, HrTab.ATTENDANCE)) {
            attendance = redact(attendanceService.userCalendar(user, visibleEmployeeId, month(args)));
        }
        var detail = new LinkedHashMap<String, Object>();
        detail.put("employee", safeEmployee(employee));
        detail.put("tasks", taskItems);
        detail.put("attendance", attendance);
        return result("get_employee_overview", "Empleado visible para el usuario conectado",
            Map.of("taskCount", taskItems.size()), List.of(), detail);
    }

    private Map<String, Object> attendanceExceptions(AuthSessionUser user, Map<String, Object> args) {
        requireHr(user, HrTab.ATTENDANCE);
        var date = date(args, "date", LocalDate.now(clock));
        var dashboard = castMap(redact(attendanceService.listDashboard(user, date)));
        var candidates = firstRows(dashboard, "items", "rows", "users", "records");
        var exceptions = candidates.stream()
            .filter(row -> {
                var status = normalized(Objects.toString(first(row, "status", "attendance_status", "attendanceStatus"), ""));
                return !Set.of("present", "ontime", "atiempo", "presente").contains(status);
            })
            .limit(limit(args))
            .toList();
        var summary = new LinkedHashMap<String, Object>();
        summary.put("date", date.toString());
        summary.put("exceptionCount", exceptions.size());
        return result("get_attendance_exceptions", "Asistencia autorizada", summary, exceptions, null);
    }

    private Map<String, Object> listTasks(AuthSessionUser user, Map<String, Object> args) {
        requireTasks(user);
        var status = text(args, "status");
        var priority = text(args, "priority");
        var query = text(args, "query");
        var employeeId = optionalLong(args, "employeeId");
        var overdueOnly = bool(args, "overdueOnly", false);
        var today = LocalDate.now(clock);
        var items = rows(tasksService.listTasks(user.companyId(), user.userId()), "items").stream()
            .filter(row -> equalsFilter(first(row, "status"), status))
            .filter(row -> equalsFilter(first(row, "priority"), priority))
            .filter(row -> matches(row, query, "title", "description", "folio", "assignedName"))
            .filter(row -> employeeId == null || longValue(first(row, "assignedUserCompanyId", "assigned_user_company_id")) == employeeId
                || collectionContains(row.get("assigneeUserCompanyIds"), employeeId))
            .filter(row -> !overdueOnly || isOverdue(row, today))
            .map(this::safeTask)
            .limit(limit(args))
            .toList();
        return result("list_tasks", "Tareas visibles para el usuario conectado", Map.of("matches", items.size()), items, null);
    }

    private Map<String, Object> taskDetail(AuthSessionUser user, Map<String, Object> args) {
        requireTasks(user);
        var taskId = requiredLong(args, "taskId");
        var visible = rows(tasksService.listTasks(user.companyId(), user.userId()), "items").stream()
            .anyMatch(row -> longValue(row.get("id")) == taskId);
        if (!visible) {
            throw new NoSuchElementException("Task not found in the authorized scope.");
        }
        var detail = new LinkedHashMap<String, Object>();
        detail.put("task", safeTask(tasksService.getTask(user.companyId(), taskId)));
        detail.put("followUps", redact(tasksService.listTaskFollowUps(user.companyId(), user.userId(), taskId)));
        detail.put("dependencies", redact(tasksService.listTaskDependencies(user.companyId(), user.userId(), taskId)));
        return result("get_task_detail", "Tarea visible para el usuario conectado", Map.of(), List.of(), detail);
    }

    private Map<String, Object> salesSummary(AuthSessionUser user, Map<String, Object> args) {
        var items = unifiedSales(user, args);
        var totals = totals(items, "currency", "total");
        var summary = new LinkedHashMap<String, Object>();
        summary.put("saleCount", items.size());
        summary.put("totalsByCurrency", totals);
        summary.put("from", optionalDate(args, "from"));
        summary.put("to", optionalDate(args, "to"));
        return result("get_sales_summary", "Ventas autorizadas", summary, List.of(), null);
    }

    private Map<String, Object> listSales(AuthSessionUser user, Map<String, Object> args) {
        var items = unifiedSales(user, args).stream().limit(limit(args)).toList();
        return result("list_sales", "Ventas autorizadas", Map.of("matches", items.size()), items, null);
    }

    private Map<String, Object> saleDetail(AuthSessionUser user, Map<String, Object> args) {
        var source = normalized(text(args, "source"));
        var saleId = requiredLong(args, "saleId");
        Object detail;
        if ("pos".equals(source)) {
            var context = requirePosSales(user);
            detail = redact(ticketService.get(context, saleId));
        } else {
            requireCommercialSales(user);
            detail = safeCommercialSale(salesService.get(user.companyId(), "sales", saleId));
        }
        return result("get_sale_detail", "Venta autorizada", Map.of("source", source.isBlank() ? "commercial" : source), List.of(), detail);
    }

    private Map<String, Object> cashStatus(AuthSessionUser user, Map<String, Object> args) {
        var context = requirePosCash(user);
        var detail = new LinkedHashMap<String, Object>();
        detail.put("registers", redact(cashRegisterService.list(context)));
        detail.put("shifts", redact(shiftService.list(context)));
        detail.put("currentOpenShift", redact(shiftService.currentOpenShift(context)));
        var shiftId = optionalLong(args, "shiftId");
        if (shiftId != null) {
            detail.put("closingSummary", redact(shiftService.closingSummary(context, shiftId)));
        }
        return result("get_cash_status", "Cajas y turnos autorizados", Map.of(), List.of(), detail);
    }

    private Map<String, Object> searchProducts(AuthSessionUser user, Map<String, Object> args) {
        requireProductCatalog(user);
        var filters = stringFilters(args, Map.of(
            "query", "search", "status", "status", "category", "category", "sku", "sku"
        ));
        var query = text(args, "query");
        var items = rows(salesService.list(user.companyId(), "products", filters), "items").stream()
            .filter(row -> matches(row, query, "name", "sku", "productCode", "description", "category"))
            .map(this::safeProduct)
            .limit(limit(args))
            .toList();
        return result("search_products", "Catálogo e inventario autorizados", Map.of("matches", items.size()), items, null);
    }

    private Map<String, Object> productDetail(AuthSessionUser user, Map<String, Object> args) {
        requireProductCatalog(user);
        var productId = requiredLong(args, "productId");
        var product = safeProduct(salesService.get(user.companyId(), "products", productId));
        var balances = authorizationService.canReadInventory(user)
            ? rows(salesService.list(user.companyId(), "inventory-balances", Map.of()), "items").stream()
                .filter(row -> longValue(first(row, "productId", "product_id")) == productId)
                .map(this::safeInventoryBalance)
                .peek(row -> row.put("currency", Objects.toString(product.get("currency"), "MXN")))
                .toList()
            : List.<Map<String, Object>>of();
        return result("get_product_detail", "Producto e inventario autorizados", Map.of("warehouseCount", balances.size()),
            List.of(), Map.of("product", product, "inventoryBalances", balances));
    }

    private Map<String, Object> inventorySummary(AuthSessionUser user, Map<String, Object> args) {
        requireInventory(user);
        var products = rows(salesService.list(user.companyId(), "products", Map.of()), "items").stream()
            .collect(java.util.stream.Collectors.toMap(
                row -> longValue(row.get("id")), this::safeProduct, (left, right) -> left, LinkedHashMap::new));
        var balances = rows(salesService.list(user.companyId(), "inventory-balances", Map.of()), "items").stream()
            .map(this::safeInventoryBalance)
            .peek(row -> {
                var product = products.get(longValue(row.get("productId")));
                if (product != null) {
                    row.put("productName", product.get("name")); row.put("productSku", product.get("sku"));
                    row.put("currency", Objects.toString(product.get("currency"), "MXN"));
                }
            }).toList();
        var lowStock = balances.stream().filter(row -> decimal(first(row, "available"))
            .compareTo(decimal(first(row, "minimum"))) <= 0).toList();
        var valueRows = new ArrayList<Map<String, Object>>();
        for (var balance : balances) {
            var item = new LinkedHashMap<String, Object>();
            item.put("currency", Objects.toString(first(balance, "currency"), "MXN"));
            item.put("amount", decimal(first(balance, "available")).multiply(decimal(first(balance, "unitCost"))));
            valueRows.add(item);
        }
        var summary = new LinkedHashMap<String, Object>();
        summary.put("balanceRows", balances.size());
        summary.put("lowStockCount", lowStock.size());
        summary.put("inventoryValueByCurrency", totals(valueRows, "currency", "amount"));
        return result("get_inventory_summary", "Inventario autorizado", summary,
            lowStock.stream().limit(limit(args)).toList(), null);
    }

    private Map<String, Object> expenseSummary(AuthSessionUser user, Map<String, Object> args) {
        var context = requireFinance(user, "expenses");
        var expenses = filteredExpenses(expenseService.list(context).expenses(), args);
        var rows = expenses.stream().map(this::safeExpense).toList();
        var summary = expenseTotals(expenses);
        return result("get_expense_summary", "Gastos autorizados", summary, List.of(), null);
    }

    private Map<String, Object> listExpenses(AuthSessionUser user, Map<String, Object> args) {
        var context = requireFinance(user, "expenses");
        var items = filteredExpenses(expenseService.list(context).expenses(), args).stream()
            .map(this::safeExpense)
            .limit(limit(args))
            .toList();
        return result("list_expenses", "Gastos autorizados", Map.of("matches", items.size()), items, null);
    }

    private Map<String, Object> expenseDetail(AuthSessionUser user, Map<String, Object> args) {
        var context = requireFinance(user, "expenses");
        var expenseId = requiredLong(args, "expenseId");
        var expense = expenseService.get(context, expenseId);
        var detail = new LinkedHashMap<String, Object>();
        detail.put("expense", safeExpense(expense));
        detail.put("payments", redact(expenseService.listPayments(context, expenseId)));
        return result("get_expense_detail", "Gasto autorizado", Map.of(), List.of(), detail);
    }

    private Map<String, Object> fundsStatus(AuthSessionUser user, Map<String, Object> args) {
        var context = requireFinance(user, "petty_cash");
        var workspace = pettyCashService.workspace(context);
        var fundId = optionalLong(args, "fundId");
        var funds = workspace.funds().stream()
            .filter(fund -> fundId == null || fund.id().equals(fundId))
            .map(fund -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", fund.id()); row.put("name", fund.name()); row.put("currency", fund.currencyCode());
                row.put("limit", fund.limitAmount()); row.put("currentBalance", fund.currentBalanceAmount());
                row.put("status", fund.status()); row.put("unitId", fund.unitId()); row.put("businessId", fund.businessId());
                row.put("paymentAccountId", fund.paymentAccountId());
                row.put("fundingSourcePaymentAccountId", fund.fundingSourcePaymentAccountId());
                return row;
            }).toList();
        var summary = new LinkedHashMap<String, Object>();
        summary.put("fundCount", funds.size());
        summary.put("balancesByCurrency", totals(funds, "currency", "currentBalance"));
        var detail = new LinkedHashMap<String, Object>();
        detail.put("statements", redact(workspace.statements()));
        detail.put("recentMovements", redact(workspace.movements().stream().limit(limit(args)).toList()));
        detail.put("recentExpenses", redact(workspace.settlementLines().stream().limit(limit(args)).toList()));
        return result("get_funds_status", "Fondos autorizados", summary, funds, detail);
    }

    private Map<String, Object> receivablesStatus(AuthSessionUser user, Map<String, Object> args) {
        var context = requireFinance(user, "receivables");
        var workspace = receivablesService.workspace(context);
        var query = text(args, "customer");
        var status = text(args, "status");
        var overdueOnly = bool(args, "overdueOnly", false);
        var today = LocalDate.now(clock);
        var matchingAccounts = workspace.receivables().stream()
            .filter(item -> contains(item.customerName(), query))
            .filter(item -> equalsFilter(item.status(), status))
            .filter(item -> !overdueOnly || (item.balance().signum() > 0 && item.dueDate() != null && item.dueDate().isBefore(today)))
            .map(item -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", item.id()); row.put("saleNumber", item.saleNumber()); row.put("customer", item.customerName());
                row.put("originalAmount", item.originalAmount()); row.put("totalPayable", item.totalPayable());
                row.put("paidAmount", item.paidAmount()); row.put("balance", item.balance()); row.put("currency", item.currency());
                row.put("dueDate", item.dueDate()); row.put("nextPaymentDate", item.nextPaymentDate());
                row.put("status", item.status()); row.put("unit", item.unit()); row.put("business", item.business());
                return row;
            }).toList();
        var accounts = matchingAccounts.stream().limit(limit(args)).toList();
        var summary = new LinkedHashMap<String, Object>();
        summary.put("accountCount", matchingAccounts.size());
        summary.put("returnedCount", accounts.size());
        summary.put("balanceByCurrency", totals(matchingAccounts, "currency", "balance"));
        summary.put("overdueCount", matchingAccounts.stream().filter(row -> {
            var due = localDate(row.get("dueDate"));
            return due != null && due.isBefore(today) && decimal(row.get("balance")).signum() > 0;
        }).count());
        return result("get_receivables_status", "Cuentas por cobrar autorizadas", summary, accounts, null);
    }

    private List<Map<String, Object>> unifiedSales(AuthSessionUser user, Map<String, Object> args) {
        var source = normalized(text(args, "source"));
        var customer = text(args, "customer");
        var from = optionalDate(args, "from");
        var to = optionalDate(args, "to");
        var result = new ArrayList<Map<String, Object>>();
        var commercialAllowed = authorizationService.canReadCommercialSales(user);
        var posAllowed = authorizationService.canReadPosSales(user);
        if (!commercialAllowed && !posAllowed) {
            throw new SecurityException("The current Indice permissions do not allow sales queries.");
        }
        if ("commercial".equals(source) && !commercialAllowed) {
            throw new SecurityException("The current Indice permissions do not allow commercial sales queries.");
        }
        if ("pos".equals(source) && !posAllowed) {
            throw new SecurityException("The current Indice permissions do not allow POS sales queries.");
        }
        if (!"pos".equals(source) && commercialAllowed) {
            for (var sale : rows(salesService.list(user.companyId(), "sales", Map.of()), "items")) {
                var item = safeCommercialSale(sale);
                if (matchesSale(item, customer, from, to)) result.add(item);
            }
        }
        if (!"commercial".equals(source) && posAllowed) {
            var context = posAccessService.resolveContext(user)
                .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow POS sales queries."));
            for (var ticket : rows(ticketService.list(context), "items")) {
                var linkedSaleId = longValue(first(ticket, "salesRecordId", "sales_record_id"));
                if (linkedSaleId > 0 && result.stream().anyMatch(item -> longValue(item.get("id")) == linkedSaleId)) {
                    continue;
                }
                var item = safePosSale(ticket);
                if (matchesSale(item, customer, from, to)) result.add(item);
            }
        }
        result.sort(Comparator.comparing((Map<String, Object> item) -> Objects.toString(item.get("date"), "")).reversed());
        return result;
    }

    private boolean matchesSale(Map<String, Object> item, String customer, LocalDate from, LocalDate to) {
        if (!contains(Objects.toString(item.get("customer"), ""), customer)) return false;
        var date = localDate(item.get("date"));
        return date == null || ((from == null || !date.isBefore(from)) && (to == null || !date.isAfter(to)));
    }

    private Map<String, Object> safeCommercialSale(Map<String, Object> source) {
        var row = select(source, "id", "folio", "saleNumber", "saleDate", "customerName", "contactName",
            "sellerName", "status", "paymentStatus", "currencyCode", "currency", "subtotalAmount",
            "taxAmount", "totalAmount", "unitId", "businessId", "unitName", "businessName", "saleLines");
        row.put("source", "commercial");
        row.put("date", first(source, "saleDate", "date", "createdAt"));
        row.put("customer", first(source, "customerName", "contactName"));
        row.put("currency", Objects.toString(first(source, "currencyCode", "currency"), "MXN"));
        row.put("total", decimal(first(source, "totalAmount", "amount")));
        return row;
    }

    private Map<String, Object> safePosSale(Map<String, Object> source) {
        var row = select(source, "id", "ticketNumber", "status", "channel", "currencyCode", "subtotalAmount",
            "discountAmount", "taxAmount", "totalAmount", "paidAmount", "balanceAmount", "customerNameSnapshot",
            "warehouseId", "cashRegisterId", "shiftId", "unitId", "businessId", "completedAt");
        row.put("source", "pos");
        row.put("date", first(source, "completedAt", "createdAt"));
        row.put("customer", first(source, "customerNameSnapshot"));
        row.put("currency", Objects.toString(first(source, "currencyCode"), "MXN"));
        row.put("total", decimal(first(source, "totalAmount")));
        return row;
    }

    private Map<String, Object> safeEmployee(Map<String, Object> row) {
        return select(row, "id", "user_company_id", "user_code", "full_name", "email", "phone", "position",
            "department", "unit_id", "unit_name", "business_id", "business_name", "hire_date", "status");
    }

    private Map<String, Object> safeTask(Map<String, Object> row) {
        return select(row, "id", "folio", "title", "description", "status", "priority", "startDate", "dueDate",
            "completedAt", "completionPercent", "assignedUserCompanyId", "assignedName", "assignees", "teamStatus",
            "processId", "processName", "projectId", "projectName", "unitId", "businessId", "createdAt");
    }

    private Map<String, Object> safeProduct(Map<String, Object> row) {
        return select(row, "id", "productCode", "sku", "name", "description", "category", "type", "price", "cost",
            "currency", "taxCategory", "status", "visibility", "inventoryReady", "posReady", "reservable");
    }

    private Map<String, Object> safeInventoryBalance(Map<String, Object> row) {
        var result = select(row, "id", "productId", "productName", "productSku", "warehouseId", "warehouseName",
            "availableQuantity", "reservedQuantity", "minimumQuantity", "unitCost", "currency", "usesInventory",
            "businessUnitId", "businessId", "businessUnitName", "businessName", "lastMovementAt");
        result.put("available", first(row, "availableQuantity", "available"));
        result.put("reserved", first(row, "reservedQuantity", "reserved"));
        result.put("minimum", first(row, "minimumQuantity", "minimum"));
        return result;
    }

    private Map<String, Object> safeExpense(ExpenseResponse item) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", item.id()); row.put("folio", item.folio()); row.put("concept", item.concept());
        row.put("description", item.description()); row.put("expenseType", item.expenseType());
        row.put("subtotal", item.subtotalAmount()); row.put("tax", item.taxAmount()); row.put("total", item.totalAmount());
        row.put("paid", item.paidAmount()); row.put("balance", item.balanceAmount()); row.put("currency", item.currencyCode());
        row.put("expenseDate", item.expenseDate()); row.put("dueDate", item.dueDate()); row.put("paymentDate", item.paymentDate());
        row.put("status", item.status()); row.put("paymentStatus", item.paymentStatus()); row.put("attachmentCount", item.attachmentCount());
        row.put("providerId", item.providerId()); row.put("budgetLineId", item.budgetLineId());
        row.put("paymentAccountId", item.paymentAccountId()); row.put("unitId", item.unitId()); row.put("businessId", item.businessId());
        return row;
    }

    private List<ExpenseResponse> filteredExpenses(List<ExpenseResponse> source, Map<String, Object> args) {
        var status = text(args, "status");
        var paymentStatus = text(args, "paymentStatus");
        var query = text(args, "query");
        var from = optionalDate(args, "from");
        var to = optionalDate(args, "to");
        var overdueOnly = bool(args, "overdueOnly", false);
        var today = LocalDate.now(clock);
        return source.stream()
            .filter(item -> equalsFilter(item.status(), status))
            .filter(item -> equalsFilter(item.paymentStatus(), paymentStatus))
            .filter(item -> contains(item.concept(), query) || contains(item.folio(), query) || contains(item.description(), query))
            .filter(item -> from == null || !item.expenseDate().isBefore(from))
            .filter(item -> to == null || !item.expenseDate().isAfter(to))
            .filter(item -> !overdueOnly || (item.balanceAmount().signum() > 0 && item.dueDate() != null && item.dueDate().isBefore(today)))
            .toList();
    }

    private Map<String, Object> expenseTotals(List<ExpenseResponse> expenses) {
        var rows = expenses.stream().map(item -> Map.<String, Object>of(
            "currency", item.currencyCode(), "total", item.totalAmount(), "paid", item.paidAmount(), "balance", item.balanceAmount()
        )).toList();
        var summary = new LinkedHashMap<String, Object>();
        summary.put("expenseCount", expenses.size());
        summary.put("totalsByCurrency", totals(rows, "currency", "total"));
        summary.put("paidByCurrency", totals(rows, "currency", "paid"));
        summary.put("payableByCurrency", totals(rows, "currency", "balance"));
        summary.put("overdueCount", expenses.stream().filter(item -> item.balanceAmount().signum() > 0
            && item.dueDate() != null && item.dueDate().isBefore(LocalDate.now(clock))).count());
        return summary;
    }

    private void requireHr(AuthSessionUser user, HrTab tab) {
        if (!hrAccessService.canAccessReadableTab(user, tab)) {
            throw new SecurityException("The current Indice permissions do not allow this HR query.");
        }
    }

    private void requireTasks(AuthSessionUser user) {
        if (!authorizationService.canReadTasks(user)) {
            throw new SecurityException("The current Indice permissions do not allow task queries.");
        }
    }

    private void requireCommercialSales(AuthSessionUser user) {
        if (!authorizationService.canReadCommercialSales(user)) {
            throw new SecurityException("The current Indice permissions do not allow commercial sales queries.");
        }
    }

    private void requireProductCatalog(AuthSessionUser user) {
        if (!authorizationService.canReadProductCatalog(user)) {
            throw new SecurityException("The current Indice permissions do not allow product queries.");
        }
    }

    private void requireInventory(AuthSessionUser user) {
        if (!authorizationService.canReadInventory(user)) {
            throw new SecurityException("The current Indice permissions do not allow inventory queries.");
        }
    }

    private com.indice.erp.pos.PosContext requirePosSales(AuthSessionUser user) {
        if (!authorizationService.canReadPosSales(user)) {
            throw new SecurityException("The current Indice permissions do not allow POS sales queries.");
        }
        return posAccessService.resolveContext(user)
            .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow POS sales queries."));
    }

    private com.indice.erp.pos.PosContext requirePosCash(AuthSessionUser user) {
        if (!authorizationService.canReadPosCash(user)) {
            throw new SecurityException("The current Indice permissions do not allow POS cash queries.");
        }
        return posAccessService.resolveContext(user)
            .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow POS queries."));
    }

    private com.indice.erp.finance.shared.FinanceContext requireFinance(AuthSessionUser user, String capability) {
        var allowed = switch (capability) {
            case "expenses" -> authorizationService.canReadExpenses(user);
            case "petty_cash" -> authorizationService.canReadPettyCash(user);
            case "receivables" -> authorizationService.canReadReceivables(user);
            default -> false;
        };
        if (!allowed) {
            throw new SecurityException("The current Indice permissions do not allow this finance query.");
        }
        return financeAccessService.resolveContext(user)
            .orElseThrow(() -> new SecurityException("The current Indice permissions do not allow finance queries."));
    }

    private Map<String, Object> result(
        String tool,
        String scope,
        Map<String, Object> summary,
        List<? extends Object> items,
        Object detail
    ) {
        var result = new LinkedHashMap<String, Object>();
        result.put("tool", tool);
        result.put("generatedAt", Instant.now(clock));
        result.put("scope", scope);
        result.put("count", items.size());
        result.put("summary", summary);
        result.put("items", items);
        if (detail != null) result.put("detail", detail);
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rows(Map<String, Object> body, String key) {
        var value = body.get(key);
        if (!(value instanceof Collection<?> collection)) return List.of();
        var rows = new ArrayList<Map<String, Object>>();
        for (var item : collection) {
            if (item instanceof Map<?, ?> map) rows.add(copyMap(map));
            else rows.add(objectMapper.convertValue(item, MAP_TYPE));
        }
        return rows;
    }

    private List<Map<String, Object>> firstRows(Map<String, Object> body, String... keys) {
        for (var key : keys) {
            var rows = rows(body, key);
            if (!rows.isEmpty()) return rows;
        }
        return List.of();
    }

    private Map<String, Object> select(Map<String, Object> source, String... keys) {
        var result = new LinkedHashMap<String, Object>();
        for (var key : keys) {
            if (source.containsKey(key)) result.put(key, redact(source.get(key)));
            var snake = camelToSnake(key);
            if (!source.containsKey(key) && source.containsKey(snake)) result.put(key, redact(source.get(snake)));
        }
        return result;
    }

    private Map<String, String> stringFilters(Map<String, Object> args, Map<String, String> names) {
        var result = new LinkedHashMap<String, String>();
        names.forEach((source, target) -> {
            var value = text(args, source);
            if (value != null) result.put(target, value);
        });
        return result;
    }

    private Map<String, BigDecimal> totals(List<? extends Map<String, Object>> rows, String currencyKey, String amountKey) {
        var totals = new LinkedHashMap<String, BigDecimal>();
        for (var row : rows) {
            var currency = Objects.toString(row.get(currencyKey), "MXN").toUpperCase(Locale.ROOT);
            totals.merge(currency, decimal(row.get(amountKey)), BigDecimal::add);
        }
        return totals;
    }

    private Object redact(Object value) {
        if (value == null) return null;
        if (value instanceof Map<?, ?> raw) {
            var result = new LinkedHashMap<String, Object>();
            raw.forEach((key, item) -> {
                var name = String.valueOf(key);
                if (!sensitiveKey(name)) result.put(name, redact(item));
            });
            return result;
        }
        if (value instanceof Collection<?> collection) return collection.stream().map(this::redact).toList();
        if (value.getClass().isRecord()) return redact(objectMapper.convertValue(value, MAP_TYPE));
        return value;
    }

    private boolean sensitiveKey(String key) {
        var normalized = normalized(key);
        return normalized.contains("password") || normalized.contains("token") || normalized.contains("secret")
            || normalized.contains("objectkey") || normalized.contains("downloadurl") || normalized.contains("latitude")
            || normalized.contains("longitude") || normalized.contains("nationalid") || normalized.contains("ssn")
            || normalized.contains("taxid") || normalized.contains("salary") || normalized.contains("hourlyrate")
            || normalized.contains("emergencycontact") || normalized.contains("birthdate") || normalized.contains("address");
    }

    private Map<String, Object> castMap(Object value) {
        if (value instanceof Map<?, ?> map) return copyMap(map);
        return Map.of();
    }

    private Map<String, Object> copyMap(Map<?, ?> raw) {
        var result = new LinkedHashMap<String, Object>();
        raw.forEach((key, value) -> result.put(String.valueOf(key), value));
        return result;
    }

    private Object first(Map<String, Object> row, String... keys) {
        for (var key : keys) if (row.containsKey(key) && row.get(key) != null) return row.get(key);
        return null;
    }

    private String text(Map<String, Object> args, String key) {
        var value = args.get(key);
        if (value == null) return null;
        var normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? null : normalized;
    }

    private long requiredLong(Map<String, Object> args, String key) {
        var value = optionalLong(args, key);
        if (value == null || value <= 0) throw new IllegalArgumentException(key + " must be a positive identifier.");
        return value;
    }

    private Long optionalLong(Map<String, Object> args, String key) {
        var value = args.get(key);
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        try { return Long.parseLong(String.valueOf(value)); }
        catch (NumberFormatException exception) { throw new IllegalArgumentException(key + " must be numeric."); }
    }

    private long longValue(Object value) {
        if (value instanceof Number number) return number.longValue();
        try { return value == null ? 0 : Long.parseLong(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return 0; }
    }

    private int limit(Map<String, Object> args) {
        var value = optionalLong(args, "limit");
        if (value == null) return 25;
        return (int) Math.max(1, Math.min(100, value));
    }

    private boolean bool(Map<String, Object> args, String key, boolean fallback) {
        var value = args.get(key);
        if (value == null) return fallback;
        if (value instanceof Boolean flag) return flag;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private LocalDate date(Map<String, Object> args, String key, LocalDate fallback) {
        var value = optionalDate(args, key);
        return value == null ? fallback : value;
    }

    private LocalDate optionalDate(Map<String, Object> args, String key) {
        return localDate(args.get(key));
    }

    private LocalDate localDate(Object value) {
        if (value instanceof LocalDate date) return date;
        if (value == null) return null;
        var text = String.valueOf(value);
        if (text.length() >= 10) text = text.substring(0, 10);
        try { return LocalDate.parse(text); }
        catch (RuntimeException ignored) { return null; }
    }

    private YearMonth month(Map<String, Object> args) {
        var value = text(args, "month");
        return value == null ? YearMonth.now(clock) : YearMonth.parse(value);
    }

    private BigDecimal decimal(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return new BigDecimal(number.toString());
        try { return value == null ? BigDecimal.ZERO : new BigDecimal(String.valueOf(value)); }
        catch (NumberFormatException ignored) { return BigDecimal.ZERO; }
    }

    private boolean matches(Map<String, Object> row, String query, String... keys) {
        if (query == null) return true;
        for (var key : keys) if (contains(Objects.toString(first(row, key, camelToSnake(key)), ""), query)) return true;
        return false;
    }

    private boolean contains(String value, String query) {
        return query == null || (value != null && value.toLowerCase(Locale.ROOT).contains(query.toLowerCase(Locale.ROOT)));
    }

    private boolean equalsFilter(Object value, String filter) {
        return filter == null || normalized(Objects.toString(value, "")).equals(normalized(filter));
    }

    private String normalized(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replace("_", "").replace("-", "").replace(" ", "");
    }

    private boolean collectionContains(Object value, long id) {
        return value instanceof Collection<?> collection && collection.stream().anyMatch(item -> longValue(item) == id);
    }

    private boolean isOverdue(Map<String, Object> row, LocalDate today) {
        var due = localDate(first(row, "dueDate", "due_date"));
        var status = normalized(Objects.toString(first(row, "status"), ""));
        return due != null && due.isBefore(today) && !Set.of("completed", "cancelled", "done", "completada", "cancelada").contains(status);
    }

    private String camelToSnake(String value) {
        return value.replaceAll("([a-z0-9])([A-Z])", "$1_$2").toLowerCase(Locale.ROOT);
    }
}
