package com.indice.erp.files;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.time.Instant;
public final class FileContracts {
 private FileContracts(){}
 public record Entry(String id,String parentId,String kind,String name,String contentType,long sizeBytes,String ownerName,boolean owned,int permission,boolean trashed,long version,Instant updatedAt){}
 public record Crumb(String id,String name){}
 public record Page(List<Entry> items,long total,int page,int pageSize,List<Crumb> breadcrumbs,int folderPermission,String actorKey){}
 public record Member(long id,String name){}
 public record Grant(long userId,String name,int permission,boolean inherited,boolean owner){}
 public record Sharing(Entry entry,List<Grant> grants){}
 public record Folder(@NotBlank @Size(max=180) String name,String parentId){}
 public record UploadInput(@NotBlank @Size(max=180) String name,String parentId,@Min(1) @Max(104857600) long sizeBytes){}
 public record Upload(String id,String url,java.util.Map<String,String> headers,Entry ready){}
 public record Change(@Min(1) long version,@NotBlank String mutationId,@NotBlank @Pattern(regexp="RENAME|MOVE|TRASH|RESTORE") String action,@Size(max=180) String name,String parentId){}
 public record GrantInput(@Min(1) long userId,@Min(1) @Max(3) int permission){}
 public record Share(@Min(1) long version,@NotBlank String mutationId,@NotNull @Size(max=100) List<@Valid GrantInput> grants){}
}
