package com.indice.erp.ideasboard;

import com.indice.erp.sales.funneling.IdeasBoardService;
import com.indice.erp.sales.funneling.IdeasBoardMediaPolicy;
import com.indice.erp.sales.funneling.IdeasBoardScope;

import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import com.indice.erp.access.module.*;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/ideas-board")
@RequiresModuleAccess("ideas_board")
public class PersonalIdeasBoardController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final IdeasBoardService service;private final IdeaWorkspaceService workspace;private final IdeaProjectService projects;
    public PersonalIdeasBoardController(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,TabPermissionAccessService tabs,IdeasBoardService service,IdeaWorkspaceService workspace,IdeaProjectService projects){this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;this.service=service;this.workspace=workspace;this.projects=projects;}
    private AuthSessionUser actor(HttpSession session,String token,boolean write){
        var a=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!modules.canAccess(a,"ideas_board")||!tabs.canAccess(a,TabPermissionRequirement.one("ideas_board.canvas")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return a;
    }
    @GetMapping("/system") public IdeaWorkspaceContracts.SystemBoard system(HttpSession session){return workspace.system(actor(session,null,false));}
    @PutMapping("/system") public IdeaWorkspaceContracts.SystemBoard saveSystem(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@Valid @RequestBody IdeaWorkspaceContracts.SystemInput input){return workspace.saveSystem(actor(session,token,true),expected,input);}
    @GetMapping("/projects") public IdeaWorkspaceContracts.ProjectPage projects(HttpSession session,@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="12")int pageSize,@RequestParam(defaultValue="OWNED")String scope,@RequestParam(defaultValue="ALL")String kind,@RequestParam(defaultValue="NEWEST")String sort){return projects.list(actor(session,null,false),q,page,pageSize,scope,kind,sort);}
    @GetMapping("/projects/{id}") public IdeaWorkspaceContracts.Project project(HttpSession session,@PathVariable String id,@RequestParam(required=false)Long ownerId){return projects.get(actor(session,null,false),ownerId,id);}
    @PutMapping("/projects/{id}") public IdeaWorkspaceContracts.Project saveProject(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@PathVariable String id,@Valid @RequestBody IdeaWorkspaceContracts.ProjectInput input){return workspace.saveProject(actor(session,token,true),expected,id,input);}
    @GetMapping("/projects/members") public java.util.List<IdeaProjectContracts.Member> members(HttpSession session,@RequestParam(defaultValue="")String q){return projects.members(actor(session,null,false),q);}
    @GetMapping("/projects/{id}/sharing") public IdeaProjectContracts.Sharing sharing(HttpSession session,@PathVariable String id){return projects.sharing(actor(session,null,false),id);}
    @PutMapping("/projects/{id}/sharing") public IdeaProjectContracts.Sharing share(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@PathVariable String id,@Valid @RequestBody IdeaProjectContracts.ShareChange input){return projects.share(actor(session,token,true),expected,id,input);}
    @PatchMapping("/projects/{id}") public IdeaWorkspaceContracts.Project change(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@PathVariable String id,@Valid @RequestBody IdeaProjectContracts.Change input){return projects.change(actor(session,token,true),expected,id,input);}
    @PutMapping("/projects/{id}/copies/{target}") public IdeaWorkspaceContracts.Project copy(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@PathVariable String id,@PathVariable String target,@RequestParam(required=false)Long ownerId,@Valid @RequestBody IdeaProjectContracts.Copy input){var a=actor(session,token,true);return projects.copy(a,expected,ownerId==null?a.userId():ownerId,id,target,input);}
    @GetMapping("/projects/{id}/assets/{asset}") public ResponseEntity<byte[]> projectAsset(HttpSession session,@PathVariable String id,@PathVariable String asset,@RequestParam(required=false)Long ownerId,@RequestHeader(value="Range",required=false)String range){var a=actor(session,null,false);return media(projects.asset(a,ownerId==null?a.userId():ownerId,id,asset),range);}
    @GetMapping public Board get(HttpSession session){return service.get(actor(session,null,false),IdeasBoardScope.PERSONAL);}
    @PutMapping public Board save(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@Valid @RequestBody Input input){return service.save(actor(session,token,true),expected,input,IdeasBoardScope.PERSONAL);}
    @PostMapping("/assets/{id}") public Asset upload(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@RequestHeader("X-Idea-Photo-Name")String encoded,@PathVariable String id,HttpServletRequest request)throws IOException{
        var a=actor(session,token,true);
        if(request.getContentLengthLong()>IdeasBoardMediaPolicy.MAX_BYTES)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        byte[] bytes=request.getInputStream().readNBytes(IdeasBoardMediaPolicy.MAX_BYTES+1);
        if(bytes.length>IdeasBoardMediaPolicy.MAX_BYTES)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        String name;try{name=URLDecoder.decode(encoded,StandardCharsets.UTF_8);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
        return service.upload(a,expected,id,name,request.getContentType(),bytes,IdeasBoardScope.PERSONAL);
    }
    @GetMapping("/assets/{id}") public ResponseEntity<byte[]> photo(HttpSession session,@PathVariable String id,@RequestHeader(value="Range",required=false)String range){
        return media(service.asset(actor(session,null,false),id,IdeasBoardScope.PERSONAL),range);
    }
    private ResponseEntity<byte[]> media(StoredAsset stored,String range){
        byte[] data=service.bytes(stored,IdeasBoardScope.PERSONAL);
        HttpHeaders headers=new HttpHeaders();headers.setCacheControl(CacheControl.noStore());headers.set("X-Content-Type-Options","nosniff");headers.set("Accept-Ranges","bytes");headers.setContentDisposition(ContentDisposition.inline().filename(stored.asset().name(),StandardCharsets.UTF_8).build());headers.setContentType(MediaType.parseMediaType(stored.asset().contentType()));
        if(range==null){headers.setContentLength(data.length);return new ResponseEntity<>(data,headers,HttpStatus.OK);}
        try{var ranges=HttpRange.parseRanges(range);if(ranges.size()!=1)throw new IllegalArgumentException();var selected=ranges.getFirst();long start=selected.getRangeStart(data.length),end=selected.getRangeEnd(data.length);if(start<0||start>=data.length||end<start||end>=data.length)throw new IllegalArgumentException();
            headers.set(HttpHeaders.CONTENT_RANGE,"bytes "+start+"-"+end+"/"+data.length);headers.setContentLength(end-start+1);return new ResponseEntity<>(java.util.Arrays.copyOfRange(data,(int)start,(int)end+1),headers,HttpStatus.PARTIAL_CONTENT);
        }catch(IllegalArgumentException error){headers.set(HttpHeaders.CONTENT_RANGE,"bytes */"+data.length);headers.setContentLength(0);return new ResponseEntity<>(new byte[0],headers,HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);}
    }
}
