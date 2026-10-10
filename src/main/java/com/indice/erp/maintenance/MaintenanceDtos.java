package com.indice.erp.maintenance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

public final class MaintenanceDtos {
    private MaintenanceDtos() {}
    public record Page<T>(List<T> items,long total,int page,int pageSize) {}
    public record Choice(long id,String name) {}
    public record Assignment(Long unitId,Long businessId) {}
    public record Context(boolean manager,boolean administrator,long userId,Assignment assignment,
        boolean inventory,boolean expenses,boolean hrAssets,boolean tasks,Settings settings) {}
    public record Step(@NotBlank @Size(max=240) String label,boolean required,boolean done) {}
    public record Procedure(@NotBlank @Size(max=100) String name,@Size(min=1,max=40) List<@Valid Step> steps,boolean evidenceRequired) {}
    public record Settings(@NotBlank String timezone,@Pattern(regexp="[A-Z]{3}") String currency,
        @NotNull @DecimalMin("0") @DecimalMax("1000000") BigDecimal hourlyRate,
        @Min(1) @Max(8760) int criticalHours,@Min(1) @Max(8760) int highHours,
        @Min(1) @Max(8760) int normalHours,@Min(1) @Max(8760) int lowHours,
        @NotNull @Size(max=40) List<@NotBlank @Size(max=80) String> categories,
        @NotNull @Size(max=40) List<@NotBlank @Size(max=80) String> specialties,
        @NotNull @Size(max=30) List<@Valid Procedure> procedures,boolean evidenceRequired,long version) {}
    public record Asset(long id,String name,String assetType,Long hrAssetId,Long unitId,Long businessId,
        String location,String criticality,String notes,boolean active,boolean unavailable,long version) {}
    public record AssetInput(@NotBlank @Size(max=180) String name,@NotBlank String assetType,Long hrAssetId,
        Long unitId,Long businessId,@NotNull @Size(max=240) String location,@NotBlank String criticality,
        @NotNull @Size(max=6000) String notes,boolean active,Long expectedVersion) {}
    public record RequestItem(long id,Long assetId,String assetName,Long unitId,Long businessId,long requesterId,
        String title,String description,String location,String priority,String category,String status,
        Instant responseAt,Instant createdAt,Long orderId,long version) {}
    public record RequestInput(Long assetId,@NotBlank @Size(max=180) String title,
        @NotBlank @Size(max=6000) String description,@NotNull @Size(max=240) String location,
        @NotBlank String priority,@NotNull @Size(max=80) String category) {}
    public record Triage(@Min(1) long expectedVersion,boolean accept,@NotNull @Size(max=2000) String reason) {}
    public record Order(long id,Long assetId,String assetName,Long requestId,Long planId,Long unitId,Long businessId,
        String title,String description,String orderType,String priority,String category,String status,
        Long assigneeId,String assigneeName,Instant dueAt,Instant originalDueAt,Instant scheduledStart,
        Instant scheduledEnd,String timezone,String diagnosis,String resolution,List<Step> checklist,
        boolean evidenceRequired,boolean blocking,String currency,BigDecimal estimatedAmount,
        Instant startedAt,Instant closedAt,Instant createdAt,long version) {}
    public record OrderInput(Long assetId,@NotBlank @Size(max=180) String title,
        @NotNull @Size(max=6000) String description,@NotBlank String orderType,@NotBlank String priority,
        @NotNull @Size(max=80) String category,Long assigneeId,@NotNull Instant dueAt,
        Instant scheduledStart,Instant scheduledEnd,@NotBlank String timezone,
        @NotNull @Size(max=40) List<@Valid Step> checklist,boolean evidenceRequired,boolean blocking,
        @Pattern(regexp="[A-Z]{3}") String currency,@NotNull @DecimalMin("0") @DecimalMax("99999999999") BigDecimal estimatedAmount,
        @NotNull @Size(max=2000) String reason,Long expectedVersion) {}
    public record Progress(@Min(1) long expectedVersion,@NotNull @Size(max=6000) String diagnosis,
        @NotNull @Size(max=6000) String resolution,@NotNull @Size(max=40) List<Boolean> completed) {}
    public record Transition(@Min(1) long expectedVersion,@NotBlank String status,@NotNull @Size(max=2000) String reason) {}
    public record VersionReason(@Min(1) long expectedVersion,@NotBlank @Size(max=2000) String reason) {}
    public record Event(long id,String action,Long actorId,String reason,Instant createdAt) {}
    public record Attachment(long id,String filename,String contentType,long sizeBytes,Instant createdAt) {}
    public record OrderDetail(Order order,List<Event> history,List<Attachment> attachments,Long taskId) {}
    public record RequestDetail(RequestItem request,List<Event> history,List<Attachment> attachments) {}
    public record Plan(long id,long assetId,String assetName,String title,String description,String priority,
        LocalDate anchorDate,String frequency,int intervalCount,String timezone,int leadDays,int nextCycle,
        LocalDate nextDate,List<Step> checklist,boolean evidenceRequired,boolean active,String currency,
        BigDecimal estimatedAmount,long version) {}
    public record PlanInput(@Min(1) long assetId,@NotBlank @Size(max=180) String title,
        @NotNull @Size(max=6000) String description,@NotBlank String priority,@NotNull LocalDate anchorDate,
        @NotBlank String frequency,@Min(1) @Max(365) int intervalCount,@NotBlank String timezone,
        @Min(0) @Max(90) int leadDays,@NotNull @Size(min=1,max=40) List<@Valid Step> checklist,
        boolean evidenceRequired,@Pattern(regexp="[A-Z]{3}") String currency,
        @NotNull @DecimalMin("0") @DecimalMax("99999999999") BigDecimal estimatedAmount) {}
    public record Toggle(@Min(1) long expectedVersion,boolean active,@NotBlank @Size(max=2000) String reason) {}
    public record Metrics(Instant from,Instant to,long open,long overdue,long critical,long preventiveDue,
        long preventiveOnTime,Double responseHours,Double repairHours,Double downtimeHours) {}
    public record UploadInput(@NotBlank @Size(max=180) String filename,@NotBlank String contentType,
        @Min(1) @Max(10485760) long sizeBytes) {}
    public record UploadTicket(String id,String url,String method,java.util.Map<String,String> headers) {}
    public record RegisteredUpload(@NotBlank String id) {}
    public record Download(String url) {}
    public record LaborInput(@Min(1) long expectedVersion,@Min(1) @Max(1440) int minutes,@NotBlank @Size(max=2000) String note) {}
    public record PartInput(@Min(1) long expectedVersion,@Min(1) long productId,@Min(1) long warehouseId,
        @NotNull @DecimalMin("0.0001") @DecimalMax("1000000000") BigDecimal quantity) {}
    public record ExpenseInput(@Min(1) long expectedVersion,@Min(1) long expenseId,@NotBlank String costType) {}
    public record Labor(long id,long technicianId,int minutes,BigDecimal hourlyRate,BigDecimal amount,String currency,String note,boolean reversed) {}
    public record Part(long id,long movementId,String productName,String warehouseName,BigDecimal quantity,
        BigDecimal unitCost,String currency,boolean reversed) {}
    public record ExpenseLink(long id,String concept,String costType,String currency,BigDecimal actual,BigDecimal paid,boolean available) {}
    public record Costs(String currency,BigDecimal estimated,BigDecimal labor,BigDecimal parts,
        BigDecimal services,BigDecimal actual,BigDecimal paidServices,boolean complete,
        List<Labor> laborEntries,List<Part> partEntries,List<ExpenseLink> expenses) {}
}
