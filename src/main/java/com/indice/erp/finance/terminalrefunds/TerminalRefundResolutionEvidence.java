package com.indice.erp.finance.terminalrefunds;

record TerminalRefundResolutionEvidence(Long paymentId, Long settlementId,
        Long paymentAccountId, Long destinationAccountId, String settlementState) {
    boolean linked() {
        return paymentId != null && settlementId != null && paymentAccountId != null
            && paymentAccountId.equals(destinationAccountId);
    }

    boolean settlementReady() {
        return "PENDING".equals(settlementState) || "SETTLED".equals(settlementState)
            || "RECONCILIATION_REQUIRED".equals(settlementState);
    }
}
