package com.indice.erp.meetings;

import static org.assertj.core.api.Assertions.*;
import static com.indice.erp.meetings.MeetingDtos.*;
import static com.indice.erp.meetings.MeetingPlanningDtos.*;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class MeetingRecurrencePlannerTest {
    private final MeetingRecurrencePlanner planner=new MeetingRecurrencePlanner();
    private PlanRequest plan(String time,String frequency,int count){var start=LocalDateTime.parse(time).atZone(ZoneId.of("America/Toronto")).toInstant();return new PlanRequest(new MeetingRequest("Synthetic","WORKING",start,start.plusSeconds(3600),"America/Toronto",1,List.of(),"","",null,"Purpose","Outcome",1L,30),new Recurrence(frequency,1,count),"",false);}
    @Test void weeklyKeepsLocalClockAcrossDst(){var p=planner.preview(plan("2026-10-25T09:00","WEEKLY",3));assertThat(p.occurrences()).allSatisfy(o->assertThat(o.startAt().atZone(ZoneId.of("America/Toronto")).getHour()).isEqualTo(9));assertThat(Duration.between(p.occurrences().get(0).startAt(),p.occurrences().get(1).startAt()).toHours()).isEqualTo(169);}
    @Test void monthlyAnchorsOriginalDayAndShowsClamp(){var p=planner.preview(plan("2027-01-31T09:00","MONTHLY",3));assertThat(p.monthlyClamp()).isTrue();assertThat(p.occurrences().stream().map(o->o.startAt().atZone(ZoneId.of(p.timezone())).getDayOfMonth())).containsExactly(31,28,31);}
    @Test void nonexistentLocalClockFailsInsteadOfSilentlyMoving(){assertThatThrownBy(()->planner.preview(plan("2027-03-07T02:30","WEEKLY",2))).isInstanceOf(MeetingPlanningException.class).hasMessage("meeting_time_gap");}
    @Test void fallOverlapUsesEarlierOffsetWithExplicitWarning(){var p=planner.preview(plan("2026-10-25T01:30","WEEKLY",2));assertThat(p.overlapUsesEarlierOffset()).isTrue();assertThat(p.occurrences().get(1).startAt()).isEqualTo(Instant.parse("2026-11-01T05:30:00Z"));}
    @Test void finiteBoundsRejectOversizedOrYearLongSeries(){assertThatThrownBy(()->planner.preview(plan("2026-10-08T09:00","MONTHLY",14))).hasMessage("meeting_recurrence_limit");assertThatThrownBy(()->planner.preview(plan("2026-10-08T09:00","DAILY",53))).hasMessage("meeting_recurrence_invalid");}
}
