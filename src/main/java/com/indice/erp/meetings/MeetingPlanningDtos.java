package com.indice.erp.meetings;

import com.indice.erp.meetings.MeetingDtos.MeetingRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MeetingPlanningDtos {
    private MeetingPlanningDtos() { }
    public record Recurrence(@NotBlank String frequency,@Min(1) @Max(12) int interval,@Min(1) @Max(52) int count) { }
    public record PlanRequest(@NotNull @Valid MeetingRequest meeting,@Valid Recurrence recurrence,@Size(max=120) String saveFlowName,boolean allowConflicts) {
        @Override public String toString(){return "PlanRequest[protected]";}
    }
    public record Occurrence(int number,Instant startAt,Instant endAt,int conflicts) { }
    public record PlanPreview(List<Occurrence> occurrences,int count,String timezone,boolean monthlyClamp,boolean overlapUsesEarlierOffset) { @Override public String toString(){return "PlanPreview[count="+count+"]";} }
    public record PlanResult(long firstMeetingId,Long seriesId,int count,Long flowId) { }
    public record FlowSettings(String title,String meetingType,String objective,String expectedResult,long ownerId,
        long minutesOwnerId,List<Long> participantIds,String agenda,String location,int durationMinutes,int reminderMinutes) {
        @Override public String toString(){return "FlowSettings[protected]";}
    }
    public record FlowItem(long id,String name,FlowSettings settings,long version) {
        @Override public String toString(){return "FlowItem[protected]";}
    }
    public record SeriesItem(long id,String title,String frequency,int interval,int count,String timezone,
        boolean remindersPaused,String status,long version,Instant nextAt,int futurePlanned) {
        @Override public String toString(){return "SeriesItem[protected]";}
    }
    public record SeriesCommand(@NotBlank String action,@NotNull @Size(max=2000) String reason,@Positive long expectedVersion) {
        @Override public String toString(){return "SeriesCommand[protected]";}
    }
    public record FutureEdit(@NotNull @Valid MeetingRequest meeting,@Positive long expectedSeriesVersion) {
        @Override public String toString(){return "FutureEdit[protected]";}
    }
    public record FlowArchive(@Positive long expectedVersion) { }
}
