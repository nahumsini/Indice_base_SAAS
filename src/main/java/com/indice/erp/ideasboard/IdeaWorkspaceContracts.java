package com.indice.erp.ideasboard;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class IdeaWorkspaceContracts {
    private IdeaWorkspaceContracts() {}
    public record Element(@NotNull @Valid Node node,
        @NotNull @Pattern(regexp="PERSON|PROCESS|PRODUCT|FINANCE|OUTSIDE") String category,
        @NotNull @Size(max=40) String icon,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) @Size(max=50) List<@NotBlank @Size(max=500) String> steps,
        @JsonInclude(JsonInclude.Include.NON_NULL) @Pattern(regexp="PRODUCT|SERVICE") String offeringType) {
        public Element(Node node,String category,String icon) { this(node,category,icon,null,null); }
    }
    public record SystemViewport(@NotNull @DecimalMin("-30000") @DecimalMax("30000") Double x,
        @NotNull @DecimalMin("-30000") @DecimalMax("30000") Double y,
        @NotNull @DecimalMin("0.04") @DecimalMax("2") Double zoom) {}
    public record SystemDocument(@NotNull @Size(max=100) List<@NotNull @Valid Element> elements,
        @NotNull @Size(max=200) List<@NotNull @Valid Connection> connections,
        @NotNull @Valid SystemViewport viewport) {}
    public record SystemInput(@NotNull @Valid SystemDocument content,@Min(0) long version,@NotNull String mutationId) {}
    public record SystemBoard(SystemDocument content,long version,Instant updatedAt,String actorKey) {}
    public record ProjectInput(@NotBlank @Size(max=120) String name,
        @NotNull @Pattern(regexp="FREEFORM|SYSTEM") String kind,
        @Valid Document freeform,@Valid SystemDocument system) {}
    public record ProjectSummary(String id,String name,String kind,int nodeCount,int connectionCount,Instant createdAt) {}
    public record Project(ProjectSummary summary,Document freeform,SystemDocument system) {}
    public record ProjectPage(List<ProjectSummary> items,long total,int page,int pageSize) {}
    public static SystemDocument emptySystem() { return new SystemDocument(List.of(),List.of(),new SystemViewport(0d,0d,0.35d)); }
}
