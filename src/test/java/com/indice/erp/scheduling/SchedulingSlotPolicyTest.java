package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import static org.assertj.core.api.Assertions.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class SchedulingSlotPolicyTest {
    private ServiceItem service(int duration,int buffer,int notice){return new ServiceItem(1,"Test","",duration,buffer,notice,true,1);}
    private StaffItem staff(String zone,int day,String start,String end){return new StaffItem(1,1,"Test",zone,true,1,
        List.of(new AvailabilityDay(day,LocalTime.parse(start),LocalTime.parse(end))));}
    @Test void durationAndBufferMustFitWithoutMidnightWraparound(){
        var starts=SchedulingSlotPolicy.candidates(service(60,15,0),staff("UTC",2,"09:00","10:30"),LocalDate.parse("2026-10-06"),Instant.parse("2026-10-05T00:00:00Z"));
        assertThat(starts).containsExactly(Instant.parse("2026-10-06T09:00:00Z"),Instant.parse("2026-10-06T09:15:00Z"));
        assertThat(SchedulingSlotPolicy.candidates(service(180,0,0),staff("UTC",2,"22:00","23:59"),LocalDate.parse("2026-10-06"),Instant.parse("2026-10-05T00:00:00Z"))).isEmpty();
    }
    @Test void noticeAndExplicitAvailabilityFailClosed(){
        assertThat(SchedulingSlotPolicy.candidates(service(30,0,24),staff("UTC",2,"09:00","10:00"),LocalDate.parse("2026-10-06"),Instant.parse("2026-10-05T09:30:00Z")))
            .containsExactly(Instant.parse("2026-10-06T09:30:00Z"));
        assertThat(SchedulingSlotPolicy.candidates(service(30,0,0),staff("UTC",1,"09:00","10:00"),LocalDate.parse("2026-10-06"),Instant.parse("2026-10-05T00:00:00Z"))).isEmpty();
        assertThatThrownBy(()->SchedulingSlotPolicy.candidates(service(30,0,0),staff("UTC",1,"09:00","10:00"),LocalDate.parse("2027-10-06"),Instant.parse("2026-10-05T00:00:00Z"))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void ambiguousAndMissingDstTimesAreNotOffered(){
        assertThat(SchedulingSlotPolicy.candidates(service(30,0,0),staff("America/Toronto",7,"01:00","02:00"),LocalDate.parse("2026-11-01"),Instant.parse("2026-10-31T00:00:00Z"))).isEmpty();
        assertThat(SchedulingSlotPolicy.candidates(service(30,0,0),staff("America/Toronto",7,"02:00","03:00"),LocalDate.parse("2027-03-14"),Instant.parse("2027-03-13T00:00:00Z"))).isEmpty();
    }
    @Test void terminalStatesAndAttendanceAndCancellationAreGuarded(){
        var now=Instant.parse("2026-10-06T10:00:00Z");
        assertThatThrownBy(()->SchedulingSlotPolicy.transition("COMPLETED","CONFIRMED",now,now,"")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->SchedulingSlotPolicy.transition("CONFIRMED","NO_SHOW",now.plusSeconds(60),now,"")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->SchedulingSlotPolicy.transition("REQUESTED","CANCELLED",now,now,"")).isInstanceOf(IllegalArgumentException.class);
        assertThatCode(()->SchedulingSlotPolicy.transition("REQUESTED","CONFIRMED",now,now,"")).doesNotThrowAnyException();
    }
}
