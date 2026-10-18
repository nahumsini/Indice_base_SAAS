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
        @DecimalMin("0") @DecimalMax("10000000") @Digits(integer = 8, fraction = 0) BigDecimal target) { }

    public record PlanInput(@NotBlank @Size(max = 180) String name,
        @NotNull @Size(max = 1000) String objective,
        @NotNull @Size(max = 1000) String audience,
        @NotNull @Pattern(regexp = "EMAIL|WHATSAPP|SOCIAL|PHONE|IN_PERSON|MIXED|OTHER") String channel,
        @NotNull @Size(max = 4000) String notes,
        @NotNull @Size(min = 2, max = 12) List<@NotNull @Valid Stage> stages,
        @NotNull @Pattern(regexp = "DRAFT|PLANNED|ARCHIVED") String status,
        @Min(0) long version) { }

    public record Plan(String id, String name, String objective, String audience, String channel,
        String notes, List<Stage> stages, String status, long version, Instant updatedAt,
        BigDecimal estimatedConversion, List<StageEstimate> stageEstimates) { }

    // Aligned with the ordered stages. The first stage has no preceding stage.
    public record StageEstimate(BigDecimal estimatedAdvance) { }

    public record PlanPage(List<Plan> items, long total, int page, int pageSize) { }
}
