package com.indice.erp.systemticket;

import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Attachment;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.PresignAttachmentRequest;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.PresignAttachmentResponse;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.RegisterAttachmentRequest;
import static com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.distributorportal.DistributorPortfolioAccessPolicy;
import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.storage.ObjectStorageDisabledException;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SystemTicketAttachmentService {

    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;
    private static final int MAX_ATTACHMENTS = 10;
    private static final Map<String, String> EXTENSIONS = Map.of(
        "image/png", ".png",
        "image/jpeg", ".jpg",
        "image/webp", ".webp",
        "application/pdf", ".pdf",
        "text/plain", ".txt",
        "text/csv", ".csv",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"
    );

    private final SystemTicketOperationsRepository repository;
    private final DistributorPortfolioAccessPolicy distributorAccess;
    private final PlatformAdminAccessService platformAccess;
    private final ObjectStorageService objectStorage;
    private final ObjectStorageProperties storageProperties;
    private final CompanyStorageMeter storageMeter;

    public SystemTicketAttachmentService(
        SystemTicketOperationsRepository repository,
        DistributorPortfolioAccessPolicy distributorAccess,
        PlatformAdminAccessService platformAccess,
        ObjectStorageService objectStorage,
        ObjectStorageProperties storageProperties,
        CompanyStorageMeter storageMeter
    ) {
        this.repository = repository;
        this.distributorAccess = distributorAccess;
        this.platformAccess = platformAccess;
        this.objectStorage = objectStorage;
        this.storageProperties = storageProperties;
        this.storageMeter = storageMeter;
    }

    @Transactional
    public PresignAttachmentResponse presignForPlatform(
        long actorUserId,
        long ticketId,
        PresignAttachmentRequest request
    ) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        return presign(repository.findTicket(ticketId, null), request);
    }

    @Transactional
    public PresignAttachmentResponse presignForDistributor(
        AuthSessionUser actor,
        long ticketId,
        PresignAttachmentRequest request
    ) {
        var distributor = distributorAccess.requireDistributor(actor);
        return presign(repository.findTicket(ticketId, distributor.companyId()), request);
    }

    @Transactional
    public Attachment registerForPlatform(
        long actorUserId,
        long ticketId,
        RegisterAttachmentRequest request
    ) {
        platformAccess.require(actorUserId, "SYSTEM_TICKETS_MANAGE");
        return register(repository.findTicket(ticketId, null), actorUserId, request);
    }

    @Transactional
    public Attachment registerForDistributor(
        AuthSessionUser actor,
        long ticketId,
        RegisterAttachmentRequest request
    ) {
        var distributor = distributorAccess.requireDistributor(actor);
        return register(
            repository.findTicket(ticketId, distributor.companyId()), requireActorUserId(actor), request
        );
    }

    @Transactional(readOnly = true)
    public List<Attachment> list(Ticket ticket) {
        return repository.listAttachments(ticket.id()).stream().map(this::toAttachment).toList();
    }

    private PresignAttachmentResponse presign(Ticket ticket, PresignAttachmentRequest request) {
        requireStorage();
        if (request == null) throw new IllegalArgumentException("Attachment request is required.");
        if (repository.listAttachments(ticket.id()).size() >= MAX_ATTACHMENTS) {
            throw new IllegalArgumentException("A ticket can contain up to 10 attachments.");
        }
        var fileName = normalizeFileName(request.file_name());
        var mimeType = normalizeMimeType(request.content_type());
        validateSize(request.size_bytes());
        var objectKey = objectPrefix(ticket) + UUID.randomUUID().toString().replace("-", "") + EXTENSIONS.get(mimeType);
        var upload = storageMeter.presign(
            ticket.distributor_company_id(), "SYSTEM_TICKETS", documentsBucket(), objectKey,
            mimeType, request.size_bytes(), storageProperties.getMinio().getPresignExpirySeconds()
        );
        return new PresignAttachmentResponse(
            upload.objectKey(), upload.uploadUrl(), upload.expiresAt(), upload.uploadHeaders()
        );
    }

    private Attachment register(
        Ticket ticket,
        long actorUserId,
        RegisterAttachmentRequest request
    ) {
        requireStorage();
        if (request == null) throw new IllegalArgumentException("Attachment registration is required.");
        var fileName = normalizeFileName(request.original_filename());
        var mimeType = normalizeMimeType(request.mime_type());
        validateSize(request.size_bytes());
        var objectKey = normalizeObjectKey(ticket, request.object_key());
        if (!objectStorage.objectExists(documentsBucket(), objectKey)) {
            throw new IllegalArgumentException("Attachment upload was not found.");
        }
        var metadata = objectStorage.objectMetadata(documentsBucket(), objectKey);
        if (metadata.sizeBytes() != request.size_bytes()) {
            throw new IllegalArgumentException("Uploaded attachment size does not match the registration.");
        }
        if (metadata.contentType() != null && !metadata.contentType().isBlank()
            && !mimeType.equalsIgnoreCase(metadata.contentType())) {
            throw new IllegalArgumentException("Uploaded attachment type does not match the registration.");
        }
        storageMeter.commit(ticket.distributor_company_id(), documentsBucket(), objectKey, request.size_bytes());
        var row = repository.insertAttachment(
            ticket.id(), ticket.distributor_company_id(), actorUserId,
            fileName, mimeType, request.size_bytes(), objectKey
        );
        repository.addEvent(
            ticket.id(), actorUserId, "ATTACHMENT_ADDED", "PUBLIC",
            ticket.status(), ticket.status(), fileName
        );
        return toAttachment(row);
    }

    private Attachment toAttachment(SystemTicketOperationsRepository.AttachmentRow row) {
        var url = objectStorage.isEnabled()
            ? objectStorage.presignDownload(
                documentsBucket(), row.objectKey(), storageProperties.getMinio().getPresignExpirySeconds()
            )
            : null;
        return new Attachment(
            row.id(), row.fileName(), row.mimeType(), row.sizeBytes(), url, row.uploadedBy(), row.createdAt()
        );
    }

    private String normalizeFileName(String value) {
        var normalized = value == null ? "" : value.trim().replaceAll("[\\r\\n\\t]", " ");
        if (normalized.isBlank()) throw new IllegalArgumentException("Attachment file name is required.");
        if (normalized.length() > 255) throw new IllegalArgumentException("Attachment file name is too long.");
        return normalized;
    }

    private String normalizeMimeType(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!EXTENSIONS.containsKey(normalized)) {
            throw new IllegalArgumentException("Unsupported attachment type.");
        }
        return normalized;
    }

    private void validateSize(long sizeBytes) {
        if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachments must be between 1 byte and 10 MB.");
        }
    }

    private String normalizeObjectKey(Ticket ticket, String value) {
        var normalized = value == null ? "" : value.trim();
        if (!normalized.startsWith(objectPrefix(ticket))) {
            throw new IllegalArgumentException("Attachment does not belong to this ticket.");
        }
        return normalized;
    }

    private String objectPrefix(Ticket ticket) {
        return "system-tickets/" + ticket.distributor_company_id() + "/" + ticket.id() + "/attachments/";
    }

    private void requireStorage() {
        if (!objectStorage.isEnabled()) throw new ObjectStorageDisabledException("Object storage is not enabled.");
    }

    private long requireActorUserId(AuthSessionUser actor) {
        if (actor == null || actor.userId() == null) throw new IllegalArgumentException("Authenticated user is required.");
        return actor.userId();
    }

    private String documentsBucket() {
        return storageProperties.getMinio().getBucketDocuments();
    }
}
