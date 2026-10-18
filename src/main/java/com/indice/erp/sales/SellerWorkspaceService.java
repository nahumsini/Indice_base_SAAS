package com.indice.erp.sales;

import static com.indice.erp.sales.SellerWorkspaceDtos.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class SellerWorkspaceService {
    private final SellerWorkspaceRepository repository;
    private final OpportunityFlowRepository flows;
    private final SalesService sales;
    private final FinanceBusinessTimeZoneResolver zones;
    private final ObjectMapper json;
    SellerWorkspaceService(SellerWorkspaceRepository repository, OpportunityFlowRepository flows, SalesService sales,
            FinanceBusinessTimeZoneResolver zones, ObjectMapper json) {
        this.repository=repository; this.flows=flows; this.sales=sales; this.zones=zones; this.json=json;
    }
    static class Conflict extends RuntimeException { Conflict(String message) { super(message); } }
    List<ScriptResponse> scripts(long company, long flow) { flows.requireFlow(company, flow); return repository.scripts(company, flow); }

    @Transactional
    public ScriptResponse saveScript(long company, long flow, long user, SaveScriptRequest request) {
        flows.requireFlow(company, flow); repository.actor(company, user);
        if (request == null || !Set.of("DRAFT","PUBLISHED","ARCHIVED").contains(Objects.toString(request.status(), "")))
            throw new IllegalArgumentException("Invalid script status.");
        validateScript(request.content());
        if (request.content().stageKey() != null && !request.content().stageKey().isBlank()
                && flows.listActiveStages(company, flow).stream().noneMatch(stage -> stage.key().equals(request.content().stageKey())))
            throw new IllegalArgumentException("Script stage is not active in this flow.");
        long id; int version;
        if (request.id() == null) {
            if (request.status().equals("ARCHIVED")) throw new IllegalArgumentException("Cannot create an archived script.");
            if (repository.scripts(company, flow).size() >= 200) throw new IllegalArgumentException("Script limit reached.");
            id=repository.createScript(company, flow); version=1;
        } else {
            var existing=repository.script(company, flow, request.id(), true);
            if (!Objects.equals(request.expectedVersion(), existing.version())) throw new Conflict("Script changed. Reload before editing.");
            id=existing.id(); version=existing.version()+1;
        }
        repository.saveScript(company, id, version, user, request.status(), request.content());
        return repository.script(company, flow, id, false);
    }
    static void validateScript(ScriptContent content) {
        if (content == null) throw new IllegalArgumentException("Script content is required.");
        text(content.name(), 2, 160); text(content.goal(), 0, 1000);
        if (content.blocks() == null || content.blocks().isEmpty() || content.blocks().size() > 20)
            throw new IllegalArgumentException("A script needs 1 to 20 blocks.");
        for (var block : content.blocks()) {
            if (block == null) throw new IllegalArgumentException("Invalid block.");
            text(block.title(), 1, 100); text(block.text(), 1, 6000);
        }
        if (content.blocks().stream().mapToInt(block -> block.text().length()).sum() > 40000)
            throw new IllegalArgumentException("Script content is too long.");
    }
    OpportunityResponse opportunity(long company, long flow, long id) {
        repository.requireOpportunity(company, flow, id);
        var record=sales.get(company, "opportunities", id);
        return new OpportunityResponse(hash(record), record);
    }
    HistoryResponse history(long company, long flow, long id, Long before) {
        repository.requireOpportunity(company, flow, id);
        if (before != null && before < 1) throw new IllegalArgumentException("Invalid history cursor.");
        return repository.history(company, id, before);
    }
    DaySummary summary(long company, long flow, long user) {
        flows.requireFlow(company, flow); repository.actor(company, user);
        var zone=zones.resolve(company); var day=LocalDate.now(zone);
        return repository.summary(company, flow, user, day.toString(), zone.getId(),
                LocalDateTime.ofInstant(day.atStartOfDay(zone).toInstant(), ZoneOffset.UTC),
                LocalDateTime.ofInstant(day.plusDays(1).atStartOfDay(zone).toInstant(), ZoneOffset.UTC));
    }
    // The read after waiting for the opportunity lock must see a concurrent retry receipt.
    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public SaveInteractionResponse record(long company, long flow, long id, long user, InteractionRequest request) {
        validateInteraction(request);
        flows.requireFlow(company, flow);
        String actor=repository.actor(company, user);
        repository.lockOpportunity(company, flow, id);
        String requestHash=hash(request);
        var receipt=repository.receipt(company, user, request.requestKey());
        if (receipt != null) {
            if (receipt.opportunityId()!=id || !receipt.hash().equals(requestHash)) throw new Conflict("Request key already used for another result.");
            return new SaveInteractionResponse(receipt.interaction(), opportunity(company, flow, id));
        }
        var current=opportunity(company, flow, id);
        if (!current.revision().equals(request.revision())) throw new Conflict("Opportunity changed. Reload before saving the result.");
        var lifecycle=Objects.toString(current.opportunity().get("lifecycleStatus"), "OPEN");
        var status=Objects.toString(current.opportunity().get("status"), "");
        if (!lifecycle.equalsIgnoreCase("OPEN") || status.equalsIgnoreCase("on_hold") || status.equalsIgnoreCase("closed"))
            throw new Conflict("Only active open opportunities accept call results.");
        String scriptName=null;
        if (request.scriptId()!=null) scriptName=repository.publishedVersion(company, flow, request.scriptId(), request.scriptVersion()).name();
        var patch=new LinkedHashMap<String,Object>();
        if (request.followupMode().equals("schedule")) {
            patch.put("nextAction", request.nextAction()); patch.put("nextActionAt", request.nextActionAt());
        } else { patch.put("nextActionAt", ""); }
        if (Set.of("answered","information_requested","callback").contains(request.outcome()))
            patch.put("lastContactAt", LocalDateTime.now(zones.resolve(company)).withNano(0).toString());
        sales.update(company, user, "opportunities", id, patch);
        var interaction=repository.insertInteraction(company, flow, id, user, actor, request, requestHash, scriptName);
        return new SaveInteractionResponse(interaction, opportunity(company, flow, id));
    }
    static void validateInteraction(InteractionRequest request) {
        if (request == null) throw new IllegalArgumentException("Result is required.");
        if (request.requestKey()==null || !request.requestKey().matches("[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}"))
            throw new IllegalArgumentException("A valid request key is required.");
        text(request.revision(), 64, 64); text(request.notes(), 0, 10000);
        if (!Set.of("answered","no_answer","busy","wrong_number","information_requested","callback").contains(Objects.toString(request.outcome(), "")))
            throw new IllegalArgumentException("Invalid call result.");
        if ((request.scriptId()==null)!=(request.scriptVersion()==null) || request.scriptVersion()!=null && request.scriptVersion()<1)
            throw new IllegalArgumentException("Script and version must be supplied together.");
        if (!Set.of("schedule","clear").contains(Objects.toString(request.followupMode(), "")))
            throw new IllegalArgumentException("Choose follow-up or clear the previous schedule.");
        if (request.followupMode().equals("schedule")) {
            if (!Set.of("call","whatsapp","email","meeting","send_proposal","follow_up","review_documents","close_deal").contains(Objects.toString(request.nextAction(), "")))
                throw new IllegalArgumentException("Invalid next action.");
            if (request.nextActionAt()==null || !request.nextActionAt().matches("\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}"))
                throw new IllegalArgumentException("Follow-up needs date and time.");
        } else if (request.nextAction()!=null || request.nextActionAt()!=null) throw new IllegalArgumentException("Clear follow-up must not include a schedule.");
    }
    private static void text(String value,int min,int max) {
        if (value==null || value.trim().length()<min || value.length()>max) throw new IllegalArgumentException("Text length is invalid.");
    }
    private String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsString(value).getBytes(StandardCharsets.UTF_8))); }
        catch (Exception ex) { throw new IllegalStateException("Cannot fingerprint seller command."); }
    }
}
