package com.indice.erp.meetings;
import static org.assertj.core.api.Assertions.*;
import java.time.*;
import org.junit.jupiter.api.Test;
class MeetingAgreementPerformanceTest {
    @Test void deadlineUsesMeetingLocalDayAndIncludesItsLastMoment(){
        var due=LocalDate.of(2026,10,20);var zone=ZoneId.of("America/Toronto");var today=due.plusDays(1);
        assertThat(MeetingAgreementPerformanceService.outcome("DONE",due,"CREATED",Instant.parse("2026-10-21T03:59:59.999999Z"),zone,today)).isEqualTo("ON_TIME");
        assertThat(MeetingAgreementPerformanceService.outcome("DONE",due,"CREATED",Instant.parse("2026-10-21T04:00:00Z"),zone,today)).isEqualTo("LATE");
        assertThat(MeetingAgreementPerformanceService.outcome("OPEN",due,"CREATED",null,zone,due)).isEqualTo("UPCOMING");
        assertThat(MeetingAgreementPerformanceService.outcome("OPEN",due,"CREATED",null,zone,today)).isEqualTo("OVERDUE");
    }
    @Test void unknownHistoryAndCancellationCannotAcquireAnInventedScore(){
        var due=LocalDate.of(2026,10,20);var zone=ZoneOffset.UTC;
        assertThat(MeetingAgreementPerformanceService.outcome("DONE",due,"ADOPTED",Instant.now(),zone,due)).isEqualTo("UNRATED");
        assertThat(MeetingAgreementPerformanceService.outcome("DONE",due,"CREATED",null,zone,due)).isEqualTo("UNRATED");
        assertThat(MeetingAgreementPerformanceService.outcome("CANCELLED",due,"CREATED",null,zone,due)).isEqualTo("CANCELLED");
    }
}
