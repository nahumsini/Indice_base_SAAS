package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class SquarePaymentIntentRepository {
    private final SquareIntentQueries queries;
    private final SquareIntentInsert insertion;
    private final SquareIntentGatewayPersistence gateway;
    private final SquareIntentFinalizationPersistence finalization;
    public SquarePaymentIntentRepository(SquareIntentQueries queries, SquareIntentInsert insertion,
            SquareIntentGatewayPersistence gateway, SquareIntentFinalizationPersistence finalization) {
        this.queries = queries;
        this.insertion = insertion;
        this.gateway = gateway;
        this.finalization = finalization;
    }
    public SquareRecords.PaymentIntent createOrFind(PosContext c, long r, long s, SquareRecords.Terminal t,
            String key, BigDecimal amount, String currency, String hash, String json, Instant expires) {
        return insertion.create(c, r, s, t, key, amount, currency, hash, json, expires);
    }
    public Optional<SquareRecords.PaymentIntent> findById(PosContext c, long id) { return queries.byId(c.companyId(), id, false); }
    Optional<SquareRecords.PaymentIntent> findById(long company, long id) { return queries.byId(company, id, false); }
    public Optional<SquareRecords.PaymentIntent> findByIdempotency(PosContext c, String key) { return queries.byKey(c, key); }
    public Optional<SquareRecords.PaymentIntent> findByCheckout(long company, String checkout) { return queries.byCheckout(company, checkout); }
    public List<SquareRecords.PaymentIntent> listRecoverable(PosContext c, Long register, Long shift, int limit) {
        return queries.recoverable(c, register, shift, limit);
    }
    public List<SquareRecords.PaymentIntent> findRecoveryBatch(Instant before, int limit) { return queries.batch(before, limit); }
    public Optional<SquareRecords.PaymentIntent> lockById(long company, long id) { return queries.byId(company, id, true); }
    public boolean markSubmissionStarted(long id, String request) { return gateway.submitting(id, request); }
    public boolean markSubmissionRetry(long id, Instant staleBefore) { return gateway.retrying(id, staleBefore); }
    public void markSquareCreated(long id, String checkout, String request, String response) { gateway.created(id, checkout, request, response); }
    public void markGatewayStatus(long id, SquareRecords.GatewayStatus status) { gateway.status(id, status); }
    public boolean markFinalized(long id, long ticket) { return finalization.finalized(id, ticket); }
    public void incrementFinalizeAttempt(long id) { finalization.attempted(id); }
    public void markFinalizationFailed(long id, String message) { finalization.failed(id, message); }
    public String userName(long id) { return queries.userName(id); }
}
