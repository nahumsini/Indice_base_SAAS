package com.indice.erp.platformadmin.leads;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.math.BigDecimal;
import java.util.List;
import static com.indice.erp.platformadmin.leads.PlatformLeadAnalyticsContracts.*;
import org.junit.jupiter.api.Test;

class PlatformLeadAnalyticsServiceTest {
    private final PlatformLeadAnalyticsRepository repository = mock(PlatformLeadAnalyticsRepository.class);
    private final PlatformAdminAccessService access = mock(PlatformAdminAccessService.class);
    private final PlatformLeadAnalyticsService service = new PlatformLeadAnalyticsService(repository, access,
        Clock.fixed(Instant.parse("2026-10-06T12:00:00Z"), ZoneOffset.UTC));

    @Test void permissionIsRequiredBeforeEveryReportingRead() {
        doThrow(new PlatformAdminForbiddenException("Denied")).when(access).require(7, "MANAGE_LEADS");
        assertThatThrownBy(() -> service.dashboard(7, 30, "all")).isInstanceOf(PlatformAdminForbiddenException.class);
        assertThatThrownBy(() -> service.details(7, 30, "all", "received", "", "", "", "", 1, 25))
            .isInstanceOf(PlatformAdminForbiddenException.class);
        verifyNoInteractions(repository);
    }

    @Test void datesFiltersAndPaginationAreBoundedBeforePersistence() {
        assertThatThrownBy(() -> service.dashboard(7, 365, "all")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.dashboard(7, 30, "US")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.details(7, 30, "all", "unknown", "", "", "", "", 1, 25)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.details(7, 30, "all", "received", "", "", "", "", 0, 25)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.details(7, 30, "all", "received", "", "", "", "", 1, 101)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.details(7, 30, "all", "received", "x".repeat(101), "", "", "", 1, 25)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository);
    }

    @Test void missingDenominatorsRemainUnavailableRatherThanZeroPercent() {
        assertThat(PlatformLeadAnalyticsRepository.rate(0, 0)).isNull();
        assertThat(PlatformLeadAnalyticsRepository.rate(0, 5)).isEqualByComparingTo("0.00");
        assertThat(PlatformLeadAnalyticsRepository.rate(1, 3)).isEqualByComparingTo("33.33");
    }

    @Test void dashboardUsesTheUtcIntakeCohortButAttentionUsesAllDates() {
        var from = Instant.parse("2026-09-07T00:00:00Z");
        var now = Instant.parse("2026-10-06T12:00:00Z");
        when(repository.totals(from, now, "MX")).thenReturn(new Totals(3, 1, 1, 1, 0, 1, 1, 1, 0, 2, 1, new BigDecimal("2.00")));
        when(repository.attention(now, "MX")).thenReturn(new Attention(9, 2, 1, 2, 0, 1));
        when(repository.breakdown(from, now, "MX", false)).thenReturn(List.of());
        when(repository.breakdown(from, now, "MX", true)).thenReturn(List.of());
        var result = service.dashboard(7, 30, "MX");
        assertThat(result.period().from().toString()).isEqualTo("2026-09-07");
        assertThat(result.rates().contactSla()).isEqualByComparingTo("50.00");
        assertThat(result.rates().diagnosis()).isEqualByComparingTo("33.33");
        assertThat(result.rates().proposalWin()).isEqualByComparingTo("100.00");
        assertThat(result.stages()).extracting(Stage::code).containsExactly("received", "contacted", "scheduled", "diagnosed", "proposal", "won");
        assertThat(result.attention().overdue()).isEqualTo(9);
        verify(repository).attention(now, "MX");
    }

    @Test void detailsRetainTheCompleteTotalAndReportCurrentBacklogScope() {
        when(repository.details(any(), any(), eq("CA"), eq("overdue"), eq(""), eq(""), eq(""), eq(""), eq(9), eq(25)))
            .thenReturn(new PlatformLeadAnalyticsRepository.DetailResult(List.of(), 205));
        var result = service.details(7, 30, "CA", "overdue", "", "", "", "", 9, 25);
        assertThat(result.currentBacklog()).isTrue();
        assertThat(result.total()).isEqualTo(205);
        assertThat(result.totalPages()).isEqualTo(9);
        assertThat(result.pageSize()).isEqualTo(25);
    }
}
