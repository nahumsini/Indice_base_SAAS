package com.indice.erp.hr.kpis;
import java.time.LocalDate;
import java.util.List;
public final class HrKpiContracts {
    private HrKpiContracts(){ }
    public record Request(LocalDate date,LocalDate from,LocalDate to,Long unitId,Long businessId,String department,String query,String attendanceStatus){ }
    public record Availability(boolean people,boolean attendance,boolean assets,boolean records,boolean permissions){ }
    public record Source(String name,boolean available,String reason){ }
    public record Workforce(int total,int active,int inactive,int terminated){ }
    public record Attendance(int scheduled,int onTime,int late,int absence,int pending,int rest,int leave,int unconfigured,
        int present,int completedSample,Integer attendanceRate,Integer punctualityRate){ }
    public record Assets(int total,int assignedItems,int assignedPeople,int available,int maintenance,int inactive){ }
    public record Records(int total,int open,int criticalOpen,int pending,int reviewed,int resolved){ }
    public record Permissions(int total,int pending,int approved,int rejected){ }
    public record Result(int definitionVersion,LocalDate date,LocalDate from,LocalDate to,LocalDate previousDate,
        Workforce workforce,Attendance attendance,Attendance previousAttendance,Assets assets,Records records,
        Permissions permissions,List<Source> sources){ }
}
