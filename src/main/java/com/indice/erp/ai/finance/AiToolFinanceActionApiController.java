package com.indice.erp.ai.finance;

import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import java.util.Map;
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
@RequestMapping("/api/v1/ai/tools/finance/actions")
public class AiToolFinanceActionApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiToolAuthorizationService authorizationService;
    private final AiFinanceActionService actionService;

    public AiToolFinanceActionApiController(
        AiAccessTokenService tokenService,
        AiToolAuthorizationService authorizationService,
        AiFinanceActionService actionService
    ) {
        this.tokenService = tokenService;
        this.authorizationService = authorizationService;
        this.actionService = actionService;
    }

    @PostMapping("/{action}/preview")
    public ResponseEntity<?> preview(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @PathVariable String action,
        @RequestBody(required = false) Map<String, Object> request
    ) {
        var access = access(authorization, action);
        if (access.error() != null) return access.error();
        try {
            return ResponseEntity.ok(actionService.preview(access.token(), action, request));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    @PostMapping("/{action}/commit")
    public ResponseEntity<?> commit(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @PathVariable String action,
        @RequestBody(required = false) AiFinanceActionContracts.CommitRequest request
    ) {
        var access = access(authorization, action);
        if (access.error() != null) return access.error();
        try {
            var response = actionService.commit(access.token(), action, request);
            return ResponseEntity.status(response.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(response);
        } catch (AiFinanceActionConflictException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(error(exception.code(), exception.getMessage()));
        } catch (SecurityException exception) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error("ai_tool_permission_required", exception.getMessage()));
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.badRequest().body(error("invalid_request", exception.getMessage()));
        }
    }

    private Access access(String authorization, String action) {
        if (!AiFinanceActionService.TOOLS.contains(action)) {
            return new Access(null, ResponseEntity.notFound().build());
        }
        var token = tokenService.authenticate(authorization, requiredScope(action));
        if (token.isEmpty()) {
            return new Access(null, ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(error("invalid_token", "Invalid, expired, or insufficiently scoped access token.")));
        }
        if (!authorizationService.canUseCapability(token.get().user(), capability(action))) {
            return new Access(null, ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(error("ai_tool_permission_required", "The current Indice permissions do not allow this action.")));
        }
        return new Access(token.get(), null);
    }

    private String requiredScope(String action) {
        return switch (action) {
            case AiFinanceActionService.CREATE_EXPENSE_DRAFT -> AiAccessTokenService.EXPENSES_CREATE;
            case AiFinanceActionService.REGISTER_FUND_EXPENSE -> AiAccessTokenService.PETTY_CASH_EXPENSE_CREATE;
            case AiFinanceActionService.ADD_MONEY_TO_FUND -> AiAccessTokenService.PETTY_CASH_DEPOSIT_CREATE;
            default -> throw new IllegalArgumentException("Unsupported finance action.");
        };
    }

    private String capability(String action) {
        return AiFinanceActionService.CREATE_EXPENSE_DRAFT.equals(action) ? "expenses" : "petty_cash";
    }

    private Map<String, String> error(String code, String message) {
        return Map.of("code", code, "message", message == null ? "Request failed." : message);
    }

    private record Access(
        com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken token,
        ResponseEntity<?> error
    ) { }
}
