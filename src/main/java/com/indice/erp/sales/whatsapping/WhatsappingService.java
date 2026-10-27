package com.indice.erp.sales.whatsapping;

import static com.indice.erp.sales.whatsapping.WhatsappingContracts.*;
import static com.indice.erp.sales.whatsapping.WhatsappingRules.*;
import static org.springframework.http.HttpStatus.*;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.*;
import com.indice.erp.auth.AuthSessionUser;
import jakarta.validation.Validator;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WhatsappingService {
  private final WhatsappingRepository repository;
  private final ModuleAccessService modules;
  private final TabPermissionAccessService tabs;
  private final Validator validator;
  private final com.indice.erp.sales.SalesOpportunityPresenceReadService opportunityPresence;

  public WhatsappingService(
      WhatsappingRepository repository,
      ModuleAccessService modules,
      TabPermissionAccessService tabs,
      Validator validator,
      com.indice.erp.sales.SalesOpportunityPresenceReadService opportunityPresence) {
    this.repository = repository;
    this.modules = modules;
    this.tabs = tabs;
    this.validator = validator;
    this.opportunityPresence = opportunityPresence;
  }

  private AuthSessionUser read(AuthSessionUser actor) {
    var current =
        repository
            .member(actor)
            .orElseGet(
                () -> {
                  require(
                      Set.of("root", "superadmin").contains(actor.role()),
                      FORBIDDEN,
                      "access_denied");
                  return actor;
                });
    require(
        modules.canAccess(current, "crm")
            && tabs.canAccess(current, TabPermissionRequirement.one("crm.contacts")),
        FORBIDDEN,
        "access_denied");
    return current;
  }

  private AuthSessionUser write(AuthSessionUser actor) {
    repository.lock(actor.companyId());
    var current = read(actor);
    require(
        modules.companyCanAccessForMutation(current.companyId(), "crm"),
        FORBIDDEN,
        "access_denied");
    return current;
  }

  private boolean canEdit(AuthSessionUser actor, Campaign c) {
    return actor.userId() == c.ownerUserId()
        || Set.of("root", "superadmin", "admin", "owner")
            .contains(actor.role().toLowerCase(Locale.ROOT));
  }

  private void editable(AuthSessionUser a, Campaign c) {
    require(canEdit(a, c), FORBIDDEN, "owner_required");
  }

  private Campaign find(AuthSessionUser a, String id) {
    return repository
        .find(a.companyId(), id)
        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "whatsapping_not_found"));
  }

  private Campaign project(AuthSessionUser a, Campaign c) {
    var presence = opportunityPresence.campaigns(a, List.of(c.id()));
    return project(a, c, presence == null ? null : presence.getOrDefault(c.id(), 0));
  }

  private Campaign project(AuthSessionUser a, Campaign c, Integer withOpportunity) {
    return new Campaign(
        c.id(),
        c.name(),
        c.objective(),
        c.offer(),
        c.defaultRegion(),
        c.resourceUrl(),
        c.steps(),
        c.status(),
        c.ownerUserId(),
        c.ownerName(),
        c.version(),
        c.updatedAt(),
        c.total(),
        c.done(),
        c.pending(),
        c.due(),
        canEdit(a, c),
        new Outcomes(c.outcomes().contacted(), c.outcomes().positive(), c.outcomes().negative(), withOpportunity));
  }

  private void valid(Object input) {
    require(input != null && validator.validate(input).isEmpty(), BAD_REQUEST, "invalid_input");
  }

  private void version(long expected, long actual) {
    require(expected == actual, CONFLICT, "version_conflict");
  }

  private void pagination(int page, int size) {
    require(
        page >= 1 && page <= 10000 && Set.of(10, 25, 50, 100, 200).contains(size),
        BAD_REQUEST,
        "invalid_filters");
  }

  @Transactional(readOnly = true)
  public Page list(
      AuthSessionUser actor,
      String search,
      String status,
      Long owner,
      int page,
      int size,
      String sort,
      String direction) {
    return list(actor, search, status, owner, page, size, sort, direction, "ALL");
  }

  @Transactional(readOnly = true)
  public Page list(
      AuthSessionUser actor,
      String search,
      String status,
      Long owner,
      int page,
      int size,
      String sort,
      String direction,
      String result) {
    var a = read(actor);
    pagination(page, size);
    require(
        search.length() <= 180
            && Set.of("ALL", "CONTACTED", "POSITIVE", "NEGATIVE").contains(result)
            && Set.of("ALL", "DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED").contains(status)
            && Set.of("asc", "desc").contains(direction),
        BAD_REQUEST,
        "invalid_filters");
    String column =
        switch (sort) {
          case "name" -> "name";
          case "status" -> "status";
          case "updatedAt" -> "updated_at";
          case "contacted" -> "contacted_count";
          case "positive" -> "positive_count";
          case "negative" -> "negative_count";
          default -> throw new ResponseStatusException(BAD_REQUEST, "whatsapping_invalid_filters");
        };
    var pageData =
        repository.list(a.companyId(), search, status, owner, page, size, column, direction, result);
    var presence = opportunityPresence.campaigns(a, pageData.items().stream().map(Campaign::id).toList());
    return new Page(
        pageData.items().stream().map(c -> project(a, c, presence == null ? null : presence.getOrDefault(c.id(), 0))).toList(),
        pageData.total(),
        page,
        size,
        pageData.owners(),
        pageData.results());
  }

  @Transactional(readOnly = true)
  public Detail get(AuthSessionUser actor, String id) {
    var a = read(actor);
    return detail(a, find(a, id));
  }

  private Detail detail(AuthSessionUser a, Campaign c) {
    var blocked = repository.suppressed(a.companyId());
    var replyOutcomes = repository.replyOutcomes(a.companyId(), c.id());
    var seen = new HashSet<String>();
    String company = repository.companyName(a.companyId());
    var recipients =
        repository.recipients(a.companyId(), c.id()).stream()
            .map(
                r -> {
                  String phone = phone(r.contact().phone(), c.defaultRegion()),
                      eligibility = r.contact().eligibility();
                  if (eligibility.equals("READY")) {
                    if (phone.isBlank()) eligibility = "INVALID";
                    else if (blocked.contains(phone)) eligibility = "BLOCKED";
                    else if (!seen.add(phone)) eligibility = "DUPLICATE";
                  }
                  String baseMessage = render(
                              c.steps().get(Math.min(r.stepIndex(), c.steps().size() - 1)).body(),
                              Map.of(
                                  "name",
                                  r.contact().name(),
                                  "clientCompany",
                                  r.contact().companyName(),
                                  "seller",
                                  c.ownerName(),
                                  "company",
                                  company,
                                  "offer",
                                  c.offer(),
                                  "link",
                                  c.resourceUrl()));
                  String body = r.state().equals("PREPARED") ? r.preparedText() : baseMessage;
                  if (eligibility.equals("READY")
                      && (body == null
                          || body.isBlank()
                          || body.length() > 4000
                          || unresolved(body))) eligibility = "MISSING_DATA";
                  return new Recipient(
                      new Contact(
                          r.contact().id(),
                          r.contact().name(),
                          r.contact().companyName(),
                          phone.isBlank() ? r.contact().phone() : phone,
                          r.contact().ownerName(),
                          r.contact().source(),
                          eligibility),
                      r.stepIndex(),
                      r.state(),
                      r.nextActionAt(),
                      r.notes(),
                      r.version(),
                      Objects.toString(body, ""),
                      eligibility,
                      baseMessage,
                      replyOutcomes.get(r.contact().id()));
                })
            .toList();
    var results = repository.resultContacts(a.companyId(), c.id());
    var opportunityReferences = opportunityPresence.campaignOpportunities(a, c.id());
    var opportunityContacts = opportunityReferences == null ? null : opportunityReferences.stream().map(com.indice.erp.sales.SalesOpportunityPresenceReadService.OpportunityReference::contactId).distinct().toList();
    var opportunities = opportunityReferences == null ? null : opportunityReferences.stream().map(o -> new Opportunity(o.contactId(), o.id(), o.flowId(), o.code(), o.name(), o.stage() == null ? null : new OpportunityStage(o.stage().key(), o.stage().label(), o.stage().usesDefaultLabel()))).toList();
    return new Detail(project(a, c, opportunityContacts == null ? null : opportunityContacts.size()), recipients, repository.events(a.companyId(), c.id()),
        new ResultContacts(results.contacted(), results.positive(), results.negative(), opportunityContacts), opportunities);
  }

  private void contactsValid(long company, List<Long> ids) {
    var rows = repository.resolve(company, ids);
    require(
        rows.size() == new HashSet<>(ids).size()
            && rows.stream().allMatch(c -> c.eligibility().equals("READY")),
        BAD_REQUEST,
        "contact_unavailable");
  }

  @Transactional
  public Detail save(AuthSessionUser actor, String id, CampaignInput input) {
    valid(input);
    id(id);
    var a = write(actor);
    require(
        validRegion(input.defaultRegion())
            && resource(input.resourceUrl())
            && Set.of("WELCOME", "QUOTE", "RENEWAL", "PROMOTION", "RECOVERY", "OTHER")
                .contains(input.objective()),
        BAD_REQUEST,
        "invalid_input");
    require(input.steps().getFirst().delayDays() == 0, BAD_REQUEST, "invalid_input");
    input.steps().forEach(s -> WhatsappingRules.template(s.body()));
    var current = repository.find(a.companyId(), id);
    if (current.isPresent()) {
      editable(a, current.get());
      require(current.get().status().equals("DRAFT"), CONFLICT, "draft_only");
      version(input.version(), current.get().version());
    } else version(input.version(), 0);
    contactsValid(a.companyId(), input.contactIds());
    repository.save(a, id, input);
    return detail(a, find(a, id));
  }

  @Transactional
  public Detail state(AuthSessionUser actor, String id, StateInput input) {
    valid(input);
    var a = write(actor);
    var c = find(a, id);
    editable(a, c);
    version(input.version(), c.version());
    boolean allowed =
        switch (input.status()) {
          case "ACTIVE" -> Set.of("DRAFT", "PAUSED").contains(c.status());
          case "PAUSED" -> c.status().equals("ACTIVE");
          case "ARCHIVED" -> !c.status().equals("ARCHIVED");
          default -> false;
        };
    require(allowed, CONFLICT, "invalid_transition");
    if (input.status().equals("ACTIVE")) {
      require(
          c.steps().stream().allMatch(s -> !s.body().isBlank()), BAD_REQUEST, "message_required");
      require(
          detail(a, c).recipients().stream()
              .anyMatch(r -> r.eligibility().equals("READY") && !terminal(r.state())),
          BAD_REQUEST,
          "no_ready_contacts");
    }
    repository.state(a, id, input.status());
    return detail(a, find(a, id));
  }

  private static boolean terminal(String state) {
    return Set.of("DONE", "SKIPPED", "REPLIED", "BLOCKED").contains(state);
  }

  @Transactional
  public ActionResult action(AuthSessionUser actor, String id, long contact, ActionInput input) {
    valid(input);
    var a = write(actor);
    var c = find(a, id);
    editable(a, c);
    require(
        c.status().equals("ACTIVE")
            || (c.status().equals("COMPLETED")
                && Set.of("NOTE", "REPLIED", "REPLY_POSITIVE", "REPLY_NEGATIVE", "BLOCK").contains(input.action())),
        CONFLICT,
        "campaign_inactive");
    var r =
        repository.recipients(a.companyId(), id).stream()
            .filter(row -> row.contact().id() == contact)
            .findFirst()
            .orElseThrow(
                () -> new ResponseStatusException(NOT_FOUND, "whatsapping_contact_unavailable"));
    version(input.version(), r.version());
    require(input.messageOverride() == null || input.action().equals("PREPARE"), BAD_REQUEST, "message_override_action");
    String state = r.state(), phone = r.preparedPhone(), message = r.preparedText(), url = null;
    int step = r.stepIndex();
    Instant due = r.nextActionAt();
    switch (input.action()) {
      case "PREPARE" -> {
        require(
            !terminal(state) && (due == null || !due.isAfter(Instant.now())), CONFLICT, "not_due");
        var prepared =
            detail(a, c).recipients().stream()
                .filter(row -> row.contact().id() == contact)
                .findFirst()
                .orElseThrow();
        require(prepared.eligibility().equals("READY"), BAD_REQUEST, "recipient_not_ready");
        phone = phone(r.contact().phone(), c.defaultRegion());
        message = input.messageOverride() == null ? prepared.baseMessage() : input.messageOverride();
        require(message != null && !message.isBlank() && message.length() <= 4000 && !unresolved(message), BAD_REQUEST, "invalid_personal_message");
        state = "PREPARED";
        url =
            "https://wa.me/"
                + phone.substring(1)
                + "?text="
                + URLEncoder.encode(message, StandardCharsets.UTF_8).replace("+", "%20");
      }
      case "SENT" -> {
        require(
            state.equals("PREPARED") && r.preparedBy() != null && r.preparedBy().equals(a.userId()),
            CONFLICT,
            "prepare_first");
        if (step + 1 < c.steps().size()) {
          step++;
          state = "WAITING";
          due = Instant.now().plus(Duration.ofDays(c.steps().get(step).delayDays()));
        } else {
          state = "DONE";
          due = null;
        }
        phone = null;
        message = null;
      }
      case "SKIP", "REPLIED", "REPLY_POSITIVE", "REPLY_NEGATIVE", "BLOCK" -> {
        require(
            input.action().equals("BLOCK")
                ? !state.equals("BLOCKED")
                : Set.of("REPLIED", "REPLY_POSITIVE", "REPLY_NEGATIVE").contains(input.action())
                    ? !Set.of("BLOCKED", "SKIPPED", "REPLIED").contains(state)
                    : !terminal(state),
            CONFLICT,
            "already_finished");
        state =
            switch (input.action()) {
              case "SKIP" -> "SKIPPED";
              case "BLOCK" -> "BLOCKED";
              default -> "REPLIED";
            };
        due = null;
        phone = null;
        message = null;
        if (input.action().equals("BLOCK")) {
          String number = phone(r.contact().phone(), c.defaultRegion());
          require(!number.isBlank(), BAD_REQUEST, "invalid_phone");
          repository.suppress(a, number);
        }
      }
      case "NOTE" -> {
        if (input.nextActionAt() != null)
          require(!terminal(state), BAD_REQUEST, "already_finished");
        due = input.nextActionAt();
        if (!terminal(state) && !state.equals("PREPARED"))
          state = due == null ? "PENDING" : "WAITING";
      }
      default -> throw new ResponseStatusException(BAD_REQUEST, "whatsapping_invalid_input");
    }
    repository.updateRecipient(a, id, contact, step, state, due, input.notes(), phone, message);
    repository.event(a, id, contact, input.action(), r.stepIndex());
    var after = detail(a, find(a, id));
    if (!c.status().equals("COMPLETED")
        && after.recipients().stream().allMatch(row -> terminal(row.state()))) {
      repository.state(a, id, "COMPLETED");
      after = detail(a, find(a, id));
    }
    return new ActionResult(after, url);
  }

  @Transactional(readOnly = true)
  public ContactPage contacts(
      AuthSessionUser actor, String search, String region, int page, int size) {
    var a = read(actor);
    pagination(page, size);
    require(search.length() <= 180 && validRegion(region), BAD_REQUEST, "invalid_filters");
    var result = repository.contacts(a.companyId(), search, page, size);
    var blocked = repository.suppressed(a.companyId());
    return new ContactPage(
        result.items().stream()
            .map(
                c -> {
                  String number = phone(c.phone(), region);
                  String state =
                      number.isBlank() ? "INVALID" : blocked.contains(number) ? "BLOCKED" : "READY";
                  return new Contact(
                      c.id(),
                      c.name(),
                      c.companyName(),
                      number.isBlank() ? c.phone() : number,
                      c.ownerName(),
                      c.source(),
                      state);
                })
            .toList(),
        result.total(),
        page,
        size);
  }

  @Transactional(readOnly = true)
  public List<Contact> selection(AuthSessionUser actor, String search, String region) {
    var a = read(actor);
    require(search.length() <= 180 && validRegion(region), BAD_REQUEST, "invalid_filters");
    var data = repository.contacts(a.companyId(), search, 1, 501);
    require(data.total() <= 500, CONFLICT, "selection_limit");
    return data.items();
  }

  @Transactional(readOnly = true)
  public List<Template> templates(AuthSessionUser actor) {
    return repository.templates(read(actor).companyId());
  }

  @Transactional
  public List<Template> template(AuthSessionUser actor, String id, TemplateInput input) {
    valid(input);
    id(id);
    WhatsappingRules.template(input.body());
    var a = write(actor);
    var current =
        repository.templates(a.companyId()).stream().filter(t -> t.id().equals(id)).findFirst();
    version(input.version(), current.map(Template::version).orElse(0L));
    repository.template(a, id, input);
    return repository.templates(a.companyId());
  }

  @Transactional(readOnly = true)
  public List<SavedList> lists(AuthSessionUser actor) {
    return repository.lists(read(actor).companyId());
  }

  @Transactional
  public List<SavedList> list(AuthSessionUser actor, String id, ListInput input) {
    valid(input);
    id(id);
    var a = write(actor);
    contactsValid(a.companyId(), input.contactIds());
    var current =
        repository.lists(a.companyId()).stream().filter(t -> t.id().equals(id)).findFirst();
    version(input.version(), current.map(SavedList::version).orElse(0L));
    repository.list(a, id, input);
    return repository.lists(a.companyId());
  }
}
