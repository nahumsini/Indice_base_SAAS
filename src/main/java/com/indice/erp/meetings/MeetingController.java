package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiresModuleAccess("control_minutas")
public class MeetingController {
    private final MeetingAccessService access;
    private final MeetingRepository repository;
    private final MeetingService service;
    public MeetingController(MeetingAccessService access,MeetingRepository repository,MeetingService service){this.access=access;this.repository=repository;this.service=service;}
    @GetMapping("/members") public Directory members(HttpSession s){return repository.members(access.require(s,List.of("meetings"),null,false).companyId());}
    @GetMapping("/agreement-meetings") public List<MeetingChoice> choices(HttpSession s){return repository.choices(access.require(s,List.of("agreements"),null,false));}
    @GetMapping("/agreement-assignees") public Directory assignees(HttpSession s){return repository.assignees(access.require(s,List.of("agreements"),null,false));}
    @GetMapping public Page<MeetingItem> list(HttpSession s,@RequestParam Instant from,@RequestParam Instant to,
        @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String status,
        @RequestParam(defaultValue="") String attention,@RequestParam(defaultValue="0")long ownerId,
        @RequestParam(defaultValue="start")String sort,@RequestParam(defaultValue="asc")String direction,
        @RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="25") int pageSize){
        range(from,to);filters(search,status,page,pageSize,false);
        if(ownerId<0)throw new IllegalArgumentException();
        return repository.meetings(access.require(s,List.of("meetings"),null,false),from,to,search.trim(),status,attention,ownerId,sort,direction,page,pageSize);
    }
    @GetMapping("/calendar") public Page<MeetingItem> calendar(HttpSession s,@RequestParam Instant from,@RequestParam Instant to,
        @RequestParam(defaultValue="") String search,@RequestParam(defaultValue="") String status,
        @RequestParam(defaultValue="")String attention,@RequestParam(defaultValue="0")long ownerId){
        range(from,to);if(to.isAfter(from.plusSeconds(43*86400L)))throw new IllegalArgumentException();filters(search,status,1,25,false);
        if(ownerId<0)throw new IllegalArgumentException();
        return repository.meetings(access.require(s,List.of("meetings"),null,false),from,to,search.trim(),status,attention,ownerId,"start","asc",1,1000);
    }
    @GetMapping("/{id}") public MeetingDetail detail(HttpSession s,@PathVariable long id){return repository.detail(access.require(s,List.of("meetings"),null,false),id);}
    @PostMapping public MeetingDetail create(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody MeetingRequest body){return service.create(access.require(s,List.of("meetings"),token,true),body,key);}
    @PutMapping("/{id}") public MeetingDetail edit(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody MeetingRequest body){return service.edit(access.require(s,List.of("meetings"),token,true),id,body);}
    @PutMapping("/{id}/minutes") public MeetingDetail minutes(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody MinutesRequest body){return service.minutes(access.require(s,List.of("meetings"),token,true),id,body);}
    @PostMapping("/{id}/status") public MeetingDetail status(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody TransitionRequest body){return service.transition(access.require(s,List.of("meetings"),token,true),id,body);}
    @GetMapping("/agreements") public Page<AgreementItem> agreements(HttpSession s,@RequestParam LocalDate from,@RequestParam LocalDate to,
        @RequestParam(defaultValue="")String search,@RequestParam(defaultValue="")String status,
        @RequestParam(defaultValue="")String attention,@RequestParam(defaultValue="0")long assigneeId,
        @RequestParam(defaultValue="due")String sort,@RequestParam(defaultValue="asc")String direction,@RequestParam(defaultValue="UTC")String timezone,
        @RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="25")int pageSize){
        if(!from.isBefore(to)||to.isAfter(from.plusDays(366)))throw new IllegalArgumentException();filters(search,status,page,pageSize,true);
        if(assigneeId<0)throw new IllegalArgumentException();
        return repository.agreements(access.require(s,List.of("agreements"),null,false),from,to,search.trim(),status,attention,assigneeId,sort,direction,LocalDate.now(ZoneId.of(timezone)),page,pageSize);
    }
    @PostMapping("/agreements") public AgreementItem agreement(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody AgreementRequest body){return service.agreement(access.require(s,List.of("agreements"),token,true),body,key);}
    @PostMapping("/agreements/{id}/status") public AgreementItem agreementStatus(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,
        @PathVariable long id,@Valid @RequestBody TransitionRequest body){return service.agreementStatus(access.require(s,List.of("agreements"),token,true),id,body);}
    @GetMapping("/metrics") public Metrics metrics(HttpSession s,@RequestParam Instant from,@RequestParam Instant to,@RequestParam String timezone){
        range(from,to);return repository.metrics(access.require(s,List.of("indicators"),null,false),from,to,ZoneId.of(timezone));
    }
    static void range(Instant from,Instant to){if(!from.isBefore(to)||to.isAfter(from.plusSeconds(366*86400L)))throw new IllegalArgumentException();}
    private static void filters(String search,String status,int page,int size,boolean agreement){
        if(search.length()>180||page<1||page>10000||!Set.of(10,25,50,100,200).contains(size)||!status.isEmpty()&&!(agreement?Set.of("OPEN","DONE","CANCELLED"):Set.of("PLANNED","IN_PROGRESS","COMPLETED","CANCELLED")).contains(status))throw new IllegalArgumentException();
    }
}
