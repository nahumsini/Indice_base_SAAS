package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingVotingDtos.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/meetings/{meetingId}/ballots")
@RequiresModuleAccess("control_minutas")
public class MeetingVotingController {
    private final MeetingAccessService access;
    private final MeetingVotingService service;
    public MeetingVotingController(MeetingAccessService access,MeetingVotingService service){this.access=access;this.service=service;}
    @GetMapping("/team") public Team team(HttpSession s,@PathVariable long meetingId){return service.team(access.require(s,List.of("meetings"),null,false),meetingId);}
    @GetMapping public MeetingDtos.Page<Ballot> list(HttpSession s,@PathVariable long meetingId,@RequestParam(defaultValue="1") int page){return service.list(access.require(s,List.of("meetings"),null,false),meetingId,page);}
    @GetMapping("/{id}") public Detail detail(HttpSession s,@PathVariable long meetingId,@PathVariable long id){return service.detail(access.require(s,List.of("meetings"),null,false),meetingId,id);}
    @PostMapping public Detail open(HttpSession s,@PathVariable long meetingId,@RequestHeader(value="X-CSRF-Token",required=false) String token,@RequestHeader(value="Idempotency-Key",required=false) String key,@Valid @RequestBody OpenRequest body){return service.open(access.require(s,List.of("meetings"),token,true),meetingId,body,key);}
    @PutMapping("/{id}/vote") public Detail vote(HttpSession s,@PathVariable long meetingId,@PathVariable long id,@RequestHeader(value="X-CSRF-Token",required=false) String token,@Valid @RequestBody VoteRequest body){return service.cast(access.require(s,List.of("meetings"),token,true),meetingId,id,body);}
    @PostMapping("/{id}/close") public Detail close(HttpSession s,@PathVariable long meetingId,@PathVariable long id,@RequestHeader(value="X-CSRF-Token",required=false) String token,@Valid @RequestBody CloseRequest body){return service.close(access.require(s,List.of("meetings"),token,true),meetingId,id,body);}
}
