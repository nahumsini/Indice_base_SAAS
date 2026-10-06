package com.indice.erp.ai.query;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.processTasks.kpis.ProcessTaskKpiMeasurements;
import com.indice.erp.processTasks.kpis.ProcessTaskKpisService;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Projects the existing owner measurements without recomputing financial or task indicators. */
@Service
public class AiProcessTaskKpiService {
    public static final String TOOL = "get_process_task_kpis";
    private final ProcessTaskKpisService owner;
    private final AiToolAuthorizationService authorization;
    private final ObjectMapper mapper;

    public AiProcessTaskKpiService(ProcessTaskKpisService owner, AiToolAuthorizationService authorization, ObjectMapper mapper) {
        this.owner = owner; this.authorization = authorization; this.mapper = mapper;
    }

    public record Request(LocalDate from, LocalDate to, Boolean includeOverdueBacklog, Boolean overdueOnly,
            Long unitId, Long businessId, Long collaboratorId, Long projectId, String focus, String status,
            String search, String entity, Integer limit, String cursor) { }
    public record Entity(Long id, String name, String type, ProcessTaskKpiMeasurements.Metrics measurements) { }
    public record Result(int definitionVersion, LocalDate from, LocalDate to, LocalDate cutoffDate,
            LocalDate upcomingThrough, ProcessTaskKpiMeasurements.Metrics summary,
            List<ProcessTaskKpiMeasurements.Activity> activity, List<Entity> items, int returnedCount,
            int totalCount, boolean hasMore, String nextCursor) { }

    public Result read(StoredToken token, Request request) {
        if (!token.scopes().contains("tasks.kpis:read")
                || !authorization.canReadGuideTab(token.user(), "processes", "kpis"))
            throw new SecurityException("Current Processes KPI consent and tab permission required.");
        if (request == null || request.from() == null || request.to() == null
                || request.to().isBefore(request.from()) || ChronoUnit.DAYS.between(request.from(), request.to()) > 365)
            throw new IllegalArgumentException("An explicit date range of at most 366 days is required.");
        String entity = request.entity() == null ? "collaborator" : request.entity();
        if (!Set.of("collaborator", "process", "project", "unit").contains(entity))
            throw new IllegalArgumentException("Choose a supported KPI entity.");
        if (request.focus() != null && !Set.of("mine", "delegated", "team").contains(request.focus()))
            throw new IllegalArgumentException("Choose mine, delegated or team focus.");
        if (request.search() != null && request.search().length() > 120)
            throw new IllegalArgumentException("Search must contain at most 120 characters.");
        for (Long id : new Long[] {request.unitId(), request.businessId(), request.collaboratorId(), request.projectId()})
            if (id != null && id < 1) throw new IllegalArgumentException("Positive reference IDs required.");
        var data = owner.getDashboard(token.user().companyId(), token.user().userId(), request.from().toString(),
                request.to().toString(), request.includeOverdueBacklog(), request.overdueOnly(), request.unitId(),
                request.businessId(), request.collaboratorId(), request.projectId(), request.focus(), request.status(), request.search());
        var measurements = (ProcessTaskKpiMeasurements) data.get("measurements");
        String list = switch (entity) { case "collaborator" -> "collaborators"; case "process" -> "processes"; case "project" -> "projects"; default -> "units"; };
        var rows = mapper.convertValue(data.get(list), new TypeReference<List<Map<String, Object>>>() { });
        var items = rows.stream().map(row -> new Entity(number(row.get(entity + "Id")),
                text(row.get(switch (entity) { case "process" -> "processTitle"; default -> entity + "Name"; })),
                entity, mapper.convertValue(row.get("measurements"), ProcessTaskKpiMeasurements.Metrics.class))).toList();
        Map<String, Object> filters = mapper.convertValue(request, new TypeReference<>() { });
        var page = AiQueryPages.page(mapper, token.user(), TOOL, filters, items);
        var returned = page.items().stream().map(Entity.class::cast).toList();
        return new Result(measurements.definitionVersion(), request.from(), request.to(), measurements.cutoffDate(),
                measurements.upcomingThrough(), measurements.summary(), measurements.activity(), returned,
                page.returnedCount(), page.totalCount(), page.hasMore(), page.nextCursor());
    }
    private static Long number(Object value) { return value instanceof Number number ? number.longValue() : null; }
    private static String text(Object value) { return value == null ? "" : value.toString(); }
}
