package com.indice.erp.pos.assistant;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;
import java.util.Map;

public final class PosOperationsContracts {
    private PosOperationsContracts() {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Query(Long id,Long cashRegisterId,LocalDate from,LocalDate to,Integer limit,String cursor) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SourceInput(Long cashRegisterId) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record SettlementInput(Long closingId,BigDecimal receivedAmount,String note) implements PosAssistantContracts.ClosedInput {}
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Change(Long id,SourceInput source,SettlementInput settlement) implements PosAssistantContracts.ClosedInput {}
    public record Closing(long id,long shiftId,long cashRegisterId,String currency,BigDecimal expectedCash,BigDecimal countedCash,
        BigDecimal overShort,BigDecimal sales,BigDecimal refunds,int tickets,Instant closedAt) {}
    public record Settlement(long id,long closingId,long shiftId,long cashRegisterId,String paymentMethod,String currency,
        BigDecimal gross,BigDecimal retained,BigDecimal transferable,long destinationAccountId,String destinationName,
        String timing,BigDecimal pending,BigDecimal postedRefunds,BigDecimal settled,BigDecimal variance,String status,long version) {}
    public record SourceLine(Long productId,String name,BigDecimal quantity,BigDecimal unitPrice,BigDecimal discount,Long discountRuleId,BigDecimal lineTotal) {}
    public record Source(long id,String kind,long cashRegisterId,String number,String status,String currency,BigDecimal total,
        BigDecimal discount,Long discountRuleId,Instant expiresAt,List<SourceLine> items) {}
    public record Records(List<Closing> closings,List<Settlement> settlements,List<Source> sources){public static Records empty(){return new Records(List.of(),List.of(),List.of());}}
    public record ReadResult(Records records,int totalCount,boolean hasMore,String nextCursor,String scope) {}
    public record Prepared(String action,Change change,Records before,Records after,Map<String,String> versions) {}
    public record Result(String action,Records records) {}
}
