package com.indice.erp.hr.announcements;

import com.indice.erp.hr.HrOperationalScope;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrAnnouncementScopeServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrAnnouncementTargetRepository targetRepository;

    @Test
    void unitScopedManagerCanManageOnlyOwnUnitAudience() {
        var service = new HrAnnouncementScopeService(jdbcTemplate, targetRepository);
        var actor = actor(4L, null);

        assertDoesNotThrow(() -> service.requireAudienceManageable(
            actor,
            "units",
            Map.of("unit", List.of("4"))
        ));

        assertThrows(HrAnnouncementApiException.class, () -> service.requireAudienceManageable(
            actor,
            "all",
            Map.of()
        ));
        assertThrows(HrAnnouncementApiException.class, () -> service.requireAudienceManageable(
            actor,
            "departments",
            Map.of("department", List.of("Operations"))
        ));
        assertThrows(HrAnnouncementApiException.class, () -> service.requireAudienceManageable(
            actor,
            "units",
            Map.of("unit", List.of("5"))
        ));
    }

    @Test
    void filterManageableKeepsOnlyAnnouncementsInsideScope() {
        var service = new HrAnnouncementScopeService(jdbcTemplate, targetRepository);
        var actor = actor(4L, null);
        var global = row(10L, "all");
        var scopedUnit = row(11L, "units");
        when(targetRepository.loadByAnnouncement(1L, List.of(10L, 11L))).thenReturn(Map.of(
            11L,
            List.of(new HrAnnouncementTargetRow(11L, "unit", "4"))
        ));

        var result = service.filterManageable(actor, List.of(global, scopedUnit));

        assertEquals(List.of(scopedUnit), result);
    }

    @Test
    void adminActorUsesUnitScopeEvenWhenAssignedToBusiness() {
        var actor = actor(4L, 9L);

        var scope = actor.operationalScope();

        assertEquals(HrOperationalScope.Type.UNIT_HEADQUARTERS, scope.type());
        assertEquals(4L, scope.unitId());
        assertNull(scope.businessId());
    }

    private HrAnnouncementActor actor(Long unitId, Long businessId) {
        return new HrAnnouncementActor(
            7L,
            1L,
            20L,
            "Scoped Manager",
            "admin",
            unitId,
            businessId,
            "Operations",
            List.of("human_resources"),
            true
        );
    }

    private HrAnnouncementRow row(long id, String audienceType) {
        return new HrAnnouncementRow(
            id,
            "Announcement " + id,
            "general",
            audienceType,
            "draft",
            null,
            null,
            LocalDateTime.parse("2026-05-01T09:00:00"),
            "Body",
            "Author"
        );
    }
}
