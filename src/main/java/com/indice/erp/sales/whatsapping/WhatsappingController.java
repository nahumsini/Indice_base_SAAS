package com.indice.erp.sales.whatsapping;

import static com.indice.erp.sales.whatsapping.WhatsappingContracts.*;

import com.indice.erp.access.module.RequiresModuleAccess;
import com.indice.erp.auth.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/sales/whatsapping")
@RequiresModuleAccess("crm")
public class WhatsappingController {
  private final SessionAuthService auth;
  private final SessionCsrfService csrf;
  private final WhatsappingService service;

  public WhatsappingController(
      SessionAuthService auth, SessionCsrfService csrf, WhatsappingService service) {
    this.auth = auth;
    this.csrf = csrf;
    this.service = service;
  }

  private AuthSessionUser actor(HttpSession session, String token, boolean write) {
    var a =
        auth.currentUser(session)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (auth.isPublicDemoSession(session)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    if (write)
      try {
        csrf.requireCsrf(session, token);
      } catch (IllegalArgumentException e) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
      }
    return a;
  }

  @GetMapping("/campaigns")
  public Page list(
      HttpSession session,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "ALL") String status,
      @RequestParam(required = false) Long owner,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "25") int pageSize,
      @RequestParam(defaultValue = "updatedAt") String sort,
      @RequestParam(defaultValue = "desc") String direction) {
    return service.list(
        actor(session, null, false), search, status, owner, page, pageSize, sort, direction);
  }

  @GetMapping("/campaigns/{id}")
  public Detail get(HttpSession session, @PathVariable String id) {
    return service.get(actor(session, null, false), id);
  }

  @PutMapping("/campaigns/{id}")
  public Detail save(
      HttpSession session,
      @RequestHeader(name = "X-CSRF-Token", required = false) String token,
      @PathVariable String id,
      @Valid @RequestBody CampaignInput input) {
    return service.save(actor(session, token, true), id, input);
  }

  @PostMapping("/campaigns/{id}/state")
  public Detail state(
      HttpSession session,
      @RequestHeader(name = "X-CSRF-Token", required = false) String token,
      @PathVariable String id,
      @Valid @RequestBody StateInput input) {
    return service.state(actor(session, token, true), id, input);
  }

  @PostMapping("/campaigns/{id}/recipients/{contact}/actions")
  public ActionResult action(
      HttpSession session,
      @RequestHeader(name = "X-CSRF-Token", required = false) String token,
      @PathVariable String id,
      @PathVariable long contact,
      @Valid @RequestBody ActionInput input) {
    return service.action(actor(session, token, true), id, contact, input);
  }

  @GetMapping("/contacts")
  public ContactPage contacts(
      HttpSession session,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "MX") String region,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "25") int pageSize) {
    return service.contacts(actor(session, null, false), search, region, page, pageSize);
  }

  @GetMapping("/contacts/selection")
  public List<Contact> selection(
      HttpSession session,
      @RequestParam(defaultValue = "") String search,
      @RequestParam(defaultValue = "MX") String region) {
    return service.selection(actor(session, null, false), search, region);
  }

  @GetMapping("/templates")
  public List<Template> templates(HttpSession session) {
    return service.templates(actor(session, null, false));
  }

  @PutMapping("/templates/{id}")
  public List<Template> template(
      HttpSession session,
      @RequestHeader(name = "X-CSRF-Token", required = false) String token,
      @PathVariable String id,
      @Valid @RequestBody TemplateInput input) {
    return service.template(actor(session, token, true), id, input);
  }

  @GetMapping("/lists")
  public List<SavedList> lists(HttpSession session) {
    return service.lists(actor(session, null, false));
  }

  @PutMapping("/lists/{id}")
  public List<SavedList> list(
      HttpSession session,
      @RequestHeader(name = "X-CSRF-Token", required = false) String token,
      @PathVariable String id,
      @Valid @RequestBody ListInput input) {
    return service.list(actor(session, token, true), id, input);
  }
}
