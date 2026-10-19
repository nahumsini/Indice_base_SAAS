package com.indice.erp.sales.mailing;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MailingAudienceContracts {
    private MailingAudienceContracts() { }
    public record Filters(@Size(max=180) String search, @Size(max=80) String source,
        @Positive Long owner, @Size(max=180) String tag, @Size(max=36) String listId,
        @Size(max=30) String eligibility, @Size(max=30) String sort, @Size(max=4) String direction) { }
    public record Contact(long id, String name, String email, String companyName, String contactPerson,
        String ownerName, String source, String eligibility) { }
    public record Page(List<Contact> items, long total, int page, int pageSize) { }
    public record Option(String value, String label) { }
    public record Options(List<String> sources, List<Option> owners, List<String> tags) { }
    public record Selection(@NotNull @Size(max=500) List<@NotNull @Positive Long> contactIds) { }
    public record Summary(int selected, int ready, int consentRequired, int excluded, List<Contact> items) { }
    public record ListInput(@NotBlank @Size(max=180) String name,
        @NotNull @Size(min=1,max=500) List<@NotNull @Positive Long> contactIds, @Min(0) long version) { }
    public record SavedList(String id, String name, long version, int contactCount, Instant updatedAt) { }
    public record ListDetail(SavedList list, List<Contact> items, int unavailable) { }
    public record Version(@Min(1) long version) { }
    public record HistoryItem(String campaignId, String name, String subject, String campaignStatus,
        String deliveryState, String email, Instant scheduledAt, Instant completedAt) { }
    public record History(List<HistoryItem> items, long total, int page, int pageSize) { }
}
