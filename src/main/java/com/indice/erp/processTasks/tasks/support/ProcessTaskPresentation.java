package com.indice.erp.processTasks.tasks.support;

public final class ProcessTaskPresentation {

    private ProcessTaskPresentation() {
    }

    public static String fallback(String value, String fallbackValue) {
        if (value == null || value.isBlank()) {
            return fallbackValue;
        }

        return value;
    }
}
