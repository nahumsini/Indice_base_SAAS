package com.indice.erp.processTasks.tasks;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ProcessTaskAssignmentCatalogServiceTest {

    private final ProcessTaskAssignmentCatalogService service = new ProcessTaskAssignmentCatalogService(
        mock(JdbcTemplate.class),
        mock(ProcessTaskAssignmentScopeService.class)
    );

    @Test
    void missingActorScopeFailsClosed() {
        assertThat(service.isVisibleToActor(null, candidate(20L, 7L, 8L))).isFalse();
    }

    @Test
    void corporateActorCanSeeEveryCompanyCandidate() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.corporate(1L, 10L);

        assertThat(service.isVisibleToActor(actor, candidate(20L, 7L, 8L))).isTrue();
        assertThat(service.isVisibleToActor(actor, candidate(21L, null, null))).isTrue();
    }

    @Test
    void unitActorSeesOnlyCandidatesFromTheSameUnit() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.unit(1L, 10L, 7L);

        assertThat(service.isVisibleToActor(actor, candidate(20L, 7L, 8L))).isTrue();
        assertThat(service.isVisibleToActor(actor, candidate(21L, 7L, 9L))).isTrue();
        assertThat(service.isVisibleToActor(actor, candidate(22L, 11L, 12L))).isFalse();
        assertThat(service.isVisibleToActor(actor, candidate(23L, null, null))).isFalse();
    }

    @Test
    void businessActorSeesOnlyCandidatesFromTheSameBusiness() {
        var actor = ProcessTaskAssignmentScopeService.AssignmentScope.business(1L, 10L, 7L, 8L);

        assertThat(service.isVisibleToActor(actor, candidate(20L, 7L, 8L))).isTrue();
        assertThat(service.isVisibleToActor(actor, candidate(21L, 7L, 9L))).isFalse();
        assertThat(service.isVisibleToActor(actor, candidate(22L, 11L, 8L))).isTrue();
    }

    private ProcessTaskAssignmentOption candidate(long userCompanyId, Long unitId, Long businessId) {
        return new ProcessTaskAssignmentOption(
            userCompanyId,
            userCompanyId + 100,
            "Usuario " + userCompanyId,
            unitId,
            unitId == null ? "" : "Unidad",
            businessId,
            businessId == null ? "" : "Negocio"
        );
    }
}
