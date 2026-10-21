package com.indice.erp.scheduling;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public final class SchedulingDtos {
    private SchedulingDtos() { }
    public record ServiceRequest(@NotBlank @Size(max=180) String name,
        @Size(max=1500) String description, @Min(15) @Max(180) int durationMinutes,
        @Min(0) @Max(60) int bufferMinutes, @Min(0) @Max(720) int noticeHours,
        boolean active, Long version, @Positive Long productId, @Size(max=28) List<@Valid AvailabilityDay> days) {
        public ServiceRequest(String name,String description,int durationMinutes,int bufferMinutes,int noticeHours,boolean active,Long version){this(name,description,durationMinutes,bufferMinutes,noticeHours,active,version,null,null);}
    }
    public record ServiceItem(long id, String name, String description, int durationMinutes,
        int bufferMinutes, int noticeHours, boolean active, long version, Long productId,List<AvailabilityDay> days) {
        public ServiceItem(long id,String name,String description,int durationMinutes,int bufferMinutes,int noticeHours,boolean active,long version){this(id,name,description,durationMinutes,bufferMinutes,noticeHours,active,version,null,List.of());}
    }
    public record AvailabilityDay(@Min(1) @Max(7) int dayOfWeek,
        @NotNull LocalTime startTime, @NotNull LocalTime endTime) { }
    public record StaffRequest(@Positive long userId, @NotBlank @Size(max=180) String publicName,
        @NotBlank @Size(max=80) String timezone, boolean active,
        @NotNull @Size(max=28) List<@Valid AvailabilityDay> days, Long version,
        @Size(max=366) List<@NotNull LocalDate> unavailableDates,@Size(max=500) List<@NotNull @Positive Long> serviceIds, @Min(0) @Max(120) Integer bufferMinutes) {
        public StaffRequest(long userId,String publicName,String timezone,boolean active,List<AvailabilityDay> days,Long version,List<LocalDate> unavailableDates,List<Long> serviceIds){this(userId,publicName,timezone,active,days,version,unavailableDates,serviceIds,null);}
        public StaffRequest(long userId,String publicName,String timezone,boolean active,List<AvailabilityDay> days,Long version){this(userId,publicName,timezone,active,days,version,null,null);}
    }
    public record StaffItem(long id, long userId, String publicName, String timezone,
        boolean active, long version, List<AvailabilityDay> days,List<LocalDate> unavailableDates,List<Long> serviceIds,int bufferMinutes) {
        public StaffItem(long id,long userId,String publicName,String timezone,boolean active,long version,List<AvailabilityDay> days,List<LocalDate> unavailableDates,List<Long> serviceIds){this(id,userId,publicName,timezone,active,version,days,unavailableDates,serviceIds,0);}
        public StaffItem(long id,long userId,String publicName,String timezone,boolean active,long version,List<AvailabilityDay> days){this(id,userId,publicName,timezone,active,version,days,List.of(),List.of());}
    }
    public record MemberItem(long id, String name) { }
    public record PageAppearance(@Size(max=120) String brandName,
        @NotNull @Pattern(regexp="#[a-fA-F0-9]{6}") String accentColor,
        @NotNull @Pattern(regexp="#[a-fA-F0-9]{6}") String surfaceColor,
        @Size(max=80) String buttonLabel, @NotNull @Pattern(regexp="cards|compact") String layout) {
        public static PageAppearance defaults(){return new PageAppearance("","#2563EB","#F8FAFC","","cards");}
    }
    public record PageRequest(@NotBlank @Pattern(regexp="[a-z0-9][a-z0-9-]{2,79}") String alias,
        @NotBlank @Size(max=180) String title, @Size(max=1500) String description,
        boolean published, Long version, @Valid PageAppearance appearance) {
        public PageRequest(String alias,String title,String description,boolean published,Long version){this(alias,title,description,published,version,null);}
    }
    public record PageItem(long id, String alias, String title, String description,
        boolean published, long version, String publicUrl, PageAppearance appearance) { }
    public record EventRequest(@Positive long staffId, @NotBlank @Size(max=180) String title,
        @Size(max=1500) String description, @NotNull Instant startAt,
        @Min(15) @Max(180) int durationMinutes, @Min(1) @Max(1000) int capacity,
        boolean published, Long version,@Size(max=240) String location) {
        public EventRequest(long staffId,String title,String description,Instant startAt,int durationMinutes,int capacity,boolean published,Long version){this(staffId,title,description,startAt,durationMinutes,capacity,published,version,null);}
    }
    public record EventItem(long id, long staffId, String title, String description, Instant startAt,
        int durationMinutes, int capacity, long confirmedCount, boolean published,
        String status, long version, long activeParticipantCount,String location) { }
    public record ReservationRequest(Long serviceId, Long eventId, @Positive long staffId,
        @NotNull Instant startAt, @NotBlank @Size(max=180) String attendeeName,
        @NotBlank @Email @Size(max=240) String attendeeEmail,
        @Size(max=180) String attendeeCompany, @Size(max=40) String attendeePhone,
        @AssertTrue boolean contactConsent,@com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL) @Positive Long clientId) {
        public ReservationRequest(Long serviceId,Long eventId,long staffId,Instant startAt,String attendeeName,String attendeeEmail,String attendeeCompany,String attendeePhone,boolean contactConsent){this(serviceId,eventId,staffId,startAt,attendeeName,attendeeEmail,attendeeCompany,attendeePhone,contactConsent,null);}
    }
    public record ReservationItem(long id, String reference, long staffId, Long serviceId,
        Long eventId, String serviceName, String staffName, String attendeeName, String attendeeEmail,
        String attendeeCompany, String attendeePhone, Instant startAt, int durationMinutes, String status, long version,
        String pausedFromStatus, Instant archivedAt,Long clientId) {
        ReservationItem at(Instant start) { return new ReservationItem(id,reference,staffId,serviceId,eventId,
            serviceName,staffName,attendeeName,attendeeEmail,attendeeCompany,attendeePhone,start,durationMinutes,
            status,version,pausedFromStatus,archivedAt,clientId); }
    }
    public record RescheduleRequest(@NotNull Instant startAt,@NotBlank @Size(max=500) String reason,@Positive long version) { }
    public record ReassignRequest(@Positive long staffId,@NotBlank @Size(max=500) String reason,@Positive long version) { }
    public record ManageRequest(@NotBlank @Pattern(regexp="PAUSE|RESUME|ARCHIVE") String action,
        @NotBlank @Size(max=500) String reason,@Positive long version) { }
    public record TransitionRequest(@NotBlank String status, @Size(max=500) String reason,
        @Positive long version) { }
    public record SlotRequest(@Positive long serviceId, @Positive long staffId, @NotNull LocalDate date) { }
    public record SlotResponse(String timezone, List<Instant> starts) { }
    public record Submission(String reference, String status, String submissionPolicy) { }
    public record PublicStaff(long id, String publicName, String timezone,List<Long> serviceIds) {
        public PublicStaff(long id,String publicName,String timezone){this(id,publicName,timezone,List.of());}
    }
    public record StaffOption(long id,String publicName,String timezone,boolean active) { }
    public record PublicService(long id,String name,String description,int durationMinutes,int noticeHours) { }
    public record PublicEvent(long id,long staffId,String title,String description,Instant startAt,
        int durationMinutes,int availablePlaces,String location) {
        public PublicEvent(long id,long staffId,String title,String description,Instant startAt,int durationMinutes,int availablePlaces){this(id,staffId,title,description,startAt,durationMinutes,availablePlaces,"");}
    }
    public record AuditEntry(String action,String reason,Instant occurredAt,Instant previousStartAt,Instant nextStartAt) { }
    public record PublicWorkspace(String companyName, String title, String description,
        List<PublicService> services, List<PublicStaff> staff, List<PublicEvent> events, PageAppearance appearance,boolean clientSelectionEnabled) {
        public PublicWorkspace(String companyName,String title,String description,List<PublicService> services,List<PublicStaff> staff,List<PublicEvent> events){this(companyName,title,description,services,staff,events,PageAppearance.defaults(),false);}
        public PublicWorkspace(String companyName,String title,String description,List<PublicService> services,List<PublicStaff> staff,List<PublicEvent> events,PageAppearance appearance){this(companyName,title,description,services,staff,events,appearance,false);}
    }
    public record Readiness(boolean publicAccessEnabled,String companyName,String suggestedAlias,boolean bookingReady) { }
    public record Metrics(long requests, long confirmed, long completed, long noShow,
        long cancelled, Double attendanceRate) { }
    public record ReservationPage(List<ReservationItem> items, long total, int page, int pageSize) { }
    public record CalendarWorkspace(List<ReservationItem> items,long total,List<EventItem> events,long eventsTotal) { }
}
