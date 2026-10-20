package com.indice.erp.sales.funneling;

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
@RequestMapping("/api/v1/sales/funnels/ideas-board")
@RequiresModuleAccess("crm")
public class IdeasBoardController {
    private final SessionAuthService auth;private final SessionCsrfService csrf;private final ModuleAccessService modules;private final TabPermissionAccessService tabs;private final IdeasBoardService service;
    public IdeasBoardController(SessionAuthService auth,SessionCsrfService csrf,ModuleAccessService modules,TabPermissionAccessService tabs,IdeasBoardService service){this.auth=auth;this.csrf=csrf;this.modules=modules;this.tabs=tabs;this.service=service;}
    private AuthSessionUser actor(HttpSession session,String token,boolean write){
        var a=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(auth.isPublicDemoSession(session)||!modules.canAccess(a,"crm")||!tabs.canAccess(a,TabPermissionRequirement.one("crm.funneling")))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
        return a;
    }
    @GetMapping public Board get(HttpSession session){return service.get(actor(session,null,false));}
    @PutMapping public Board save(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@Valid @RequestBody Input input){return service.save(actor(session,token,true),expected,input);}
    @PostMapping("/assets/{id}") public Asset upload(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String token,@RequestHeader(value="X-Idea-Board-Actor",required=false)String expected,@RequestHeader("X-Idea-Photo-Name")String encoded,@PathVariable String id,HttpServletRequest request)throws IOException{
        var a=actor(session,token,true);
        if(request.getContentLengthLong()>IdeasBoardService.MAX_BYTES)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        byte[] bytes=request.getInputStream().readNBytes(IdeasBoardService.MAX_BYTES+1);
        if(bytes.length>IdeasBoardService.MAX_BYTES)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        String name;try{name=URLDecoder.decode(encoded,StandardCharsets.UTF_8);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
        return service.upload(a,expected,id,name,request.getContentType(),bytes);
    }
    @GetMapping("/assets/{id}") public ResponseEntity<byte[]> photo(HttpSession session,@PathVariable String id){
        var stored=service.asset(actor(session,null,false),id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(stored.asset().name(),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType(stored.asset().contentType())).body(service.bytes(stored));
    }
}
