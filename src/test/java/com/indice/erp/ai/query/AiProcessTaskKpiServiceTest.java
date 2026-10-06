package com.indice.erp.ai.query;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.processTasks.kpis.ProcessTaskKpiMeasurements;
import com.indice.erp.processTasks.kpis.ProcessTaskKpisService;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AiProcessTaskKpiServiceTest {
    final ProcessTaskKpisService owner = mock(ProcessTaskKpisService.class);
    final AiToolAuthorizationService authorization = mock(AiToolAuthorizationService.class);
    final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
    final AiProcessTaskKpiService service = new AiProcessTaskKpiService(owner, authorization, mapper);
    final AuthSessionUser user = new AuthSessionUser(1L, 2L, 3L, "Synthetic", "admin");
    final StoredToken token = new StoredToken(7, user, Set.of("tasks.kpis:read"));
    final LocalDate from = LocalDate.of(2026, 10, 1), to = LocalDate.of(2026, 10, 6);
    AiProcessTaskKpiService.Request request(String cursor, String entity) {
        return new AiProcessTaskKpiService.Request(from, to, true, false, 4L, 5L, 6L, 7L,
                "team", "all", "Example", entity, 1, cursor);
    }
    @Test void preservesAuthoritativeMeasurementsFiltersAndFullTotalsAcrossPages() {
        when(authorization.canReadGuideTab(user, "processes", "kpis")).thenReturn(true);
        var metrics = mapper.convertValue(Map.of("ratingDistribution", List.of(0, 0, 0, 0, 0)), ProcessTaskKpiMeasurements.Metrics.class);
        var measurement = new ProcessTaskKpiMeasurements(1, to, to, metrics, List.of());
        when(owner.getDashboard(2, 1, from.toString(), to.toString(), true, false, 4L, 5L, 6L, 7L, "team", "all", "Example"))
                .thenReturn(Map.of("measurements", measurement, "projects", List.of(
                    Map.of("projectId", 7L, "projectName", "Example", "measurements", metrics, "private", "redacted"),
                    Map.of("projectId", 8L, "projectName", "Example 2", "measurements", metrics)), "units", List.of()));
        var first = service.read(token, request(null, "project"));
        assertThat(first.summary()).isEqualTo(metrics);
        assertThat(first.summary().onTimeRate()).isNull();
        assertThat(first.totalCount()).isEqualTo(2);
        assertThat(first.items()).hasSize(1);
        assertThat(first.hasMore()).isTrue();
        assertThat(mapper.valueToTree(first).toString()).doesNotContain("private", "redacted");
        var second = service.read(token, request(first.nextCursor(), "project"));
        assertThat(second.summary()).isEqualTo(first.summary());
        assertThat(second.items().getFirst().id()).isEqualTo(8);
        assertThat(second.hasMore()).isFalse();
        assertThatThrownBy(() -> service.read(token, request(first.nextCursor(), "unit"))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void revokedTabAndOldConsentFailBeforeOwnerQuery() {
        assertThatThrownBy(() -> service.read(token, request(null, "project"))).isInstanceOf(SecurityException.class);
        when(authorization.canReadGuideTab(user, "processes", "kpis")).thenReturn(true);
        assertThatThrownBy(() -> service.read(new StoredToken(7, user, Set.of("tasks.read")), request(null, "project")))
                .isInstanceOf(SecurityException.class);
        verifyNoInteractions(owner);
    }
}
