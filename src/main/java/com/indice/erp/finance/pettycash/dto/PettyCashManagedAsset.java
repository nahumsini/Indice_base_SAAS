package com.indice.erp.finance.pettycash.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Descriptive asset owned by a fund, not an inventory or accounting asset record. */
public record PettyCashManagedAsset(
    @NotBlank @Size(max = 48) String type,
    @NotBlank @Size(max = 180) String name,
    @Size(max = 120) String reference
) {}
