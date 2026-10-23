package com.indice.erp.sales.funneling.brand;

import com.indice.erp.access.module.RequiresModuleAccess;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import static com.indice.erp.sales.funneling.brand.BrandContracts.*;

@RestController
@RequestMapping("/api/v1/sales/company-library")
@RequiresModuleAccess("crm")
public class BrandLibraryController {
    private final BrandAccess access;private final BrandLibraryService library;private final BrandFileService files;
    public BrandLibraryController(BrandAccess access,BrandLibraryService library,BrandFileService files){this.access=access;this.library=library;this.files=files;}
    @ModelAttribute public void privateResponse(jakarta.servlet.http.HttpServletResponse response){response.setHeader("Cache-Control","no-store");}
    @GetMapping public Library library(HttpSession session,@RequestParam(defaultValue="false") boolean archived){var a=access.actor(session,null,false);return new Library(library.get(a),files.list(a,archived));}
    @PutMapping public Profile save(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false) String csrf,@RequestHeader(name="X-Brand-Actor",required=false) String actor,@Valid @RequestBody ProfileInput input){return library.save(access.actor(s,csrf,true),actor,input);}
    @PostMapping("/assets/upload") public Upload upload(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false) String csrf,@RequestHeader(name="X-Brand-Actor",required=false) String actor,@Valid @RequestBody UploadInput input){return files.upload(access.actor(s,csrf,true),actor,input);}
    @PostMapping("/assets/{id}/register") public Asset register(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false) String csrf,@RequestHeader(name="X-Brand-Actor",required=false) String actor,@PathVariable String id){return files.register(access.actor(s,csrf,true),actor,id);}
    @PutMapping("/assets/{id}/status") public Asset status(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false) String csrf,@RequestHeader(name="X-Brand-Actor",required=false) String actor,@PathVariable String id,@Valid @RequestBody AssetState in){return files.status(access.actor(s,csrf,true),actor,id,in.archived());}
    @GetMapping("/assets/{id}/download") public ResponseEntity<byte[]> download(HttpSession s,@PathVariable String id){var a=access.actor(s,null,false);var meta=files.metadata(a,id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox").header("Content-Disposition",ContentDisposition.attachment().filename(meta.name(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).contentType(MediaType.APPLICATION_OCTET_STREAM).body(files.download(a,id));}
    @GetMapping("/campaigns/{id}") public Snapshot snapshot(HttpSession s,@PathVariable String id){return library.snapshot(access.actor(s,null,false),id);}
    @PutMapping("/campaigns/{id}") public Snapshot select(HttpSession s,@RequestHeader(name="X-CSRF-Token",required=false) String csrf,@RequestHeader(name="X-Brand-Actor",required=false) String actor,@PathVariable String id,@Valid @RequestBody Selection in){return library.select(access.actor(s,csrf,true),actor,id,in);}
}
