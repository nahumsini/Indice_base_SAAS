package com.indice.erp.hr.attendance.models;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;


public record LocationRow(
    long id,
    Long unitId,
    String unitName,
    Long businessId,
    String businessName,
    LocalDate contractStartDate,
    LocalDate contractEndDate,
    String name,
    BigDecimal latitude,
    BigDecimal longitude,
    int radiusMeters,
    BigDecimal requiredHoursPerDay,
    LocalTime requiredStartTime,
    LocalTime requiredEndTime,
    Integer requiredDaysPerWeek,
    String managedSource,
    String status,
    int assignedUserCount,
    String assignedUserNames
) {
    public LocationRow(
        long id,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName,
        LocalDate contractStartDate,
        LocalDate contractEndDate,
        String name,
        BigDecimal latitude,
        BigDecimal longitude,
        int radiusMeters,
        BigDecimal requiredHoursPerDay,
        LocalTime requiredStartTime,
        LocalTime requiredEndTime,
        Integer requiredDaysPerWeek,
        String status,
        int assignedUserCount,
        String assignedUserNames
    ) {
        this(
            id,
            unitId,
            unitName,
            businessId,
            businessName,
            contractStartDate,
            contractEndDate,
            name,
            latitude,
            longitude,
            radiusMeters,
            requiredHoursPerDay,
            requiredStartTime,
            requiredEndTime,
            requiredDaysPerWeek,
            "",
            status,
            assignedUserCount,
            assignedUserNames
        );
    }
}
