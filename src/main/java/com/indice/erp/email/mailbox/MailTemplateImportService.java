package com.indice.erp.email.mailbox;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.mailing.MailingFileContracts.TemplateFiles;
import com.indice.erp.sales.mailing.MailingFileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Explicit Email -> Sales read port. Both permission boundaries are rechecked. */
@Service
public class MailTemplateImportService {
    private final MailboxAccess access;
    private final MailAttachmentService attachments;
    private final MailingFileService templates;
    public MailTemplateImportService(MailboxAccess access,MailAttachmentService attachments,MailingFileService templates){this.access=access;this.attachments=attachments;this.templates=templates;}
    @Transactional
    public MailboxContracts.Message apply(AuthSessionUser actor,String account,String id,TemplateFiles in){
        access.mutation(actor,account); // Company lock serializes template and draft versions.
        var files=templates.templateSnapshot(actor,in.templateId(),in.templateVersion());
        return attachments.importShared(actor,account,id,new MailboxContracts.Version(in.version(),in.accountVersion()),files);
    }
}
