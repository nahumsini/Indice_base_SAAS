package com.indice.erp.finance.pettycash.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record ChangePettyCashFundTypeRequest(
    @NotNull @Valid UpdatePettyCashFundRequest configuration,
    @NotNull LocalDate effectiveDate,
    @NotBlank @Size(min = 8, max = 500) String reason,
    @NotNull Long expectedVersion
) {}
