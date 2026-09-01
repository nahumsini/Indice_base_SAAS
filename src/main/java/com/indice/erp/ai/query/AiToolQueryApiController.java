package com.indice.erp.ai.query;

import com.indice.erp.ai.access.AiAccessTokenService;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/tools/query")
public class AiToolQueryApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiBusinessQueryService queryService;

    public AiToolQueryApiController(AiAccessTokenService tokenService, AiBusinessQueryService queryService) {
        this.tokenService = tokenService;
        this.queryService = queryService;
    }

    @PostMapping("/{tool}")
    public ResponseEntity<?> query(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @PathVariable String tool,
        @RequestBody(required = false) Map<String, Object> args
    ) {
        if (!AiBusinessQueryService.TOOLS.contains(tool)) {
            return ResponseEntity.notFound().build();
        }
        var scope = requiredScope(tool);
        var token = tokenService.authenticate(authorization, scope);
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(error("invalid_token", "Invalid, expired, or insufficiently scoped access token."));
        }
        try {
            return ResponseEntity.ok(queryService.execute(token.get().user(), tool, args));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (NoSuchElementException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error("not_found", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    static String requiredScope(String tool) {
        return switch (tool) {
            case "search_employees", "get_employee_overview" -> AiAccessTokenService.HR_PEOPLE_READ;
            case "get_attendance_exceptions" -> AiAccessTokenService.HR_ATTENDANCE_READ;
            case "list_tasks", "get_task_detail" -> AiAccessTokenService.TASKS_READ;
            case "get_sales_summary", "list_sales", "get_sale_detail" -> AiAccessTokenService.SALES_READ;
            case "get_cash_status" -> AiAccessTokenService.POS_READ;
            case "search_products", "get_product_detail", "get_inventory_summary" -> AiAccessTokenService.INVENTORY_READ;
            case "get_expense_summary", "list_expenses", "get_expense_detail" -> AiAccessTokenService.EXPENSES_READ;
            case "get_funds_status" -> AiAccessTokenService.PETTY_CASH_READ;
            case "get_receivables_status" -> AiAccessTokenService.RECEIVABLES_READ;
            default -> throw new IllegalArgumentException("Unknown business query tool.");
        };
    }

    private Map<String, String> error(String code, String message) {
        return Map.of("code", code, "message", message == null ? "Request failed." : message);
    }
}
