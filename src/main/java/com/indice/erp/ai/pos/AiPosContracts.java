package com.indice.erp.ai.pos;
import com.indice.erp.pos.assistant.PosAssistantContracts.*;
import java.time.Instant;
import java.util.List;
public final class AiPosContracts {
    private AiPosContracts() {}
    public record Preview(String action,String confirmationToken,Instant expiresAt,boolean requiresConfirmation,
        Records before,Records after,Change changes,com.indice.erp.pos.checkout.CheckoutAssistantPreparation.Draft checkout,com.indice.erp.pos.receipt.PaidInventoryReceiptService.Preview receipt,com.indice.erp.pos.returns.PosReturnService.Inspection returnPlan,List<com.indice.erp.pos.settlement.ClosingSettlementPreview.Effect> settlements,List<String> effects) {}
    public record CommitRequest(String confirmationToken,String idempotencyKey) implements ClosedInput {}
    public record Committed(String action,boolean replayed,String correlationId,Result result) {}
    public static final class Conflict extends RuntimeException {
        private final String code;
        public Conflict(String code) {super("Prepare and confirm the current POS workflow again.");this.code=code;}
        public String code() {return code;}
    }
}
