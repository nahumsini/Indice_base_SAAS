package com.indice.erp.sales;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Private evidence for an existing inventory movement; never creates stock movements. */
@Service
public class InventoryMovementAttachmentService {
    public record UploadRequest(String fileName, String contentType, long sizeBytes) {}
    public record RegisterRequest(String objectKey, String fileName, String contentType, long sizeBytes) {}
    public record FileView(String id, String movementId, String name, String type, long size, boolean registered) {}
    private record Stored(FileView view, String objectKey) {}
    private final SalesRepository records;
    private final HrOperationalScopeService scopes;
    private final ObjectStorageService storage;
    private final ObjectStorageProperties properties;
    private final CompanyStorageMeter meter;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public InventoryMovementAttachmentService(SalesRepository records, HrOperationalScopeService scopes,
            ObjectStorageService storage, ObjectStorageProperties properties, CompanyStorageMeter meter,
            JdbcTemplate jdbc, ObjectMapper mapper) {
        this.records=records; this.scopes=scopes; this.storage=storage; this.properties=properties;
        this.meter=meter; this.jdbc=jdbc; this.mapper=mapper;
    }
    private void target(AuthSessionUser user, long id, boolean write, boolean lock) {
        if (lock) jdbc.queryForList("SELECT id FROM sales_inventory_movements WHERE company_id=? AND id=? AND deleted_at IS NULL FOR UPDATE", user.companyId(), id);
        var movement=records.get(user.companyId(), SalesDefinitions.definitions().get("inventory-movements"), id);
        scopes.requireAssignmentInScope(user, SalesPayloadSupport.longValue(movement,"businessUnitId"), SalesPayloadSupport.longValue(movement,"businessId"));
        if (write && "cancelled".equalsIgnoreCase(Objects.toString(movement.get("status"),"")))
            throw new IllegalArgumentException("El movimiento está cancelado; no se pueden agregar archivos.");
    }
    private List<Stored> stored(AuthSessionUser user, long id) {
        return jdbc.query("SELECT id,file_name,object_key,JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.contentType')) AS mime,JSON_EXTRACT(metadata_json,'$.sizeBytes') AS bytes FROM sales_files WHERE company_id=? AND entity_type='inventory_movement' AND entity_id=? AND source='object_storage' AND deleted_at IS NULL ORDER BY id",
            (rs,n)->new Stored(new FileView(String.valueOf(rs.getLong("id")),String.valueOf(id),rs.getString("file_name"),rs.getString("mime"),rs.getLong("bytes"),true),rs.getString("object_key")),user.companyId(),id).stream()
            .filter(file -> file.objectKey()!=null && file.objectKey().startsWith("inventory/movements/"+user.companyId()+"/"+id+"/"))
            .toList();
    }
    @Transactional(readOnly=true)
    public List<FileView> list(AuthSessionUser user, long id) {
        target(user,id,false,false);
        return stored(user,id).stream().map(Stored::view).toList();
    }
    @Transactional
    public PresignedUpload reserve(AuthSessionUser user, long id, UploadRequest request) {
        target(user,id,true,true); enabled();
        validate(request.fileName(),request.contentType(),request.sizeBytes());
        if (stored(user,id).size()>=10) throw new IllegalArgumentException("Puedes guardar hasta 10 archivos por movimiento.");
        String key=prefix(user,id,request.fileName(),request.contentType(),request.sizeBytes())+UUID.randomUUID();
        return meter.presign(user.companyId(),"SALES",bucket(),key,request.contentType(),request.sizeBytes(),properties.getMinio().getPresignExpirySeconds());
    }
    @Transactional
    public FileView register(AuthSessionUser user, long id, RegisterRequest request) {
        target(user,id,true,true); enabled();
        validate(request.fileName(),request.contentType(),request.sizeBytes());
        String prefix=prefix(user,id,request.fileName(),request.contentType(),request.sizeBytes());
        String key=request.objectKey();
        if(key==null || !key.startsWith(prefix)) throw new IllegalArgumentException("El archivo no pertenece a esta carga y movimiento.");
        try { UUID.fromString(key.substring(prefix.length())); } catch(IllegalArgumentException ex) { throw new IllegalArgumentException("La referencia del archivo no es válida."); }
        var files=stored(user,id);
        var existing=files.stream().filter(file->file.objectKey().equals(key)).findFirst();
        if(existing.isPresent()) return existing.get().view();
        if(files.size()>=10) throw new IllegalArgumentException("Puedes guardar hasta 10 archivos por movimiento.");
        if(!storage.objectExists(bucket(),key)) throw new IllegalArgumentException("El archivo no terminó de cargarse. Intenta nuevamente.");
        var metadata=storage.objectMetadata(bucket(),key);
        if(metadata.sizeBytes()!=request.sizeBytes() || !request.contentType().equalsIgnoreCase(metadata.contentType()))
            throw new IllegalArgumentException("El tamaño o tipo del archivo no coincide con la carga autorizada.");
        if(!validSignature(request.contentType(),storage.readObjectPrefix(bucket(),key,16)))
            throw new IllegalArgumentException("El contenido del archivo no coincide con su formato. Usa un PDF o una imagen válida.");
        meter.commit(user.companyId(),bucket(),key,request.sizeBytes());
        long fileId=records.createFile(user.companyId(),user.userId(),Map.of("entityType","inventory_movement","entityId",id,"fileName",request.fileName(),"fileKind","inventory_evidence","fileStatus","uploaded","source","object_storage","objectKey",key,"metadata",Map.of("contentType",request.contentType(),"sizeBytes",request.sizeBytes())));
        var view=new FileView(String.valueOf(fileId),String.valueOf(id),request.fileName(),request.contentType(),request.sizeBytes(),true);
        try {
            jdbc.update("UPDATE sales_inventory_movements SET attachments_json=JSON_ARRAY_APPEND(COALESCE(attachments_json,JSON_ARRAY()),'$',CAST(? AS JSON)) WHERE company_id=? AND id=? AND deleted_at IS NULL",mapper.writeValueAsString(view),user.companyId(),id);
        } catch(JsonProcessingException ex) { throw new IllegalStateException("No se pudo registrar el archivo.",ex); }
        return view;
    }
    @Transactional(readOnly=true)
    public String download(AuthSessionUser user,long id,long fileId) {
        target(user,id,false,false); enabled();
        var file=stored(user,id).stream().filter(value->value.view().id().equals(String.valueOf(fileId))).findFirst()
            .orElseThrow(()->new NoSuchElementException("Archivo no encontrado en este movimiento."));
        return storage.presignDownload(bucket(),file.objectKey(),properties.getMinio().getPresignExpirySeconds());
    }
    private void enabled(){ if(!storage.isEnabled()) throw new ObjectStorageDisabledException("El almacenamiento de archivos no está disponible. El movimiento permanece guardado; puedes reintentar los archivos después."); }
    private String bucket(){return properties.getMinio().getBucketSalesDocuments();}
    private static String prefix(AuthSessionUser user,long id,String name,String mime,long size) {
        try {
            var digest=MessageDigest.getInstance("SHA-256").digest((name+"\0"+mime+"\0"+size).getBytes(StandardCharsets.UTF_8));
            return "inventory/movements/"+user.companyId()+"/"+id+"/"+user.userId()+"/"+HexFormat.of().formatHex(digest)+"/";
        } catch(java.security.NoSuchAlgorithmException ex){throw new IllegalStateException(ex);}
    }
    static void validate(String name,String mime,long bytes) {
        if(name==null || name.isBlank() || name.length()>240 || name.contains("/") || name.contains("\\") || name.chars().anyMatch(Character::isISOControl))
            throw new IllegalArgumentException("El nombre del archivo no es válido.");
        if(bytes<=0 || bytes>10*1024*1024) throw new IllegalArgumentException("Cada archivo debe tener contenido y pesar hasta 10 MB.");
        var extensions=Map.of("application/pdf",List.of(".pdf"),"image/jpeg",List.of(".jpg",".jpeg"),"image/png",List.of(".png"),"image/webp",List.of(".webp"));
        var allowed=extensions.get(mime==null?"":mime);
        if(allowed==null || allowed.stream().noneMatch(name.toLowerCase(Locale.ROOT)::endsWith))
            throw new IllegalArgumentException("Usa archivos PDF, JPG, PNG o WebP.");
    }
    static boolean validSignature(String mime,byte[] bytes) {
        if(bytes==null) return false;
        return switch(mime) {
            case "application/pdf" -> bytes.length>=5 && new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-");
            case "image/jpeg" -> bytes.length>=3 && (bytes[0]&255)==255 && (bytes[1]&255)==216 && (bytes[2]&255)==255;
            case "image/png" -> bytes.length>=8 && Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10});
            case "image/webp" -> bytes.length>=12 && new String(bytes,0,4,StandardCharsets.US_ASCII).equals("RIFF") && new String(bytes,8,4,StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
    }
}
