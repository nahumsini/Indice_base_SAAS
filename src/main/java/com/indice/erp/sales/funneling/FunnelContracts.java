package com.indice.erp.sales.funneling;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class FunnelContracts {
    private FunnelContracts() { }

    public record Stage(@NotBlank @Size(max = 100) String name,
        @NotNull @Size(max = 1000) String action,
        @NotNull @Size(max = 300) String measure,
        @DecimalMin("0") @DecimalMax("10000000") @Digits(integer = 8, fraction = 0) BigDecimal target,
        @Size(max = 1000) String content) {
        public Stage(String name, String action, String measure, BigDecimal target) {
            this(name, action, measure, target, null);
        }
    }

    public record PlanInput(@NotBlank @Size(max = 180) String name,
        @NotNull @Size(max = 1000) String objective,
        @NotNull @Size(max = 1000) String audience,
        @NotNull @Pattern(regexp = "EMAIL|WHATSAPP|SOCIAL|PHONE|IN_PERSON|MIXED|OTHER") String channel,
        @NotNull @Size(max = 4000) String notes,
        @NotNull @Size(max = 12) List<@NotNull @Valid Stage> stages,
        @NotNull @Pattern(regexp = "DRAFT|PLANNED|ARCHIVED") String status,
        @Min(0) long version, @Valid Workshop workshop) {
        public PlanInput(String name, String objective, String audience, String channel, String notes,
            List<Stage> stages, String status, long version) {
            this(name, objective, audience, channel, notes, stages, status, version, null);
        }
    }

    /** Planning context only. No advertising account, budget authority or execution instructions. */
    public record Workshop(
        @NotBlank @Size(max = 4000) String idea,
        @NotNull @Size(max = 1000) String offer,
        @NotNull @Size(max = 180) String location,
        @NotNull @Pattern(regexp = "UNDECIDED|AWARENESS|INQUIRIES|APPOINTMENTS|PURCHASES|QUOTES|RENEWALS") String goal,
        @NotNull @Size(max = 3) List<@NotNull @Pattern(regexp = "ORGANIC|META_ADS|GOOGLE_SEARCH") String> channels,
        @NotNull @Size(max = 5) List<@NotNull @Pattern(regexp = "PHOTOS|VIDEO|WEBSITE|WHATSAPP|TESTIMONIALS") String> materials,
        @NotNull @Pattern(regexp = "UNDECIDED|WHATSAPP|PHONE|FORM|WEBSITE|STORE") String destination,
        @NotNull @Size(max = 500) String destinationDetail,
        @NotNull @Size(max = 200) String timing,
        @NotNull @Size(max = 200) String budgetNote,
        @NotNull @Size(max = 20000) String aiResponse,
        @NotNull @Size(max = 12) List<@NotNull @Pattern(regexp = "offer|audience|goal|channel|destination|location|materials|timing|budget|path|searchPage|messageOwner") String> deferredRecommendations
    ) { }

    public record Plan(String id, String name, String objective, String audience, String channel,
        String notes, List<Stage> stages, String status, long version, Instant updatedAt,
        BigDecimal estimatedConversion, List<StageEstimate> stageEstimates, Workshop workshop) { }

    // Aligned with the ordered stages. The first stage has no preceding stage.
    public record StageEstimate(BigDecimal estimatedAdvance) { }

    public record PlanPage(List<Plan> items, long total, int page, int pageSize) { }
}
