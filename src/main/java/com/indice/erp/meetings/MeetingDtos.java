package com.indice.erp.meetings;

import jakarta.validation.constraints.*;
import java.time.*;
import java.util.List;

public final class MeetingDtos {
    private MeetingDtos() { }
    public record Member(long id,String name) { @Override public String toString(){return "Member[protected]";} }
    public record Directory(List<Member> items,long total) { }
    public record MeetingItem(long id,String title,String meetingType,String status,Instant startAt,Instant endAt,
        String timezone,long ownerId,String ownerName,int participantCount,boolean hasMinutes,long version) { @Override public String toString(){return "MeetingItem[protected]";} }
    public record AuditItem(String action,String actorName,String reason,Instant occurredAt) { @Override public String toString(){return "AuditItem[protected]";} }
    public record PlanningMetadata(String objective,String expectedResult,Member minutesOwner,int reminderMinutes,
        Long seriesId,Integer occurrenceNumber,boolean remindersPaused,long seriesVersion) { @Override public String toString(){return "PlanningMetadata[protected]";} }
    public record MeetingDetail(MeetingItem meeting,String agenda,String location,String minutes,String decisions,
        List<Member> participants,List<AuditItem> history,PlanningMetadata planning) { @Override public String toString(){return "MeetingDetail[protected]";} }
    public record MeetingChoice(long id,String title,List<Member> participants) { @Override public String toString(){return "MeetingChoice[protected]";} }
    public record AgreementItem(long id,long meetingId,String meetingTitle,String title,long assigneeId,
        String assigneeName,LocalDate dueDate,String status,String resolution,long version,long meetingOwnerId) { @Override public String toString(){return "AgreementItem[protected]";} }
    public record Page<T>(List<T> items,long total,int page,int pageSize) { @Override public String toString(){return "Page[total="+total+"]";} }
    public record Metrics(long planned,long inProgress,long completed,long cancelled,long awaitingClosure,
        long missingMinutes,long openAgreements,long overdueAgreements,Instant calculatedAt,String timezone) { }
    public record MeetingRequest(@NotBlank @Size(max=180) String title,@NotBlank String meetingType,
        @NotNull Instant startAt,@NotNull Instant endAt,@NotBlank @Size(max=80) String timezone,
        @Positive long ownerId,@NotNull @Size(max=100) List<@NotNull @Positive Long> participantIds,
        @NotNull @Size(max=10000) String agenda,@NotNull @Size(max=240) String location,Long expectedVersion,
        @Size(max=1000) String objective,@Size(max=1000) String expectedResult,@Positive Long minutesOwnerId,Integer reminderMinutes) {
        public MeetingRequest(String title,String meetingType,Instant startAt,Instant endAt,String timezone,long ownerId,List<Long> participantIds,String agenda,String location,Long expectedVersion){this(title,meetingType,startAt,endAt,timezone,ownerId,participantIds,agenda,location,expectedVersion,null,null,null,null);}
        @Override public String toString(){return "MeetingRequest[protected]";}
    }
    public record MinutesRequest(@NotNull @Size(max=20000) String minutes,
        @NotNull @Size(max=10000) String decisions,@Positive long expectedVersion) { @Override public String toString(){return "MinutesRequest[protected]";} }
    public record TransitionRequest(@NotBlank String status,@NotNull @Size(max=2000) String reason,
        @Positive long expectedVersion) { @Override public String toString(){return "TransitionRequest[protected]";} }
    public record AgreementRequest(@Positive long meetingId,@NotBlank @Size(max=240) String title,
        @Positive long assigneeId,@NotNull LocalDate dueDate) { @Override public String toString(){return "AgreementRequest[protected]";} }
}
