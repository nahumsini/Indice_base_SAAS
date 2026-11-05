package com.indice.erp.ai.mailing;

import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiAccessTokenService;
import com.indice.erp.ai.access.AiToolUsageAuditService;
import com.indice.erp.sales.mailing.MailingAudienceContracts.Filters;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/ai/tools/mailing_lists")
public class AiMailingListController {
    private final AiAccessTokenService tokens;
    private final AiMailingListService lists;
    private final AiToolUsageAuditService audit;

    public AiMailingListController(AiAccessTokenService tokens, AiMailingListService lists, AiToolUsageAuditService audit) {
        this.tokens = tokens;
        this.lists = lists;
        this.audit = audit;
    }

    public record Search(@Size(max=180) String search, @Min(1) @Max(10000) Integer page) { }
    public record AssignmentRequest(
        @NotNull @Pattern(regexp="[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}") String listId,
        @Size(min=1,max=500) List<@NotNull @Positive Long> contactIds,
        @Valid Filters filters
    ) {
        boolean validSelection() {
            if (contactIds != null) return filters == null;
            return filters != null && (present(filters.search()) || present(filters.source())
                || filters.owner() != null || present(filters.tag()) || present(filters.listId()) || present(filters.eligibility()));
        }
        private static boolean present(String value) { return value != null && !value.isBlank(); }
    }
    public record CommitRequest(
        @NotNull @Pattern(regexp="idx_confirm_[A-Za-z0-9_-]{43}") String confirmationToken,
        @NotBlank @Size(min=8,max=128) String idempotencyKey
    ) { }

    @PostMapping("/list_mailing_lists")
    public ResponseEntity<?> list(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String bearer,
        @Valid @RequestBody Search input) {
        return invoke(bearer, AiAccessTokenService.MAILING_LISTS_READ, true,
            token -> lists.list(token, input.search(), input.page() == null ? 1 : input.page()));
    }

    @PostMapping("/assign_mailing_list_contacts/preview")
    public ResponseEntity<?> preview(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String bearer,
        @Valid @RequestBody AssignmentRequest input) {
        return invoke(bearer, AiAccessTokenService.MAILING_LISTS_ASSIGN, false, token -> {
            if (!input.validSelection()) throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST, "mailing_selection_invalid");
            return lists.preview(token, input.listId(), input.contactIds(), input.filters());
        });
    }

    @PostMapping("/assign_mailing_list_contacts/commit")
    public ResponseEntity<?> commit(@RequestHeader(value=HttpHeaders.AUTHORIZATION,required=false) String bearer,
        @Valid @RequestBody CommitRequest input) {
        return invoke(bearer, AiAccessTokenService.MAILING_LISTS_ASSIGN, false,
            token -> lists.commit(token, input.confirmationToken(), input.idempotencyKey()));
    }

    private ResponseEntity<?> invoke(String bearer, String scope, boolean read, Function<StoredToken, Object> operation) {
        var token = tokens.authenticate(bearer, scope);
        if (token.isEmpty()) {
            return ResponseEntity.status(401).header(HttpHeaders.WWW_AUTHENTICATE,"Bearer realm=\"indice-ai\", error=\"invalid_token\"")
                .body(Map.of("code","invalid_token","message","Se requiere autorización de Índice para esta acción."));
        }
        try {
            var result = operation.apply(token.get());
            if (read) audit.recordRead(token.get(), AiMailingListService.READ, "SUCCESS", 200);
            return ResponseEntity.ok(result);
        } catch (ResponseStatusException e) {
            if (read) audit.recordRead(token.get(), AiMailingListService.READ, "FAILURE", e.getStatusCode().value());
            String code = e.getReason() == null ? "mailing_lists_unavailable" : e.getReason();
            String message = switch (code) {
                case "mailing_version_conflict" -> "La lista cambió. Prepara una nueva vista previa y vuelve a confirmar.";
                case "mailing_list_capacity_exceeded" -> "La lista admite hasta 500 integrantes. Reduce la selección o elige otro destino.";
                case "mailing_selection_limit" -> "Los filtros coinciden con más de 500 contactos. Reduce la selección antes de confirmar.";
                case "mailing_contact_unavailable" -> "Algún contacto ya no está disponible. Revisa los contactos y prepara una nueva vista previa.";
                case "confirmation_expired_or_used", "confirmation_invalid" -> "La confirmación ya no es válida. Prepara una nueva vista previa.";
                default -> "No se pudo completar la operación sobre la lista de segmentación.";
            };
            return ResponseEntity.status(e.getStatusCode()).body(Map.of("code",code,"message",message));
        }
    }
}
