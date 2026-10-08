package com.indice.erp.meetings;

import static com.indice.erp.meetings.MeetingDtos.*;
import static com.indice.erp.meetings.MeetingPlanningDtos.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/meetings")
@RequiresModuleAccess("control_minutas")
public class MeetingPlanningController {
    private final MeetingAccessService access;private final MeetingPlanningService planning;
    public MeetingPlanningController(MeetingAccessService access,MeetingPlanningService planning){this.access=access;this.planning=planning;}
    @PostMapping("/planning/preview") public PlanPreview preview(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@Valid @RequestBody PlanRequest body){return planning.preview(access.require(s,List.of("meetings"),token,true),body);}
    @PostMapping("/planning") public PlanResult create(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody PlanRequest body){return planning.create(access.require(s,List.of("meetings"),token,true),body,key);}
    @GetMapping("/flows") public List<FlowItem> flows(HttpSession s){return planning.flows(access.require(s,List.of("meetings"),null,false));}
    @PostMapping("/flows/{id}/archive") public void archive(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody FlowArchive body){planning.archiveFlow(access.require(s,List.of("meetings"),token,true),id,body.expectedVersion());}
    @GetMapping("/series") public Page<SeriesItem> series(HttpSession s,@RequestParam(defaultValue="1")int page){return planning.series(access.require(s,List.of("meetings"),null,false),page);}
    @PostMapping("/series/{id}/control") public void control(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody SeriesCommand body){planning.command(access.require(s,List.of("meetings"),token,true),id,body);}
    @PostMapping("/{id}/future-planning/preview") public PlanPreview futurePreview(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody FutureEdit body){return planning.previewFuture(access.require(s,List.of("meetings"),token,true),id,body);}
    @PutMapping("/{id}/future-planning") public MeetingDetail futureEdit(HttpSession s,@RequestHeader(value="X-CSRF-Token",required=false)String token,@PathVariable long id,@Valid @RequestBody FutureEdit body){return planning.editFuture(access.require(s,List.of("meetings"),token,true),id,body);}
}
