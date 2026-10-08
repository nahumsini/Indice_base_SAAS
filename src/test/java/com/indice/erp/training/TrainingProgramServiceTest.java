package com.indice.erp.training;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.doThrow;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.distributorportal.DistributorPortalForbiddenException;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class TrainingProgramServiceTest {

    @Mock private JdbcTemplate jdbc;
    @Mock private PlatformAdminAccessService platformAccess;
    @Mock private DistributorPortfolioAccessPolicy distributorAccess;

    private TrainingProgramService service;
    private AuthSessionUser actor;

    @BeforeEach
    void setUp() {
        service = new TrainingProgramService(
            jdbc,
            platformAccess,
            distributorAccess,
            Clock.fixed(Instant.parse("2026-08-27T21:30:00Z"), ZoneOffset.UTC)
        );
        actor = new AuthSessionUser(11L, 31L, 41L, "Consultor", "owner");
    }

    @Test
    void rejectsAnIncorrectConsultingCriterionWithoutCreditingProgress() {
        assertThatThrownBy(() -> service.validateDistributorAssessment(
            actor,
            new TrainingProgramService.AssessmentRequest("assessment.finanzas", "adjust-balance", true)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("criterio consultivo");

        verifyNoInteractions(jdbc);
    }

    @Test
    void requiresThePracticalExerciseBeforeCreditingTheAssessment() {
        assertThatThrownBy(() -> service.validateDistributorAssessment(
            actor,
            new TrainingProgramService.AssessmentRequest("assessment.ventas", "commercial-flow", false)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("práctica");

        verifyNoInteractions(jdbc);
    }

    @Test
    void creditsAStageOnlyAfterTheCorrectCriterionAndPractice() {
        service.validateDistributorAssessment(
            actor,
            new TrainingProgramService.AssessmentRequest("assessment.procesos", "repeatable-process", true)
        );

        verify(jdbc).update(
            anyString(),
            eq(11L),
            eq(TrainingProgramService.PROGRAM_CODE),
            eq(TrainingProgramService.PROGRAM_VERSION),
            eq("assessment.procesos"),
            any(Timestamp.class),
            any(Timestamp.class)
        );
    }

    @Test
    void blocksDirectSelfApprovalOfAnAssessmentCode() {
        assertThatThrownBy(() -> service.updateDistributorProgress(
            actor,
            new TrainingProgramService.ProgressRequest("assessment.rh", true)
        ))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("validación obligatoria");

        verifyNoInteractions(jdbc);
    }

    @Test
    void distributorWorkspaceReadsOnlyTheLearnerProgressWithoutPlatformAuthorityOrGlobalSummary() {
        var workspace = service.distributorWorkspace(actor);

        verify(distributorAccess).requireDistributor(actor);
        verify(jdbc).queryForList(
            anyString(), eq(String.class), eq(actor.userId()),
            eq(TrainingProgramService.PROGRAM_CODE), eq(TrainingProgramService.PROGRAM_VERSION)
        );
        verifyNoMoreInteractions(jdbc);
        verifyNoInteractions(platformAccess);
        assertThat(workspace).containsKeys("program_code", "program_version", "completed_item_codes")
            .doesNotContainKey("audience_summary");
    }

    @Test
    void deniedDistributorDoesNotReadProgressOrFallBackToPlatformAccess() {
        doThrow(new DistributorPortalForbiddenException("Denied"))
            .when(distributorAccess).requireDistributor(actor);

        assertThatThrownBy(() -> service.distributorWorkspace(actor))
            .isInstanceOf(DistributorPortalForbiddenException.class);
        verifyNoInteractions(jdbc, platformAccess);
    }

    @Test
    void platformWorkspaceRetainsItsViewGateAndAuthorizedAudienceSummary() {
        var workspace = service.platformWorkspace(actor.userId());

        verify(platformAccess).require(actor.userId(), "PLATFORM_VIEW");
        verifyNoInteractions(distributorAccess);
        assertThat(workspace).containsKey("audience_summary");
    }

    @Test
    void ordinaryCompanyMembershipCannotBypassPlatformTrainingAuthorization() {
        doThrow(new PlatformAdminForbiddenException("Denied"))
            .when(platformAccess).require(actor.userId(), "PLATFORM_VIEW");

        assertThatThrownBy(() -> service.platformWorkspace(actor.userId()))
            .isInstanceOf(PlatformAdminForbiddenException.class);
        verifyNoInteractions(jdbc, distributorAccess);
    }
}
