package com.indice.erp.sales.funneling;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

/** Editorial planning only. Dates and statuses do not publish or authorize advertising spend. */
public final class ContentCalendarContracts {
    private ContentCalendarContracts() {}

    public record Entry(
        @NotBlank @Size(max = 36) String id,
        @NotBlank @Size(max = 180) String title,
        @NotNull @Pattern(regexp = "REEL|STORY|CAROUSEL|POST|META_AD|SEARCH_AD") String format,
        @NotNull @Pattern(regexp = "INSTAGRAM|FACEBOOK|GOOGLE_SEARCH") String channel,
        @NotNull @Pattern(regexp = "IDEA|PLANNED|READY|PUBLISHED|CANCELLED") String status,
        @Size(max = 10) String date, @Size(max = 5) String time,
        @NotNull @Pattern(regexp = "ATTRACT|TRUST|CONVERT|RETAIN") String purpose,
        @NotNull @Size(max = 2000) String brief,
        @NotNull @Size(max = 300) String callToAction,
        @NotNull @Size(max = 180) String owner,
        @NotNull @Size(max = 500) String reference
    ) {}

    public record Settings(
        @NotBlank @Size(max = 10) String startDate,
        @Min(1) @Max(8) int weeks,
        @NotNull @Size(min = 1, max = 7) List<@NotNull @Min(0) @Max(6) Integer> days,
        @NotNull @Pattern(regexp = "[0-2][0-9]:[0-5][0-9]") String time,
        @NotNull @Pattern(regexp = "AWARENESS|INQUIRIES|APPOINTMENTS|PURCHASES|QUOTES|RENEWALS") String goal,
        @NotBlank @Size(max = 300) String topic,
        @NotNull @Size(min = 1, max = 3) List<@NotNull @Pattern(regexp = "INSTAGRAM|FACEBOOK|GOOGLE_SEARCH") String> channels,
        @NotNull @Size(min = 1, max = 6) List<@NotNull @Pattern(regexp = "REEL|STORY|CAROUSEL|POST|META_AD|SEARCH_AD") String> formats
    ) {}

    public record Document(@NotBlank @Size(max = 80) String timeZone,
        @Valid Settings settings, @NotNull @Size(max = 200) List<@NotNull @Valid Entry> entries) {}
    public record Input(@Min(0) long version, @NotBlank @Size(max = 36) String mutationId,
        @NotNull @Valid Document content) {}
    public record Calendar(Document content, long version, Instant updatedAt, String actorKey) {}
}
