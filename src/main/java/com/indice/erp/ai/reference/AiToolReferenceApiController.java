package com.indice.erp.ai.reference;

import com.indice.erp.ai.access.AiAccessTokenRepository;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.auth.AuthSessionUser;
import java.util.NoSuchElementException;
import java.util.function.Function;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ai/tools/references")
public class AiToolReferenceApiController {

    private static final String BEARER_CHALLENGE = "Bearer realm=\"indice-ai\", error=\"invalid_token\"";

    private final AiAccessTokenService tokenService;
    private final AiReferenceResolverService resolverService;
    private final AiToolUsageAuditService auditService;

    public AiToolReferenceApiController(
        AiAccessTokenService tokenService,
        AiReferenceResolverService resolverService,
        AiToolUsageAuditService auditService
    ) {
        this.tokenService = tokenService;
        this.resolverService = resolverService;
        this.auditService = auditService;
    }

    @GetMapping("/business-context")
    public ResponseEntity<?> getMyBusinessContext(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        return invoke(
            authorization,
            AiAccessTokenService.BUSINESS_CONTEXT_READ,
            "get_my_business_context",
            resolverService::getMyBusinessContext
        );
    }

    @PostMapping("/organization")
    public ResponseEntity<?> listUnitsAndBusinesses(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) PageRequest request
    ) {
        return invoke(
            authorization,
            AiAccessTokenService.BUSINESS_CONTEXT_READ,
            "list_units_and_businesses",
            user -> resolverService.listUnitsAndBusinesses(user, request)
        );
    }

    @PostMapping("/payment-accounts")
    public ResponseEntity<?> listPaymentAccounts(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) PageRequest request
    ) {
        return invoke(
            authorization,
            AiAccessTokenService.FINANCE_REFERENCES_READ,
            "list_payment_accounts",
            user -> resolverService.listPaymentAccounts(user, request)
        );
    }

    @PostMapping("/funds")
    public ResponseEntity<?> listFunds(
        @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
        @RequestBody(required = false) PageRequest request
    ) {
        return invoke(
            authorization,
            AiAccessTokenService.PETTY_CASH_READ,
            "list_funds",
            user -> resolverService.listFunds(user, request)
        );
    }

    private ResponseEntity<?> invoke(
        String authorization,
        String requiredScope,
        String toolName,
        Function<AuthSessionUser, Object> operation
    ) {
        var token = tokenService.authenticate(authorization, requiredScope);
        if (token.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .header(HttpHeaders.WWW_AUTHENTICATE, BEARER_CHALLENGE)
                .body(new ErrorResponse("invalid_token", "Invalid, expired, or insufficiently scoped access token."));
        }
        var storedToken = token.get();
        try {
            var response = operation.apply(storedToken.user());
            auditService.recordRead(storedToken, toolName, "SUCCESS", HttpStatus.OK.value());
            return ResponseEntity.ok(response);
        } catch (SecurityException exception) {
            return failure(storedToken, toolName, HttpStatus.FORBIDDEN, "ai_tool_permission_required", exception);
        } catch (NoSuchElementException exception) {
            return failure(storedToken, toolName, HttpStatus.NOT_FOUND, "not_found", exception);
        } catch (IllegalArgumentException exception) {
            return failure(storedToken, toolName, HttpStatus.BAD_REQUEST, "invalid_request", exception);
        }
    }

    private ResponseEntity<ErrorResponse> failure(
        AiAccessTokenRepository.StoredToken token,
        String toolName,
        HttpStatus status,
        String code,
        RuntimeException exception
    ) {
        auditService.recordRead(token, toolName, "FAILURE", status.value());
        return ResponseEntity.status(status)
            .body(new ErrorResponse(code, exception.getMessage() == null ? "Request failed." : exception.getMessage()));
    }

    private record ErrorResponse(String code, String message) {
    }
}
