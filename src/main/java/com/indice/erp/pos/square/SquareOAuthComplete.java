package com.indice.erp.pos.square;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SquareOAuthComplete(@NotBlank @Size(max=191) String code,
    @NotBlank @Pattern(regexp="[a-f0-9]{64}") String state) {
    @Override public String toString() { return "SquareOAuthComplete[redacted]"; }
}
