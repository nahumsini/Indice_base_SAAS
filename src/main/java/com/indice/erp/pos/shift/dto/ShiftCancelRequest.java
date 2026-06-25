package com.indice.erp.pos.shift.dto;

import jakarta.validation.constraints.NotBlank;

public record ShiftCancelRequest(
        @NotBlank String reason) {
}
