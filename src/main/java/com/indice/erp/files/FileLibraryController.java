package com.indice.erp.files;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import java.nio.charset.StandardCharsets;
import static com.indice.erp.files.FileContracts.*;
@RestController
@RequestMapping("/api/v1/files")
public class FileLibraryController {
 private final FileAccess access;private final FileLibraryService service;private final FileUploadService uploads;
 public FileLibraryController(FileAccess access,FileLibraryService service,FileUploadService uploads){this.access=access;this.service=service;this.uploads=uploads;}
 @ModelAttribute void privacy(HttpServletResponse response){response.setHeader("Cache-Control","no-store");response.setHeader("X-Content-Type-Options","nosniff");}
 @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
 public ResponseEntity<java.util.Map<String,String>> failure(org.springframework.web.server.ResponseStatusException failure){String reason=failure.getReason();return ResponseEntity.status(failure.getStatusCode()).cacheControl(CacheControl.noStore()).body(java.util.Map.of("code",reason!=null&&reason.startsWith("files_")?reason:"files_access_denied"));}
 @GetMapping public Page list(HttpSession session,@RequestParam(required=false)String folder,@RequestParam(defaultValue="OWNED")String scope,@RequestParam(defaultValue="")String q,@RequestParam(defaultValue="1")int page,@RequestParam(defaultValue="50")int pageSize,@RequestParam(defaultValue="ALL")String type){return service.list(access.actor(session,null,false),folder,scope,q,page,pageSize,type);}
 @GetMapping("/destinations")public java.util.List<Crumb> destinations(HttpSession session,@RequestParam(required=false)String exclude){return service.destinations(access.actor(session,null,false),exclude);}
 @GetMapping("/members")public java.util.List<Member> members(HttpSession session){return service.members(access.actor(session,null,false));}
 @PutMapping("/folders/{id}")public Entry folder(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String csrf,@RequestHeader(value="X-Files-Actor",required=false)String actor,@PathVariable String id,@Valid @RequestBody Folder in){return service.folder(access.actor(session,csrf,true),actor,id,in);}
 @PatchMapping("/{id}")public Entry change(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String csrf,@RequestHeader(value="X-Files-Actor",required=false)String actor,@PathVariable String id,@Valid @RequestBody Change in){return service.change(access.actor(session,csrf,true),actor,id,in);}
 @GetMapping("/{id}/sharing")public Sharing sharing(HttpSession session,@PathVariable String id){return service.sharing(access.actor(session,null,false),id);}
 @PutMapping("/{id}/sharing")public Sharing share(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String csrf,@RequestHeader(value="X-Files-Actor",required=false)String actor,@PathVariable String id,@Valid @RequestBody Share in){return service.share(access.actor(session,csrf,true),actor,id,in);}
 @PostMapping("/uploads/{id}")public Upload upload(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String csrf,@RequestHeader(value="X-Files-Actor",required=false)String actor,@PathVariable String id,@Valid @RequestBody UploadInput in){return uploads.prepare(access.actor(session,csrf,true),actor,id,in);}
 @PostMapping("/uploads/{id}/register")public Entry register(HttpSession session,@RequestHeader(value="X-CSRF-Token",required=false)String csrf,@RequestHeader(value="X-Files-Actor",required=false)String actor,@PathVariable String id){return uploads.register(access.actor(session,csrf,true),actor,id);}
 @GetMapping("/{id}/content")public ResponseEntity<StreamingResponseBody> content(HttpSession session,@PathVariable String id,@RequestParam(defaultValue="false")boolean preview,@RequestHeader(value="Range",required=false)String range){
  var actor=access.actor(session,null,false);var file=uploads.content(actor,id);long start=0,end=file.sizeBytes()-1;HttpStatus status=HttpStatus.OK;
  var headers=new HttpHeaders();headers.setCacheControl(CacheControl.noStore());headers.set("X-Content-Type-Options","nosniff");headers.set("Content-Security-Policy","sandbox; default-src 'none'");headers.set("Cross-Origin-Resource-Policy","same-origin");headers.set("Accept-Ranges","bytes");
  boolean inline=preview&&FilePolicy.inline(file.contentType());headers.setContentType(MediaType.parseMediaType(inline?file.contentType():"application/octet-stream"));headers.setContentDisposition((inline?ContentDisposition.inline():ContentDisposition.attachment()).filename(file.name(),StandardCharsets.UTF_8).build());
  if(range!=null)try{var ranges=HttpRange.parseRanges(range);if(ranges.size()!=1)throw new IllegalArgumentException();start=ranges.getFirst().getRangeStart(file.sizeBytes());end=ranges.getFirst().getRangeEnd(file.sizeBytes());if(start<0||end<start||end>=file.sizeBytes())throw new IllegalArgumentException();status=HttpStatus.PARTIAL_CONTENT;headers.set(HttpHeaders.CONTENT_RANGE,"bytes "+start+"-"+end+"/"+file.sizeBytes());}catch(IllegalArgumentException e){headers.set(HttpHeaders.CONTENT_RANGE,"bytes */"+file.sizeBytes());return new ResponseEntity<>(null,headers,HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);}
  long offset=start,length=end-start+1;headers.setContentLength(length);return new ResponseEntity<>(output->uploads.stream(actor,id,offset,length,output),headers,status);
 }
}
