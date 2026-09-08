package com.indice.erp.finance.expenses.dto;

/** The actual custody owner, resolved from company-scoped fund and settlement records. */
public record ExpenseFundReference(Long id, String name, String type) {}
