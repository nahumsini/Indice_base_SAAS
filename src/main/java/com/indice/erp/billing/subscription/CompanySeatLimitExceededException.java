package com.indice.erp.billing.subscription;

import java.util.LinkedHashMap;
import java.util.Map;

public class CompanySeatLimitExceededException extends RuntimeException {

    private final String code;
    private final CompanySeatAllowance allowance;

    public CompanySeatLimitExceededException(String message, String code, CompanySeatAllowance allowance) {
        super(message);
        this.code = code;
        this.allowance = allowance;
    }

    public Map<String, Object> responseBody() {
        var body = new LinkedHashMap<String, Object>();
        body.put("message", getMessage());
        body.put("code", code);
        body.put("allowed_collaborators", allowance.allowedSeats());
        body.put("used_collaborators", allowance.usedSeats());
        body.put("remaining_collaborators", allowance.remainingSeats());
        return body;
    }
}
