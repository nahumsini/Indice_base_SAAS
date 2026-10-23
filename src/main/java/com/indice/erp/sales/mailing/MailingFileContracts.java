package com.indice.erp.sales.mailing;

import com.indice.erp.email.mailbox.MailFilePolicy;
import jakarta.validation.constraints.*;
import java.util.Map;

public final class MailingFileContracts {
    private MailingFileContracts() { }
    public record File(String id,String filename,String contentType,long sizeBytes) { @Override public String toString(){return "MailingFile[redacted]";} }
    public record UploadInput(@NotBlank @Pattern(regexp="[0-9a-f-]{36}") String requestId,
        @NotBlank @Size(max=180) String filename,@NotBlank @Size(max=100) String contentType,
        @Min(1) @Max(MailFilePolicy.MAX) long sizeBytes) { @Override public String toString(){return "MailingFile[redacted]";} }
    public record Upload(String id,String url,Map<String,String> headers) { @Override public String toString(){return "MailingUpload[redacted]";} }
    public record TemplateFiles(@NotBlank @Pattern(regexp="[0-9a-f-]{36}") String templateId,
        @Min(1) long templateVersion,@Min(1) long version,@Min(1) long accountVersion) { }
}
