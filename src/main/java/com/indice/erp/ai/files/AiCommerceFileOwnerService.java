package com.indice.erp.ai.files;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.sales.SalesOperationalFileService;
import com.indice.erp.pos.receipt.PaidReceiptOperationalFileService;
import com.indice.erp.pos.purchaseorder.assistant.SupplierInvoiceOperationalFileService;
import com.indice.erp.storage.OperationalFileReference;
import java.util.*;
import org.springframework.stereotype.Service;
import static com.indice.erp.ai.files.AiFileContracts.*;
@Service
public class AiCommerceFileOwnerService {
    private final SalesOperationalFileService sales;private final PaidReceiptOperationalFileService receipts;private final SupplierInvoiceOperationalFileService invoices;private final ObjectMapper mapper;
    public AiCommerceFileOwnerService(SalesOperationalFileService sales,PaidReceiptOperationalFileService receipts,SupplierInvoiceOperationalFileService invoices,ObjectMapper mapper){this.sales=sales;this.receipts=receipts;this.invoices=invoices;this.mapper=mapper;}
    public static boolean supports(Purpose purpose){return purpose!=null&&Set.of(Purpose.inventory_product_image,Purpose.sale_payment_evidence,Purpose.sales_contract_attachment,Purpose.supplier_invoice_attachment,Purpose.pos_receipt_attachment).contains(purpose);}
    private Object record(AuthSessionUser user,Purpose purpose,long id,boolean write,boolean lock){
        return switch(purpose){case inventory_product_image,sale_payment_evidence,sales_contract_attachment->sales.target(user,kind(purpose),id,write,lock);case supplier_invoice_attachment->invoices.target(user,id,write,lock);case pos_receipt_attachment->receipts.target(user,id,write,lock);default->throw new IllegalArgumentException("Unsupported commerce attachment.");};
    }
    public AiFileOwnerService.Target target(AuthSessionUser user,Purpose purpose,long id){
        var value=record(user,purpose,id,false,false);
        try{return new AiFileOwnerService.Target(purpose.name()+" #"+id,AiFileValidation.hash(mapper.writeValueAsString(List.of(value,files(user,purpose,id)))));}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("File target unavailable.",e);}
    }
    public void validateWrite(AuthSessionUser user,Purpose purpose,long id,boolean lock){record(user,purpose,id,true,lock);}
    public List<OperationalFileReference> files(AuthSessionUser user,Purpose purpose,long id){return switch(purpose){case inventory_product_image,sale_payment_evidence,sales_contract_attachment->sales.files(user,kind(purpose),id);case supplier_invoice_attachment->invoices.files(user,id);case pos_receipt_attachment->receipts.files(user,id);default->throw new IllegalArgumentException("Unsupported commerce attachment.");};}
    public String reserve(AuthSessionUser user,StageRequest f,long bytes){validateWrite(user,f.purpose(),f.targetId(),false);return switch(f.purpose()){case inventory_product_image,sale_payment_evidence,sales_contract_attachment->sales.reserve(user,kind(f.purpose()),f.targetId(),f.fileName(),f.mimeType(),bytes);case supplier_invoice_attachment->invoices.reserve(user,f.targetId(),f.fileName(),f.mimeType(),bytes);case pos_receipt_attachment->receipts.reserve(user,f.targetId(),f.fileName(),f.mimeType(),bytes);default->throw new IllegalArgumentException("Unsupported commerce attachment.");};}
    public void register(AuthSessionUser user,AiStagedFileRepository.Stored stored){var f=stored.view();validateWrite(user,f.purpose(),f.targetId(),true);switch(f.purpose()){case inventory_product_image,sale_payment_evidence,sales_contract_attachment->sales.register(user,kind(f.purpose()),f.targetId(),f.fileName(),f.mimeType(),f.sizeBytes(),stored.objectKey());case supplier_invoice_attachment->invoices.register(user,f.targetId(),f.fileName(),f.mimeType(),f.sizeBytes(),stored.objectKey());case pos_receipt_attachment->receipts.register(user,f.targetId(),f.fileName(),f.mimeType(),f.sizeBytes(),stored.objectKey());default->throw new IllegalArgumentException("Unsupported commerce attachment.");}}
    public String bucket(){return sales.bucket();}
    private static String kind(Purpose purpose){return switch(purpose){case inventory_product_image->"product";case sale_payment_evidence->"sale";case sales_contract_attachment->"contract";default->throw new IllegalArgumentException("Unsupported sales attachment.");};}
}
