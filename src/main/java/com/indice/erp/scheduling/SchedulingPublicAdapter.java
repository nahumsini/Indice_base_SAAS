package com.indice.erp.scheduling;

import static com.indice.erp.scheduling.SchedulingDtos.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.kiosk.engine.*;
import jakarta.validation.Validator;
import java.time.Clock;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** The public booking boundary exposes published configuration, never private participant records. */
@Component
public class SchedulingPublicAdapter implements KioskModuleAdapter {
    private static final TypeReference<Map<String,Object>> MAP = new TypeReference<>() { };
    private final SchedulingRepository repository;
    private final SchedulingBookingService booking;
    private final ModuleAccessService modules;
    private final ObjectMapper mapper;
    private final Validator validator;
    private final Clock clock;

    public SchedulingPublicAdapter(SchedulingRepository repository,SchedulingBookingService booking,
        ModuleAccessService modules,ObjectMapper mapper,Validator validator,Clock clock) {
        this.repository=repository;this.booking=booking;this.modules=modules;
        this.mapper=mapper;this.validator=validator;this.clock=clock;
    }
    public static Set<KioskCapabilityDescriptor> descriptors() {
        return Set.of(
            new KioskCapabilityDescriptor("scheduling.page.read",1,"SCHEDULING",KioskOperationPolicy.INFORMATION_ONLY,KioskAccessLevel.PUBLIC,false,false),
            new KioskCapabilityDescriptor("scheduling.slots.read",1,"SCHEDULING",KioskOperationPolicy.INFORMATION_ONLY,KioskAccessLevel.PUBLIC,false,false),
            new KioskCapabilityDescriptor("scheduling.reservation.request",1,"SCHEDULING",KioskOperationPolicy.REVIEW_REQUIRED,KioskAccessLevel.PUBLIC,true,true));
    }
    @Override public String ownerModule(){return "SCHEDULING";}
    @Override public Set<KioskCapabilityDescriptor> capabilities(){return descriptors();}
    @Override public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition){
        return definition!=null&&"booking_page".equals(definition.kioskType())?descriptors():Set.of();
    }
    @Override public Map<String,Object> bootstrap(KioskExecutionContext context){
        long company=definition(context).companyId();var page=repository.page(company).orElseThrow(KioskUnavailableException::new);
        var members=repository.activeStaff(company);
        var staff=members.stream().map(s->new PublicStaff(s.id(),s.publicName(),s.timezone())).toList();
        var staffIds=staff.stream().map(PublicStaff::id).toList();
        var services=repository.services(company).stream().filter(ServiceItem::active)
            .map(s->new PublicService(s.id(),s.name(),s.description(),s.durationMinutes(),s.noticeHours())).toList();
        var events=repository.publicEvents(company,clock.instant()).stream().filter(e->staffIds.contains(e.staffId()))
            .map(e->new PublicEvent(e.id(),e.staffId(),e.title(),e.description(),e.startAt(),e.durationMinutes(),
                Math.max(0,e.capacity()-(int)e.confirmedCount()))).toList();
        return mapper.convertValue(new PublicWorkspace("",page.title(),page.description(),services,staff,events,page.appearance()),MAP);
    }
    @Override public KioskAuthorization authorize(KioskExecutionContext context,KioskActionRequest request){
        definition(context);
        return request.resourceId()==null&&descriptors().stream().anyMatch(d->d.versionedKey().equals(request.versionedCapabilityKey()))
            ?KioskAuthorization.allow():KioskAuthorization.deny("Booking capability unavailable.");
    }
    @Override public KioskValidationResult validate(KioskExecutionContext context,KioskActionRequest request){
        try {
            Object payload;
            Set<String> fields;
            switch(request.capabilityKey()) {
                case "scheduling.slots.read" -> {
                    fields=Set.of("serviceId","staffId","date");payload=mapper.convertValue(request.payload(),SlotRequest.class);
                }
                case "scheduling.reservation.request" -> {
                    fields=Set.of("serviceId","eventId","staffId","startAt","attendeeName","attendeeEmail","attendeeCompany","attendeePhone","contactConsent");
                    payload=mapper.convertValue(request.payload(),ReservationRequest.class);
                }
                case "scheduling.page.read" -> {return request.payload().isEmpty()?KioskValidationResult.success():KioskValidationResult.invalid("Invalid booking request.");}
                default -> {return KioskValidationResult.invalid("Unsupported booking request.");}
            }
            return fields.containsAll(request.payload().keySet())&&validator.validate(payload).isEmpty()
                ?KioskValidationResult.success():KioskValidationResult.invalid("Check the booking fields.");
        } catch(IllegalArgumentException invalid) {return KioskValidationResult.invalid("Check the booking fields.");}
    }
    @Override public Map<String,Object> execute(KioskExecutionContext context,KioskActionRequest request){
        var definition=definition(context);
        return switch(request.capabilityKey()) {
            case "scheduling.page.read" -> bootstrap(context);
            case "scheduling.slots.read" -> mapper.convertValue(booking.slots(definition.companyId(),
                mapper.convertValue(request.payload(),SlotRequest.class)),MAP);
            case "scheduling.reservation.request" -> {
                booking.requestPublic(definition.companyId(),definition.legacyReferenceId(),
                    mapper.convertValue(request.payload(),ReservationRequest.class));
                // Do not disclose an existing attendee's reference/status to an unverified email sender.
                yield Map.of("status","REQUESTED","submissionPolicy","REVIEW_REQUIRED");
            }
            default -> throw new IllegalArgumentException("Unsupported booking request.");
        };
    }
    private KioskResolvedDefinition definition(KioskExecutionContext context) {
        var d=context.definition();
        if(d==null||!KioskExecutionChannels.PUBLIC_LINK.equals(context.channel())||!"SCHEDULING".equals(d.ownerModule())
            ||!"booking_page".equals(d.kioskType())||d.legacyReferenceId()==null||!d.status().operational()
            ||!modules.companyCanAccess(d.companyId(),"scheduling"))throw new KioskUnavailableException();
        var page=repository.page(d.companyId()).orElseThrow(KioskUnavailableException::new);
        if(!page.published()||page.id()!=d.legacyReferenceId())throw new KioskUnavailableException();
        return d;
    }
}
