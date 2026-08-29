package com.indice.erp.systemticket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.notifications.AppNotificationService;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Assignee;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.AssignRequest;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Filters;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.MessageRequest;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SystemTicketOperationsServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-27T18:00:00Z");

    @Mock private SystemTicketOperationsRepository repository;
    @Mock private SystemTicketAttachmentService attachments;
    @Mock private DistributorPortfolioAccessPolicy distributorAccess;
    @Mock private PlatformAdminAccessService platformAccess;
    @Mock private AppNotificationService notifications;

    private SystemTicketOperationsService service;

    @BeforeEach
    void setUp() {
        service = new SystemTicketOperationsService(
            repository, attachments, distributorAccess, platformAccess, notifications,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void rootQueueSeparatesOperationalSummaryFromActiveFilters() {
        var overdue = ticket(7L, null, "OPEN", "CRITICAL", true, NOW.minusSeconds(3600), null);
        var resolved = ticket(8L, 99L, "RESOLVED", "MEDIUM", false, NOW.plusSeconds(3600), NOW);
        given(repository.listTickets(null)).willReturn(List.of(overdue, resolved));
        given(repository.listAssignees()).willReturn(List.of());
        given(repository.listAvailableModuleNames()).willReturn(List.of("Punto de Venta", "Recursos Humanos"));

        var workspace = service.listForPlatform(
            99L,
            new Filters("", "ACTIVE", "ALL", "ALL", "UNASSIGNED", "", "", true, null, null)
        );

        assertThat(workspace.tickets()).containsExactly(overdue);
        assertThat(workspace.summary().total()).isEqualTo(2);
        assertThat(workspace.summary().overdue()).isEqualTo(1);
        assertThat(workspace.summary().completed()).isEqualTo(1);
        assertThat(workspace.modules()).containsExactly("Inventarios", "Punto de Venta", "Recursos Humanos");
        verify(platformAccess).require(99L, "SYSTEM_TICKETS_MANAGE");
    }

    @Test
    void assigningAnOpenTicketStartsItsReviewAndKeepsTraceability() {
        var open = ticket(7L, null, "OPEN", "HIGH", false, NOW.plusSeconds(3600), null);
        var assigned = ticket(7L, 99L, "IN_REVIEW", "HIGH", false, NOW.plusSeconds(3600), null);
        given(repository.findTicket(7L, null)).willReturn(open, assigned);
        given(repository.listAssignees()).willReturn(List.of(new Assignee(99L, "Root Support", "root@indice.app")));

        var result = service.assignFromPlatform(99L, 7L, new AssignRequest(99L));

        assertThat(result.assigned_to_user_id()).isEqualTo(99L);
        assertThat(result.status()).isEqualTo("IN_REVIEW");
        verify(repository).assign(7L, 99L, 99L, "IN_REVIEW");
        verify(repository).addEvent(
            7L, 99L, "ASSIGNED", "PUBLIC", "OPEN", "IN_REVIEW", "Responsable: Root Support"
        );
    }

    @Test
    void distributorReplyIsTenantScopedAndReactivatesWaitingTicket() {
        var actor = new AuthSessionUser(11L, 31L, 41L, "Distributor", "owner");
        var waiting = ticket(7L, 99L, "WAITING_ON_REPORTER", "HIGH", false, NOW.plusSeconds(3600), null);
        var inReview = ticket(7L, 99L, "IN_REVIEW", "HIGH", false, NOW.plusSeconds(3600), null);
        given(distributorAccess.requireDistributor(actor))
            .willReturn(new DistributorPortfolioAccessPolicy.DistributorIdentity(31L, "Aliado Norte"));
        given(repository.findTicket(7L, 31L)).willReturn(waiting, inReview);
        given(repository.listEvents(7L, true)).willReturn(List.of());
        given(attachments.list(inReview)).willReturn(List.of());

        var detail = service.addMessageFromDistributor(
            actor, 7L, new MessageRequest("Adjunto los pasos para reproducirlo.", "PUBLIC")
        );

        assertThat(detail.ticket().status()).isEqualTo("IN_REVIEW");
        verify(repository).acknowledgeReporterMessage(7L, 31L, 11L, "IN_REVIEW", false);
        verify(repository).addEvent(
            7L, 11L, "PUBLIC_MESSAGE", "PUBLIC", "WAITING_ON_REPORTER", "IN_REVIEW",
            "Adjunto los pasos para reproducirlo."
        );
    }

    private Ticket ticket(
        long id,
        Long assigneeId,
        String status,
        String priority,
        boolean overdue,
        Instant target,
        Instant resolvedAt
    ) {
        return new Ticket(
            id, "SYS-20260827-" + id, 31L, "Aliado Norte", 11L,
            "Distribuidor", "distribuidor@example.com", assigneeId,
            assigneeId == null ? null : "Root Support", assigneeId == null ? null : "root@indice.app",
            "FAILURE", priority, "Inventarios", "No carga inventario",
            "La tabla queda vacía al consultar.", status, null, null, target,
            0, overdue, 60L, resolvedAt, NOW.minusSeconds(7200), NOW.minusSeconds(60)
        );
    }
}
