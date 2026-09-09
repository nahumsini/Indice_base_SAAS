package com.indice.erp.billing.collection;

import com.indice.erp.notifications.AppNotificationEvent;
import com.indice.erp.notifications.AppNotificationService;
import java.time.Clock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PaymentRequestReminderService {
    private static final Logger LOGGER = LoggerFactory.getLogger(PaymentRequestReminderService.class);
    private final PaymentRequestReminderRepository repository;
    private final PaymentRequestReminderEmailService email;
    private final AppNotificationService notifications;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final boolean remindersEnabled;
    private final boolean emailEnabled;

    public PaymentRequestReminderService(PaymentRequestReminderRepository repository,
                                        PaymentRequestReminderEmailService email,
                                        AppNotificationService notifications,
                                        TransactionTemplate transactions, Clock clock,
                                        @Value("${app.billing.collection.reminders-enabled:false}") boolean remindersEnabled,
                                        @Value("${app.billing.collection.email-enabled:false}") boolean emailEnabled) {
        this.repository = repository;
        this.email = email;
        this.notifications = notifications;
        this.transactions = transactions;
        this.clock = clock;
        this.remindersEnabled = remindersEnabled;
        this.emailEnabled = emailEnabled;
    }

    public void enqueueWindow(long companyId, long requestId) {
        repository.enqueueWindow(companyId, requestId);
    }

    public boolean isEmailConfigured() {
        return emailEnabled && email.isConfigured();
    }

    @Scheduled(fixedDelayString = "${app.billing.collection.reminder-delay-ms:60000}")
    public void processDue() {
        if (!remindersEnabled) return;
        for (var candidate : repository.due(clock.instant(), emailEnabled)) {
            PaymentRequestReminderRepository.Claim claim = null;
            try {
                claim = repository.claim(candidate, clock.instant());
                if (claim == null) continue;
                if ("IN_APP".equals(claim.channel())) {
                    deliverNotification(claim);
                } else {
                    deliverEmail(claim);
                }
            } catch (RuntimeException failure) {
                // Do not put provider payloads, credentials or recipient data into logs/outbox errors.
                LOGGER.warn("payment_request_reminder_failed companyId={} deliveryId={}", candidate.companyId(), candidate.id());
                if (claim != null) {
                    try {
                        repository.complete(claim, clock.instant(), false, null, "DELIVERY_FAILED");
                    } catch (RuntimeException persistenceFailure) {
                        // The persisted lease remains recoverable by a later worker.
                        LOGGER.warn("payment_request_reminder_retry_persistence_failed companyId={} deliveryId={}",
                            candidate.companyId(), candidate.id());
                    }
                }
            }
        }
    }

    private void deliverEmail(PaymentRequestReminderRepository.Claim claim) {
        var dispatch = repository.prepareDispatch(claim, clock.instant());
        if (dispatch == null) return;
        // Provider IO is outside database transactions. Every attempt has a fresh status/generation check.
        var result = email.send(dispatch);
        repository.complete(claim, clock.instant(), result.sent(), result.providerReference(), result.errorCode());
    }

    private void deliverNotification(PaymentRequestReminderRepository.Claim claim) {
        transactions.executeWithoutResult(tx -> {
            var dispatch = repository.prepareDispatch(claim, clock.instant());
            if (dispatch == null) return;
            notifications.publish(new AppNotificationEvent(
                claim.candidate().companyId(), dispatch.owner().membershipId(), "billing", "payment_request",
                claim.candidate().requestId(), "payment_requested", dispatch.deliveryKey(), "Pago pendiente",
                "Revisa la solicitud de pago " + dispatch.reference() + ". Fecha límite: " + dispatch.deadlineAt() + " (UTC).",
                "/billing"
            ));
            // The notification and SENT record commit together, so a crash cannot duplicate this channel.
            repository.complete(claim, clock.instant(), true, dispatch.deliveryKey(), null);
        });
    }
}
