package com.indice.erp.sales.funneling;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.auth.AuthSessionUser;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.funneling.FunnelContracts.*;

@Service
public class FunnelService {
    private final FunnelRepository repository;
    private final ModuleAccessService modules;
    private final Validator validator;
    public FunnelService(FunnelRepository repository, ModuleAccessService modules, Validator validator) {
        this.repository = repository; this.modules = modules; this.validator = validator;
    }

    @Transactional(readOnly = true)
    public PlanPage list(AuthSessionUser actor, String search, String status, int page, int size, String sort, String direction) {
        require(search.length() <= 180 && page >= 1 && page <= 10000 && Set.of(10,25,50,100,200).contains(size)
            && Set.of("ALL","DRAFT","PLANNED","ARCHIVED").contains(status) && Set.of("asc","desc").contains(direction),
            HttpStatus.BAD_REQUEST, "funnel_filters_invalid");
        String column = switch (sort) {
            case "name" -> "name";
            case "updatedAt" -> "updated_at";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "funnel_sort_invalid");
        };
        var result = repository.list(actor.companyId(), search, status, page, size, column, direction);
        return new PlanPage(result.items().stream().map(FunnelService::project).toList(), result.total(), page, size);
    }

    @Transactional(readOnly = true)
    public Plan get(AuthSessionUser actor, String id) {
        return project(repository.find(actor.companyId(), id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "funnel_not_found")));
    }

    @Transactional
    public Plan save(AuthSessionUser actor, String id, PlanInput input) {
        require(input != null && validator.validate(input).isEmpty(), HttpStatus.BAD_REQUEST, "funnel_input_invalid");
        try { require(UUID.fromString(id).toString().equals(id), HttpStatus.BAD_REQUEST, "funnel_id_invalid"); }
        catch (IllegalArgumentException invalid) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "funnel_id_invalid"); }
        // Lock and resolve the current aggregate before validating backward-compatible edits.
        repository.lockCompany(actor.companyId());
        require(modules.companyCanAccessForMutation(actor.companyId(), "crm"), HttpStatus.FORBIDDEN, "funnel_module_unavailable");
        var current = repository.find(actor.companyId(), id);
        require(current.isEmpty() ? input.version() == 0 : current.get().version() == input.version(),
            HttpStatus.CONFLICT, "funnel_version_conflict");
        // A client predating stage content must refresh instead of silently dropping it.
        if (current.stream().flatMap(p -> p.stages().stream()).anyMatch(s -> s.content() != null && !s.content().isBlank())) {
            require(input.stages().stream().allMatch(s -> s.content() != null), HttpStatus.CONFLICT, "funnel_content_update_required");
        }
        Workshop brief = input.workshop() != null ? input.workshop() : current.map(Plan::workshop).orElse(null);
        require(input.stages().size() >= 2 || (brief != null && input.stages().isEmpty()), HttpStatus.BAD_REQUEST, "funnel_input_invalid");
        if (brief != null) {
            require(Set.copyOf(brief.channels()).size() == brief.channels().size()
                && Set.copyOf(brief.materials()).size() == brief.materials().size()
                && Set.copyOf(brief.deferredRecommendations()).size() == brief.deferredRecommendations().size(),
                HttpStatus.BAD_REQUEST, "funnel_input_invalid");
        }
        BigDecimal previous = null;
        for (Stage stage : input.stages()) {
            if (stage.target() != null) {
                require(previous == null || stage.target().compareTo(previous) <= 0, HttpStatus.BAD_REQUEST, "funnel_targets_invalid");
                previous = stage.target();
            }
        }
        if (input.status().equals("PLANNED")) {
            boolean complete = brief == null
                ? input.stages().stream().allMatch(s -> !s.action().isBlank() && !s.measure().isBlank())
                : !brief.offer().isBlank() && !brief.goal().equals("UNDECIDED") && !brief.channels().isEmpty() && !brief.destination().equals("UNDECIDED");
            require(!input.objective().isBlank() && !input.audience().isBlank() && complete,
                HttpStatus.BAD_REQUEST, "funnel_plan_incomplete");
        }
        repository.save(actor.companyId(), actor.userId(), id, input);
        return get(actor, id);
    }

    static BigDecimal conversion(List<Stage> stages) {
        if (stages.isEmpty() || stages.stream().anyMatch(s -> s.target() == null) || stages.getFirst().target().signum() == 0) return null;
        return stages.getLast().target().multiply(BigDecimal.valueOf(100))
            .divide(stages.getFirst().target(), 2, RoundingMode.HALF_UP);
    }

    private static Plan project(Plan plan) {
        return new Plan(plan.id(), plan.name(), plan.objective(), plan.audience(), plan.channel(), plan.notes(),
            plan.stages(), plan.status(), plan.version(), plan.updatedAt(), conversion(plan.stages()), stageEstimates(plan.stages()), plan.workshop(), plan.contentGuide());
    }

    static List<StageEstimate> stageEstimates(List<Stage> stages) {
        return java.util.stream.IntStream.range(0, stages.size()).mapToObj(index -> {
            BigDecimal previous = index == 0 ? null : stages.get(index - 1).target();
            BigDecimal current = stages.get(index).target();
            BigDecimal advance = previous == null || previous.signum() == 0 || current == null ? null
                : current.multiply(BigDecimal.valueOf(100)).divide(previous, 2, RoundingMode.HALF_UP);
            return new StageEstimate(advance);
        }).toList();
    }

    private static void require(boolean valid, HttpStatus status, String code) {
        if (!valid) throw new ResponseStatusException(status, code);
    }
}
