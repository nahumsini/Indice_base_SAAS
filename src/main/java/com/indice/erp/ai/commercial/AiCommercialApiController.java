package com.indice.erp.ai.commercial;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.sales.SalesAssistantContracts.*;
import com.indice.erp.sales.SalesAssistantService;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import static com.indice.erp.ai.commercial.AiCommercialContracts.*;

@RestController
@RequestMapping("/api/v1/ai/tools/commercial")
public class AiCommercialApiController {
    private final AiAccessTokenService tokens;
    private final AiCommercialAccess access;
    private final AiCommercialActionService actions;
    private final SalesAssistantService owner;
    private final AiToolUsageAuditService audit;
    private final AiActionRepository actionAudit;
    private final ObjectMapper mapper;
    public AiCommercialApiController(AiAccessTokenService tokens, AiCommercialAccess access, AiCommercialActionService actions,
            SalesAssistantService owner, AiToolUsageAuditService audit, AiActionRepository actionAudit, ObjectMapper mapper) {
        this.tokens = tokens; this.access = access; this.actions = actions; this.owner = owner; this.audit = audit; this.actionAudit = actionAudit;
        this.mapper = mapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT);
    }
    @PostMapping("/{tool}")
    public ResponseEntity<?> invoke(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String tool, @RequestBody(required = false) JsonNode input) {
        boolean preview = tool.startsWith("preview_");
        String action = preview ? tool.substring(8) : tool;
        final String scope;
        try { scope = AiCommercialAccess.scope(action); }
        catch (IllegalArgumentException exception) { return response(404, new ErrorBody("not_found", "Unknown commercial tool.")); }
        var authenticated = tokens.authenticate(authorization, scope);
        if (authenticated.isEmpty()) return ResponseEntity.status(401).header(HttpHeaders.CACHE_CONTROL, "no-store")
            .header(HttpHeaders.WWW_AUTHENTICATE, "Bearer realm=\"indice-ai\", error=\"invalid_token\"")
            .body(new ErrorBody("invalid_token", "Invalid, expired or insufficiently scoped access token."));
        var token = authenticated.get();
        try {
            access.require(token, action);
            Object result;
            if (AiCommercialAccess.ACTIONS.contains(action)) result = preview
                ? actions.preview(token, action, decode(input, Change.class))
                : actions.commit(token, action, decode(input, CommitRequest.class));
            else {
                if (preview) throw new IllegalArgumentException("Read tools do not accept previews.");
                var query = decode(input == null ? mapper.createObjectNode() : input, Query.class);
                result = switch (tool) {
                    case "get_customer_detail", "get_opportunity_detail", "get_quote_detail" -> {
                        if (query.id() == null || query.id() <= 0) throw new IllegalArgumentException("id is required.");
                        yield owner.detail(token.user(), tool.split("_")[1], query.id());
                    }
                    case "list_opportunities" -> owner.list(token.user(), "opportunity", query);
                    case "list_quotes" -> owner.list(token.user(), "quote", query);
                    case "get_opportunity_pipeline" -> owner.pipeline(token.user(), query.flowId());
                    case "search_commercial_assignees" -> owner.assignees(token.user(), query);
                    default -> throw new IllegalArgumentException("Unknown read tool.");
                };
                audit.recordRead(token, tool, "SUCCESS", 200);
            }
            return response(200, result);
        } catch (Conflict exception) { return failure(token, tool, 409, exception.code(), "Confirmation is unavailable or conflicts with another attempt. Prepare the action again."); }
        catch (Changed exception) { return failure(token, tool, 409, "commercial_record_changed", exception.getMessage()); }
        catch (SecurityException exception) { return failure(token, tool, 403, "ai_tool_permission_required", "Current Indice permissions and organizational scope are required."); }
        catch (NoSuchElementException exception) { return failure(token, tool, 404, "not_found", "Record or reference not found in the authorized scope."); }
        catch (IllegalArgumentException exception) { return failure(token, tool, 400, "invalid_request", exception.getMessage()); }
    }
    private <T> T decode(JsonNode node, Class<T> type) {
        try { if (node == null || !node.isObject()) throw new IllegalArgumentException(); return mapper.treeToValue(node, type); }
        catch (Exception exception) { throw new IllegalArgumentException("Invalid or unsupported commercial fields."); }
    }
    private ResponseEntity<?> failure(AiAccessTokenRepository.StoredToken token, String tool, int status, String code, String message) {
        if (AiCommercialAccess.READS.contains(tool)) audit.recordRead(token, tool, "FAILURE", status);
        else actionAudit.insertAudit(token, tool, null, tool.startsWith("preview_") ? "PREVIEW" : "COMMIT", "FAILURE",
            UUID.randomUUID().toString(), null, null, null, code, null);
        return response(status, new ErrorBody(code, message));
    }
    private ResponseEntity<?> response(int status, Object body) { return ResponseEntity.status(status).header(HttpHeaders.CACHE_CONTROL, "no-store").body(body); }
    private record ErrorBody(String code, String message) { }
}
