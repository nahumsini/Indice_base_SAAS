package com.indice.erp.sales;

import com.indice.erp.auth.*;
import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.access.tab.*;
import com.indice.erp.entitlement.RequiresCapability;
import com.indice.erp.storage.ObjectStorageDisabledException;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/sales/inventory-movements/{movementId}/attachments")
@RequiresModuleAccess("inventory")
@RequiresCapability("inventory")
public class InventoryMovementAttachmentController {
    private final SessionAuthService auth;
    private final SessionCsrfService csrf;
    private final TabPermissionAccessService tabs;
    private final InventoryMovementAttachmentService service;
    public InventoryMovementAttachmentController(SessionAuthService auth,SessionCsrfService csrf,TabPermissionAccessService tabs,InventoryMovementAttachmentService service) {
        this.auth=auth; this.csrf=csrf; this.tabs=tabs; this.service=service;
    }
    private ResponseEntity<?> execute(HttpSession session,String token,boolean write,java.util.function.Function<AuthSessionUser,Object> action) {
        var user=auth.currentUser(session);
        if(user.isEmpty()) return ResponseEntity.status(401).body(Map.of("message","Inicia sesión para continuar."));
        if(write) {
            try { csrf.requireCsrf(session,token); }
            catch(IllegalArgumentException ex) { return ResponseEntity.status(403).body(Map.of("message","Tu sesión cambió. Actualiza la página antes de cargar archivos.")); }
        }
        try {
            if(!tabs.canAccess(user.get(),TabPermissionRequirement.one("inventory.inventory")))
                return ResponseEntity.status(403).body(Map.of("message","No tienes permiso para los archivos de inventario."));
            return ResponseEntity.ok(action.apply(user.get()));
        } catch(SecurityException | com.indice.erp.hr.HrAccessDeniedException ex) {
            return ResponseEntity.status(403).body(Map.of("message","No tienes permiso para este movimiento."));
        } catch(NoSuchElementException ex) {
            return ResponseEntity.status(404).body(Map.of("message","Movimiento o archivo no encontrado."));
        } catch(ObjectStorageDisabledException ex) {
            return ResponseEntity.status(503).body(Map.of("message",ex.getMessage()));
        } catch(IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message",ex.getMessage()));
        }
    }
    @GetMapping
    public ResponseEntity<?> list(HttpSession session,@PathVariable long movementId) {return execute(session,null,false,user->service.list(user,movementId));}
    @PostMapping("/presign-upload")
    public ResponseEntity<?> reserve(HttpSession session,@PathVariable long movementId,@RequestHeader(name="X-CSRF-Token",required=false)String token,@RequestBody InventoryMovementAttachmentService.UploadRequest request) {return execute(session,token,true,user->service.reserve(user,movementId,request));}
    @PostMapping
    public ResponseEntity<?> register(HttpSession session,@PathVariable long movementId,@RequestHeader(name="X-CSRF-Token",required=false)String token,@RequestBody InventoryMovementAttachmentService.RegisterRequest request) {return execute(session,token,true,user->service.register(user,movementId,request));}
    @GetMapping("/{fileId}/download")
    public ResponseEntity<?> download(HttpSession session,@PathVariable long movementId,@PathVariable long fileId) {return execute(session,null,false,user->Map.of("url",service.download(user,movementId,fileId)));}
}
