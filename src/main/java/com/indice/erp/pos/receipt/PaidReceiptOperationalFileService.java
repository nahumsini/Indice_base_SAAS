package com.indice.erp.pos.receipt;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.assistant.PosAssistantService;
import com.indice.erp.storage.OperationalFileReference;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
@Service
public class PaidReceiptOperationalFileService {
    private final PosAssistantService access;private final PaidInventoryReceiptService owner;private final PaidInventoryReceiptRepository records;private final JdbcTemplate jdbc;
    public PaidReceiptOperationalFileService(PosAssistantService access,PaidInventoryReceiptService owner,PaidInventoryReceiptRepository records,JdbcTemplate jdbc){this.access=access;this.owner=owner;this.records=records;this.jdbc=jdbc;}
    public PaidInventoryReceiptDtos.ReceiptResponse target(AuthSessionUser user,long id,boolean write,boolean lock){
        var ctx=access.context(user);if(lock)records.lockReceipt(ctx,id);var result=owner.get(ctx,id);
        if(write&&!"POSTED".equals(result.status()))throw new IllegalArgumentException("Reversed receipts cannot receive new attachments.");
        // Attachment URLs are transient and belong to the browser delivery channel, not the approval snapshot.
        return new PaidInventoryReceiptDtos.ReceiptResponse(result.id(),result.receiptNumber(),result.cashRegisterId(),result.shiftId(),result.warehouseId(),result.warehouseName(),result.providerId(),result.providerName(),result.paymentMethod(),result.paymentAccountId(),result.subtotalAmount(),result.taxAmount(),result.totalAmount(),result.currencyCode(),result.paymentReference(),result.status(),result.reversalReason(),result.items(),java.util.Map.of());
    }
    public List<OperationalFileReference> files(AuthSessionUser user,long id){target(user,id,false,false);return jdbc.query("SELECT id,file_name,content_type,size_bytes,object_key FROM pos_inventory_receipt_attachments WHERE company_id=? AND receipt_id=? ORDER BY id",(rs,n)->new OperationalFileReference(rs.getLong("id"),rs.getString("file_name"),rs.getString("content_type"),rs.getLong("size_bytes"),rs.getString("object_key")),user.companyId(),id);}
    public String reserve(AuthSessionUser user,long id,String name,String mime,long bytes){return owner.presignAttachment(access.context(user),id,new PaidInventoryReceiptDtos.AttachmentUploadRequest(name,mime,bytes)).objectKey();}
    public void register(AuthSessionUser user,long id,String name,String mime,long bytes,String key){owner.registerAttachment(access.context(user),id,new PaidInventoryReceiptDtos.AttachmentRegisterRequest(key,name,mime,bytes));}
}
