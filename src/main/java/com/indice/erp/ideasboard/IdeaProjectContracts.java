package com.indice.erp.ideasboard;

import jakarta.validation.constraints.*;
import java.util.List;

public final class IdeaProjectContracts {
    private IdeaProjectContracts() {}
    public record Change(@Min(0) long version,@NotNull String mutationId,
        @Size(max=120) String name,Boolean trashed) {}
    public record ShareChange(@Min(0) long version,@NotNull String mutationId,
        @NotNull @Size(max=50) List<@NotNull @Positive Long> userIds) {}
    public record Copy(@NotBlank @Size(max=120) String name) {}
    public record Member(long id,String name,boolean available) {}
    public record Sharing(long version,List<Member> members) {}
}
