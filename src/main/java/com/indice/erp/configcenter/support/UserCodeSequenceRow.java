package com.indice.erp.configcenter.support;

public record UserCodeSequenceRow(
    String prefix,
    int padding,
    long nextNumber
) {
}
