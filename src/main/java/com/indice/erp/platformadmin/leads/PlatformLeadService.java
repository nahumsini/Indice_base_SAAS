package com.indice.erp.platformadmin.leads;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Detail;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Page;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Submission;
import com.indice.erp.platformadmin.leads.PlatformLeadContracts.Update;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PlatformLeadService {
    private static final Map<String, Set<String>> NEXT = Map.of(
        "NEW", Set.of("CONTACTED", "DIAGNOSIS_SCHEDULED", "NURTURE", "LOST"),
        "CONTACTED", Set.of("DIAGNOSIS_SCHEDULED", "NURTURE", "LOST"),
        "DIAGNOSIS_SCHEDULED", Set.of("CONTACTED", "DIAGNOSIS_COMPLETED", "NURTURE", "LOST"),
        "DIAGNOSIS_COMPLETED", Set.of("TRIAL_ACTIVE", "PROPOSAL", "NURTURE", "LOST"),
        "TRIAL_ACTIVE", Set.of("PROPOSAL", "NURTURE", "LOST"),
        "PROPOSAL", Set.of("WON", "LOST", "NURTURE"),
        "NURTURE", Set.of("CONTACTED", "DIAGNOSIS_SCHEDULED", "LOST"),
        "LOST", Set.of("CONTACTED"),
        "WON", Set.of()
    );

    private final PlatformLeadRepository repository;
    private final PlatformAdminAccessService access;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final String ingestSecret;

    public PlatformLeadService(
        PlatformLeadRepository repository,
        PlatformAdminAccessService access,
        ObjectMapper mapper,
        Clock clock,
        @Value("${app.platform-leads.ingest-secret:}") String ingestSecret
    ) {
        this.repository = repository;
        this.access = access;
        this.mapper = mapper;
        this.clock = clock;
        this.ingestSecret = ingestSecret;
    }

    @Transactional
    public long ingest(String submissionId, String timestamp, String signature, byte[] rawBody) {
        var id = uuid(submissionId);
        verifySignature(id, timestamp, signature, rawBody);
        Submission raw;
        try {
            raw = mapper.readValue(rawBody, Submission.class);
        } catch (Exception invalid) {
            throw new IllegalArgumentException("Invalid lead request.");
        }
        var input = validate(raw);
        var hash = HexFormat.of().formatHex(sha256(rawBody));
        var existing = repository.findIdBySubmission(id);
        if (existing != null) return sameSubmission(existing, hash);
        try {
            var created = repository.insert(id, hash, input, clock.instant());
            repository.event(created, null, "SUBMITTED", null, "NEW", null);
            return created;
        } catch (DuplicateKeyException duplicate) {
            var concurrent = repository.findIdBySubmission(id);
            if (concurrent == null) throw duplicate;
            return sameSubmission(concurrent, hash);
        }
    }

    public Page list(long actorUserId, String query, String status) {
        authorize(actorUserId);
        var normalizedStatus = status == null ? "" : status.trim().toUpperCase();
        if (!normalizedStatus.isEmpty() && !NEXT.containsKey(normalizedStatus)) {
            throw new IllegalArgumentException("Unknown lead status.");
        }
        return repository.list(text(query, 120, false), normalizedStatus, 200);
    }

    /** Native billing-entry owner contract. No HTTP route or platform permission is granted. */
    @Transactional
    public long captureSelfServiceInterest(String submissionId, String fingerprint, Submission submission) {
        var input = validate(submission);
        var existing = repository.findIdBySubmission(uuid(submissionId));
        if (existing != null) return sameSubmission(existing, fingerprint);
        var id = repository.insert(submissionId, fingerprint, input, clock.instant());
        repository.event(id, null, "SELF_SERVICE_INTEREST", null, "NEW", null);
        return id;
    }

    public Submission selfServiceInterest(long leadId) {
        var lead = repository.find(leadId);
        if (lead == null) throw new IllegalArgumentException("Trial entry was not found.");
        return new Submission(lead.fullName(), lead.companyName(), lead.email(), lead.phone(), lead.country(),
            lead.challenge(), lead.landingPath(), lead.sourceChannel(), lead.utmSource(), lead.utmMedium(),
            lead.utmCampaign(), lead.planInterest(), true);
    }

    /** Called only after verified native tenant provisioning, inside the same transaction. */
    @Transactional
    public void recordSelfServiceTrial(long leadId, String verifiedEmail, Instant startsAt, Instant endsAt) {
        var lead = repository.find(leadId);
        if (lead == null || !lead.email().equalsIgnoreCase(verifiedEmail)) {
            throw new SecurityException("Trial lead binding was rejected.");
        }
        if (lead.trialStartedAt() != null) {
            if (!lead.trialStartedAt().equals(startsAt) || !lead.trialEndsAt().equals(endsAt)) {
                throw new IllegalStateException("The trial window cannot be restarted.");
            }
            return;
        }
        if (Set.of("WON", "LOST").contains(lead.status())) {
            throw new IllegalStateException("The lead was closed. Trial entry requires review.");
        }
        if (!repository.update(leadId, lead.version(), "TRIAL_ACTIVE", lead.assignedAdminId(),
            startsAt.plus(Duration.ofDays(3)), lead.diagnosisCompletedAt(), startsAt, endsAt)) {
            throw new IllegalStateException("Lead changed. Please retry.");
        }
        repository.event(leadId, null, "SELF_SERVICE_TRIAL_STARTED", lead.status(), "TRIAL_ACTIVE", null);
    }

    public Detail detail(long actorUserId, long id) {
        authorize(actorUserId);
        var lead = repository.find(id);
        if (lead == null) throw new NoSuchElementException("Lead not found.");
        return new Detail(lead, repository.events(id));
    }

    public java.util.List<PlatformLeadContracts.Assignee> assignees(long actorUserId) {
        authorize(actorUserId);
        return repository.assignees();
    }

    @Transactional
    public Detail update(long actorUserId, long id, Update request) {
        authorize(actorUserId);
        if (request == null) throw new IllegalArgumentException("Update is required.");
        var current = repository.find(id);
        if (current == null) throw new NoSuchElementException("Lead not found.");
        if (request.version() != current.version()) throw new IllegalStateException("Lead changed. Refresh before saving.");
        var status = request.status() == null ? current.status() : request.status().trim().toUpperCase();
        if (!NEXT.containsKey(status) || (!status.equals(current.status())
            && !NEXT.get(current.status()).contains(status))) {
            throw new IllegalArgumentException("This lead status transition is not allowed.");
        }
        var assigned = request.assignedAdminId() == null ? current.assignedAdminId()
            : request.assignedAdminId() == 0 ? null : request.assignedAdminId();
        if (assigned != null && !repository.activeAssignee(assigned)) {
            throw new IllegalArgumentException("Choose an active platform administrator.");
        }
        var note = text(request.note(), 2000, false);
        if (("LOST".equals(status) || "NURTURE".equals(status))
            && !status.equals(current.status()) && note.isEmpty()) {
            throw new IllegalArgumentException("A reason is required for this outcome.");
        }
        var now = clock.instant();
        var diagnosisAt = current.diagnosisCompletedAt();
        var trialAt = current.trialStartedAt();
        var trialEnd = current.trialEndsAt();
        var nextAction = request.clearNextAction() ? null
            : request.nextActionAt() == null ? current.nextActionAt() : request.nextActionAt();
        if ("DIAGNOSIS_COMPLETED".equals(status) && diagnosisAt == null) diagnosisAt = now;
        if ("TRIAL_ACTIVE".equals(status) && trialAt == null) {
            if (diagnosisAt == null) throw new IllegalArgumentException("Complete the diagnosis before starting a trial.");
            trialAt = now;
            trialEnd = now.plus(Duration.ofDays(15));
            if (request.nextActionAt() == null) nextAction = now.plus(Duration.ofDays(3));
        }
        if ("WON".equals(status) || "LOST".equals(status)) nextAction = null;
        if (status.equals(current.status()) && java.util.Objects.equals(assigned, current.assignedAdminId())
            && java.util.Objects.equals(nextAction, current.nextActionAt()) && note.isEmpty()) {
            throw new IllegalArgumentException("There is no change to save.");
        }
        if (!repository.update(id, current.version(), status, assigned, nextAction, diagnosisAt, trialAt, trialEnd)) {
            throw new IllegalStateException("Lead changed. Refresh before saving.");
        }
        repository.event(id, actorUserId, status.equals(current.status()) ? "FOLLOW_UP" : "STATUS_CHANGED",
            current.status(), status, note.isEmpty() ? null : note);
        return new Detail(repository.find(id), repository.events(id));
    }

    private void authorize(long actorUserId) {
        access.require(actorUserId, "MANAGE_LEADS");
    }

    private long sameSubmission(long id, String hash) {
        if (!hash.equals(repository.payloadHash(id))) {
            throw new IllegalArgumentException("Submission reference was already used.");
        }
        return id;
    }

    private void verifySignature(String id, String timestamp, String signature, byte[] body) {
        if (ingestSecret == null || ingestSecret.length() < 32) {
            throw new IllegalStateException("Lead intake is not configured.");
        }
        if (body == null || body.length == 0 || body.length > 8192) {
            throw new IllegalArgumentException("Invalid lead request size.");
        }
        long sentAt;
        try {
            sentAt = Long.parseLong(timestamp);
        } catch (RuntimeException invalid) {
            throw new SecurityException("Lead intake signature was rejected.");
        }
        if (Math.abs(clock.instant().getEpochSecond() - sentAt) > 300) {
            throw new SecurityException("Lead intake signature was rejected.");
        }
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(ingestSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            mac.update((timestamp + "\n" + id + "\n").getBytes(StandardCharsets.UTF_8));
            var expected = mac.doFinal(body);
            var provided = HexFormat.of().parseHex(signature == null ? "" : signature);
            if (!MessageDigest.isEqual(expected, provided)) {
                throw new SecurityException("Lead intake signature was rejected.");
            }
        } catch (SecurityException rejected) {
            throw rejected;
        } catch (Exception invalid) {
            throw new SecurityException("Lead intake signature was rejected.");
        }
    }

    private static String uuid(String value) {
        try {
            return UUID.fromString(value == null ? "" : value).toString();
        } catch (IllegalArgumentException invalid) {
            throw new IllegalArgumentException("Invalid submission reference.");
        }
    }

    private static byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (Exception failure) {
            throw new IllegalStateException("Lead intake could not be completed.");
        }
    }

    private static Submission validate(Submission input) {
        if (input == null || !input.contactConsent()) {
            throw new IllegalArgumentException("Contact permission is required.");
        }
        var name = text(input.fullName(), 120, true);
        var company = text(input.companyName(), 160, true);
        var email = text(input.email(), 180, true).toLowerCase(java.util.Locale.ROOT);
        var challenge = text(input.challenge(), 3000, true);
        if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("A valid email is required.");
        }
        var landingPath = text(input.landingPath(), 255, false);
        if (!landingPath.isEmpty() && !landingPath.startsWith("/")) {
            throw new IllegalArgumentException("Invalid landing path.");
        }
        var channel = text(input.sourceChannel(), 32, true).toUpperCase(java.util.Locale.ROOT);
        if (!Set.of("WEBSITE", "SOCIAL").contains(channel)) {
            throw new IllegalArgumentException("Invalid lead channel.");
        }
        var planInterest = text(input.planInterest(), 20, false).toUpperCase(java.util.Locale.ROOT);
        if (!planInterest.isEmpty() && !Set.of("CONTROLA", "ESCALA", "CORPORATIVO").contains(planInterest)) {
            throw new IllegalArgumentException("Invalid plan interest.");
        }
        return new Submission(name, company, email, text(input.phone(), 40, false),
            text(input.country(), 80, false), challenge, landingPath, channel,
            text(input.utmSource(), 100, false), text(input.utmMedium(), 100, false),
            text(input.utmCampaign(), 150, false), planInterest.isEmpty() ? null : planInterest, true);
    }

    private static String text(String value, int max, boolean required) {
        var normalized = value == null ? "" : value.trim();
        if (normalized.length() > max || (required && normalized.isEmpty())) {
            throw new IllegalArgumentException("Invalid lead field.");
        }
        return normalized;
    }
}
