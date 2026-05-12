package com.indice.erp.hr.attendance.models;

import java.time.LocalDateTime;


public record EffectiveDailyRecord(
    String effectiveStatus,
    LocalDateTime firstCheckInAt,
    LocalDateTime lastCheckOutAt
) {
}
