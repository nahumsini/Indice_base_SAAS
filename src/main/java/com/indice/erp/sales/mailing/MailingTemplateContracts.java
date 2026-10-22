package com.indice.erp.sales.mailing;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class MailingTemplateContracts {
    private MailingTemplateContracts() { }

    public record TemplateInput(
        @NotBlank @Size(max=180) String name,
        @NotBlank @Size(max=240) String subject,
        @NotNull @Size(max=240) String previewText,
        @NotBlank @Size(max=20000) String bodyText,
        @Min(0) long version, @Size(max=500000) String bodyHtml
    ) { public TemplateInput(String name,String subject,String previewText,String bodyText,long version){this(name,subject,previewText,bodyText,version,null);} }
    public record TemplateStatus(@NotBlank @Pattern(regexp="ACTIVE|ARCHIVED") String status,
        @Min(1) long version) { }
    public record Template(String id,String name,String subject,String previewText,String bodyText,
        String status,long version,Instant updatedAt,String bodyHtml) { public Template(String id,String name,String subject,String previewText,String bodyText,String status,long version,Instant updatedAt){this(id,name,subject,previewText,bodyText,status,version,updatedAt,null);} }
    public record TemplatePage(List<Template> items,long total,int page,int pageSize,boolean canManage) { }
}
