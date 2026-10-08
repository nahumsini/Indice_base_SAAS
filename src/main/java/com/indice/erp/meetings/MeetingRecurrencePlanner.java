package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingPlanningDtos.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

/** Finite wall-clock recurrence; the backend preview and committed series use this same planner. */
@Component
public class MeetingRecurrencePlanner {
    public PlanPreview preview(PlanRequest request) {
        var meeting=request.meeting();var zone=ZoneId.of(meeting.timezone());
        var anchor=meeting.startAt().atZone(zone).toLocalDateTime();
        long duration=Duration.between(meeting.startAt(),meeting.endAt()).getSeconds();
        if(duration<60||duration>12*3600)throw new MeetingPlanningException("meeting_duration_invalid");
        var rule=request.recurrence();int count=rule==null?1:rule.count();
        if(count<1||count>52||rule!=null&&(rule.interval()<1||rule.interval()>12||!Set.of("DAILY","WEEKLY","MONTHLY").contains(rule.frequency())))throw new MeetingPlanningException("meeting_recurrence_invalid");
        var result=new ArrayList<Occurrence>();boolean clamp=false,overlap=false;
        for(int i=0;i<count;i++) {
            var local=rule==null?anchor:switch(rule.frequency()) {
                case "DAILY"->anchor.plusDays((long)i*rule.interval());
                case "WEEKLY"->anchor.plusWeeks((long)i*rule.interval());
                case "MONTHLY"->anchor.plusMonths((long)i*rule.interval());
                default->throw new MeetingPlanningException("meeting_recurrence_invalid");
            };
            if(local.toLocalDate().isAfter(anchor.toLocalDate().plusDays(366)))throw new MeetingPlanningException("meeting_recurrence_limit");
            var offsets=zone.getRules().getValidOffsets(local);
            if(offsets.isEmpty())throw new MeetingPlanningException("meeting_time_gap");
            overlap|=offsets.size()>1;clamp|=rule!=null&&rule.frequency().equals("MONTHLY")&&local.getDayOfMonth()!=anchor.getDayOfMonth();
            // Keep the user's explicit first instant; subsequent overlap dates use the earlier offset.
            var start=i==0?meeting.startAt():local.toInstant(offsets.getFirst());
            result.add(new Occurrence(i+1,start,start.plusSeconds(duration),0));
        }
        return new PlanPreview(List.copyOf(result),count,zone.getId(),clamp,overlap);
    }
}
