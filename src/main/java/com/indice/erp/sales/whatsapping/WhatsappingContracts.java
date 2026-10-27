package com.indice.erp.sales.whatsapping;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class WhatsappingContracts {
  private WhatsappingContracts() {}

  public record Step(
      @NotBlank @Size(max = 100) String name,
      @Min(0) @Max(365) int delayDays,
      @NotNull @Size(max = 4000) String body) {}

  public record CampaignInput(
      @NotBlank @Size(max = 180) String name,
      @NotBlank @Size(max = 40) String objective,
      @NotNull @Size(max = 240) String offer,
      @Pattern(regexp = "[A-Z]{2}") @NotNull String defaultRegion,
      @NotNull @Size(max = 1600) String resourceUrl,
      @NotNull @Size(min = 1, max = 5) List<@NotNull @Valid Step> steps,
      @NotNull @Size(max = 500) List<@NotNull @Positive Long> contactIds,
      @Min(0) long version) {}

  public record Campaign(
      String id,
      String name,
      String objective,
      String offer,
      String defaultRegion,
      String resourceUrl,
      List<Step> steps,
      String status,
      long ownerUserId,
      String ownerName,
      long version,
      Instant updatedAt,
      int total,
      int done,
      int pending,
      int due,
      boolean canEdit,
      Outcomes outcomes) {}

  public record Outcomes(int contacted, int positive, int negative, Integer withOpportunity) {}
  public record ResultCounts(long all, long contacted, long positive, long negative) {}

  public record Page(
      List<Campaign> items, long total, int page, int pageSize, List<Owner> owners, ResultCounts results) {}

  public record Owner(long id, String name) {}

  public record Contact(
      long id,
      String name,
      String companyName,
      String phone,
      String ownerName,
      String source,
      String eligibility) {}

  public record ContactPage(List<Contact> items, long total, int page, int pageSize) {}

  public record Recipient(
      Contact contact,
      int stepIndex,
      String state,
      Instant nextActionAt,
      String notes,
      long version,
      String message,
      String eligibility,
      String baseMessage,
      String replyOutcome) {}

  public record Event(
      long id,
      Long contactId,
      String actorName,
      String action,
      Integer stepIndex,
      Instant occurredAt) {}

  public record ResultContacts(List<Long> contacted, List<Long> positive, List<Long> negative, List<Long> withOpportunity) {}

  public record OpportunityStage(String key, String label, boolean usesDefaultLabel) {}
  public record Opportunity(long contactId, long id, Long flowId, String code, String name, OpportunityStage stage) {}

  public record Detail(Campaign campaign, List<Recipient> recipients, List<Event> events, ResultContacts resultContacts, List<Opportunity> opportunities) {}

  public record StateInput(
      @Min(1) long version, @NotNull @Pattern(regexp = "ACTIVE|PAUSED|ARCHIVED") String status) {}

  public record ActionInput(
      @Min(1) long version,
      @NotNull @Pattern(regexp = "PREPARE|SENT|SKIP|REPLIED|REPLY_POSITIVE|REPLY_NEGATIVE|BLOCK|NOTE") String action,
      @NotNull @Size(max = 2000) String notes,
      Instant nextActionAt,
      @Size(max = 4000) String messageOverride) {
    public ActionInput(long version, String action, String notes, Instant nextActionAt) {
      this(version, action, notes, nextActionAt, null);
    }
  }

  public record ActionResult(Detail detail, String whatsappUrl) {}

  public record Template(String id, String name, String body, String status, long version) {}

  public record TemplateInput(
      @NotBlank @Size(max = 180) String name,
      @NotBlank @Size(max = 4000) String body,
      @NotNull @Pattern(regexp = "ACTIVE|ARCHIVED") String status,
      @Min(0) long version) {}

  public record SavedList(String id, String name, List<Long> contactIds, long version) {}

  public record ListInput(
      @NotBlank @Size(max = 180) String name,
      @NotNull @Size(min = 1, max = 500) List<@NotNull @Positive Long> contactIds,
      @Min(0) long version) {}
}
