package com.indice.erp.ai.files;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.hr.*;
import com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import static com.indice.erp.ai.files.AiFileContracts.*;

/** Real owner/confirmation/Flyway SQL on the isolated database; only external storage is simulated. */
@SpringBootTest(properties={"app.email.enabled=false","app.entitlements.projection-enabled=false","indice.ai.file-cleanup-delay-ms=3600000"})
@Transactional
class AiFileWorkflowIntegrationTest {
    @Autowired JdbcTemplate jdbc;@Autowired AiAccessTokenRepository tokens;@Autowired AiHrActionService hr;
    @Autowired AiFileIntakeService intake;@Autowired AiFileActionService actions;@Autowired AiFileOwnerService owner;@Autowired AiFileAccess access;
    @Autowired ProcessTasksService tasks;@Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired AiFileCleanupService cleanup;
    @Autowired AiCommerceReportService commerceReports;
    @MockitoBean AiToolAuthorizationService authorization;@MockitoBean ObjectStorageService storage;@MockitoBean CompanyStorageMeter meter;
    final Map<String,byte[]> objects=new HashMap<>();final Map<String,String> mimes=new HashMap<>();
    StoredToken token;long company,unit,business,person;final byte[] pdf="%PDF-1.4\nSynthetic isolated attachment\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    @BeforeEach void fixture() {
        String unique=UUID.randomUUID().toString();jdbc.update("INSERT INTO companies(name) VALUES(?)","Synthetic files "+unique);
        company=jdbc.queryForObject("SELECT id FROM companies WHERE name=?",Long.class,"Synthetic files "+unique);
        jdbc.update("INSERT INTO users(email,password_hash,full_name) VALUES(?,'test','Synthetic file operator')",unique+"@example.test");
        long user=jdbc.queryForObject("SELECT id FROM users WHERE email=?",Long.class,unique+"@example.test");
        jdbc.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES(?,?,'root','active','all')",user,company);
        long member=jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,company,user);
        jdbc.update("INSERT INTO units(company_id,name,status) VALUES(?,'Synthetic file unit','active')",company);unit=jdbc.queryForObject("SELECT id FROM units WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES(?,?,'Synthetic file business','active')",company,unit);business=jdbc.queryForObject("SELECT id FROM businesses WHERE company_id=?",Long.class,company);
        var actor=new AuthSessionUser(user,company,member,"Synthetic file operator","root");
        var scopes=Set.of("files.attach","files.read","hr.people.manage","hr.people.details:read","hr.assets.manage","hr.assets.read","hr.announcements.manage","hr.announcements.read","hr.records.manage","hr.records.read","hr.permissions.request","hr.permissions.review","hr.permissions.read","hr.permissions.self:read","tasks.operate","tasks.read","hr.payroll.read","hr.payroll.prepare");
        long id=tokens.insert(actor,"generic_mcp","Synthetic files","test",unique.replace("-","")+UUID.randomUUID().toString().replace("-",""),Instant.now().plusSeconds(3600),scopes);token=new StoredToken(id,actor,scopes);
        when(authorization.canReadGuideTab(any(),eq("human_resources"),anyString())).thenReturn(true);when(authorization.canCreateTask(any())).thenReturn(true);when(authorization.canReadTasks(any())).thenReturn(true);
        when(storage.isEnabled()).thenReturn(true);when(meter.reservationTtl()).thenReturn(Duration.ofMinutes(15));
        when(storage.presignDownload(anyString(),anyString(),anyInt())).thenReturn("https://private.invalid/must-not-leak");
        when(meter.presign(anyLong(),anyString(),anyString(),anyString(),anyString(),anyLong(),anyInt())).thenAnswer(i->new PresignedUpload(i.getArgument(3),"https://private.invalid/must-not-leak",Instant.now().plusSeconds(900),Map.of()));
        doAnswer(i->{String key=i.getArgument(1);objects.put(key,((byte[])i.getArgument(3)).clone());mimes.put(key,i.getArgument(2));return null;}).when(storage).writeObject(anyString(),anyString(),anyString(),any(byte[].class));
        when(storage.objectExists(anyString(),anyString())).thenAnswer(i->objects.containsKey(i.getArgument(1)));
        when(storage.objectMetadata(anyString(),anyString())).thenAnswer(i->{String key=i.getArgument(1);return new StoredObjectMetadata(objects.get(key).length,mimes.get(key));});
        when(storage.readObject(anyString(),anyString(),anyInt())).thenAnswer(i->{var bytes=objects.get(i.getArgument(1));if(bytes==null||bytes.length>(Integer)i.getArgument(2))throw new IllegalArgumentException("Invalid stored size");return bytes.clone();});
        doAnswer(i->{objects.remove(i.getArgument(1));mimes.remove(i.getArgument(1));return null;}).when(storage).deleteObject(anyString(),anyString());
        var employee=new EmployeeChange("Synthetic","File employee",UUID.randomUUID()+"@example.test",null,"Operator","Operations",unit,business,null,new BigDecimal("150"),"weekly","daily",null,"permanent",null,null,"CA");
        person=applyHr("create_employee",new Change(null,employee,null,null,null)).employees().getFirst().userCompanyId();
    }
    @Test void employeeFileIsTemporaryUntilConfirmedPrivateReadAndReplayDoNotDuplicate() {
        var request=request(Purpose.employee_document,person,"resume","resume.pdf",pdf,"application/pdf");var staged=intake.stage(token,request);
        assertThat(intake.stage(token,request)).isEqualTo(staged);assertThat(count("user_documents")).isZero();
        var preview=actions.preview(token,"attach_employee_document",new AttachRequest(staged.stagedFileId()));assertThat(preview.targetName()).contains("Synthetic");assertThat(preview.previousFileName()).isNull();
        var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());var result=actions.commit(token,"attach_employee_document",commit);
        assertThat(result.result().sha256()).isEqualTo(AiFileValidation.hash(pdf));assertThat(actions.commit(token,"attach_employee_document",commit).replayed()).isTrue();assertThat(count("user_documents")).isEqualTo(1);
        assertThat(owner.list(token.user(),Purpose.employee_document,person).items()).hasSize(1);
        assertThat(owner.read(token.user(),new ReadRequest(Purpose.employee_document,person,result.result().attachmentId())).contentBase64()).isEqualTo(Base64.getEncoder().encodeToString(pdf));
        assertThatThrownBy(()->access.require(new StoredToken(token.id(),token.user(),Set.of("hr.people.details:read")),Purpose.employee_document,false)).isInstanceOf(SecurityException.class);
        assertThatThrownBy(()->intake.stage(token,new StageRequest(request.purpose(),person,"resume","changed.pdf",request.mimeType(),request.contentBase64(),request.idempotencyKey()))).isInstanceOf(Conflict.class);
        var privateArgs=jdbc.queryForObject("SELECT normalized_args_json FROM ai_action_confirmations WHERE company_id=? AND tool_name='file_attachment_v1:attach_employee_document'",String.class,company);
        assertThat(privateArgs).doesNotContain("object_key","private.invalid",Base64.getEncoder().encodeToString(pdf));
        verify(meter).commit(eq(company),anyString(),anyString(),eq((long)pdf.length));
    }
    @Test void commercialAttachmentsUsePrivateOwnerBucketAndReportsPreserveCurrency()throws Exception {
        when(authorization.canUseInventoryTool(any(),anyString())).thenReturn(true);
        when(authorization.canUseSalesWorkflowTool(any(),anyString())).thenReturn(true);
        var scopes=new HashSet<>(token.scopes());scopes.addAll(Set.of("inventory.products.manage","inventory.read","sales.contracts.manage","sales.collections.confirm","sales.read"));
        token=new StoredToken(token.id(),token.user(),Set.copyOf(scopes));
        jdbc.update("INSERT INTO sales_products(company_id,product_code,sku,name,type,currency,price,cost,inventory_ready,status) VALUES (?,'FILE-P','FILE-SKU','=Synthetic product','PRODUCT','CAD',10.25,3.1250,1,'active')",company);
        long product=jdbc.queryForObject("SELECT id FROM sales_products WHERE company_id=?",Long.class,company);
        byte[] png=new byte[]{(byte)137,80,78,71,13,10,26,10,0};
        var staged=intake.stage(token,request(Purpose.inventory_product_image,product,null,"product.png",png,"image/png"));
        String key=jdbc.queryForObject("SELECT object_key FROM ai_staged_files WHERE id=?",String.class,staged.stagedFileId());
        var preview=actions.preview(token,"attach_inventory_product_image",new AttachRequest(staged.stagedFileId()));
        var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());var saved=actions.commit(token,"attach_inventory_product_image",commit);
        assertThat(actions.commit(token,"attach_inventory_product_image",commit).replayed()).isTrue();assertThat(count("sales_files")).isEqualTo(1);
        var read=owner.read(token.user(),new ReadRequest(Purpose.inventory_product_image,product,saved.result().attachmentId()));assertThat(Base64.getDecoder().decode(read.contentBase64())).isEqualTo(png);assertThat(read.toString()).doesNotContain(key,"https:");
        verify(storage).writeObject(eq(owner.bucket(Purpose.inventory_product_image)),eq(key),eq("image/png"),any(byte[].class));
        jdbc.update("INSERT INTO sales_contracts(company_id,contract_number,title,status) VALUES (?,'FILE-C','Synthetic contract','draft')",company);
        long contract=jdbc.queryForObject("SELECT id FROM sales_contracts WHERE company_id=?",Long.class,company);
        var cf=intake.stage(token,request(Purpose.sales_contract_attachment,contract,null,"contract.pdf",pdf,"application/pdf"));var cp=actions.preview(token,"attach_sales_contract_file",new AttachRequest(cf.stagedFileId()));
        actions.commit(token,"attach_sales_contract_file",new CommitRequest(cp.confirmationToken(),UUID.randomUUID().toString()));assertThat(count("sales_files")).isEqualTo(2);
        for(String format:List.of("csv","pdf")){
            var report=commerceReports.export(token,new AiCommerceReportContracts.Request(AiCommerceReportContracts.Report.inventory_products,format,null,null,null,null,null,null));
            var bytes=Base64.getDecoder().decode(report.contentBase64());
            if(format.equals("csv"))assertThat(new String(bytes,java.nio.charset.StandardCharsets.UTF_8)).contains("'=Synthetic product","10.25","CAD");
            else try(var doc=org.apache.pdfbox.Loader.loadPDF(bytes)){assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(doc)).contains("10.25","CAD");}
        }
        assertThat(count("sales_files")).isEqualTo(2);
        var noFileRead=new StoredToken(token.id(),token.user(),Set.of("inventory.read"));assertThatThrownBy(()->commerceReports.export(noFileRead,new AiCommerceReportContracts.Request(AiCommerceReportContracts.Report.inventory_products,"csv",null,null,null,null,null,null))).isInstanceOf(SecurityException.class);
        var outsider=new AuthSessionUser(token.user().userId(),company+99999,token.user().userCompanyId(),"Synthetic outsider","root");assertThatThrownBy(()->owner.read(outsider,new ReadRequest(Purpose.inventory_product_image,product,saved.result().attachmentId()))).isInstanceOf(NoSuchElementException.class);
    }
    @Test void evidenceDoesNotConfirmCollectionAndSupplementPreservesCompletedCollection(){
        when(authorization.canUseSalesWorkflowTool(any(),anyString())).thenReturn(true);
        var scopes=new HashSet<>(token.scopes());scopes.addAll(Set.of("sales.collections.confirm","sales.read"));token=new StoredToken(token.id(),token.user(),Set.copyOf(scopes));
        jdbc.update("INSERT INTO sales_records(company_id,sale_number,customer_name,commercial_status,finance_status,currency,total_amount) VALUES (?,'FILE-S','Synthetic customer','approved','pending','CAD',10.25)",company);
        long sale=jdbc.queryForObject("SELECT id FROM sales_records WHERE company_id=?",Long.class,company);
        var staged=intake.stage(token,request(Purpose.sale_payment_evidence,sale,null,"payment.pdf",pdf,"application/pdf"));var preview=actions.preview(token,"attach_sale_payment_evidence",new AttachRequest(staged.stagedFileId()));
        actions.commit(token,"attach_sale_payment_evidence",new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString()));
        assertThat(jdbc.queryForObject("SELECT finance_status FROM sales_records WHERE company_id=? AND id=?",String.class,company,sale)).isEqualTo("pending");assertThat(count("finance_payment_account_movements")).isZero();assertThat(count("sales_files")).isEqualTo(1);
        jdbc.update("UPDATE sales_records SET finance_status='approved' WHERE company_id=? AND id=?",company,sale);
        var second=intake.stage(token,request(Purpose.sale_payment_evidence,sale,null,"second.pdf",pdf,"application/pdf"));var review=actions.preview(token,"attach_sale_payment_evidence",new AttachRequest(second.stagedFileId()));
        var saved=actions.commit(token,"attach_sale_payment_evidence",new CommitRequest(review.confirmationToken(),UUID.randomUUID().toString()));
        assertThat(jdbc.queryForObject("SELECT finance_status FROM sales_records WHERE company_id=? AND id=?",String.class,company,sale)).isEqualTo("approved");assertThat(count("finance_payment_account_movements")).isZero();
        assertThat(jdbc.queryForObject("SELECT file_kind FROM sales_files WHERE company_id=? AND id=?",String.class,company,saved.result().attachmentId())).isEqualTo("payment_supplement");
        assertThat(owner.list(token.user(),Purpose.sale_payment_evidence,sale).items()).hasSize(2);
        var changed=pdf.clone();changed[15]=(byte)'X';var key=objects.keySet().stream().filter(k->k.equals(jdbc.queryForObject("SELECT object_key FROM sales_files WHERE company_id=? AND id=?",String.class,company,saved.result().attachmentId()))).findFirst().orElseThrow();objects.put(key,changed);
        assertThatThrownBy(()->owner.read(token.user(),new ReadRequest(Purpose.sale_payment_evidence,sale,saved.result().attachmentId()))).isInstanceOf(Conflict.class).satisfies(error->assertThat(((Conflict)error).code()).isEqualTo("file_integrity_changed"));
    }
    @Test void invoiceAttachmentRetainsInvoiceAndPayableStateUntilSeparateApproval(){
        when(authorization.canUseProcurementTool(any(),anyString())).thenReturn(true);
        var scopes=new HashSet<>(token.scopes());scopes.addAll(Set.of("inventory.invoices.manage","inventory.read"));token=new StoredToken(token.id(),token.user(),Set.copyOf(scopes));
        jdbc.update("INSERT INTO finance_providers(company_id,name,status) VALUES (?,'Synthetic document supplier','ACTIVE')",company);
        long provider=jdbc.queryForObject("SELECT id FROM finance_providers WHERE company_id=?",Long.class,company);
        jdbc.update("INSERT INTO pos_supplier_invoices(company_id,provider_id,invoice_number,currency_code,total_amount,status) VALUES (?,?,'FILE-INVOICE','CAD',10.25,'SUBMITTED')",company,provider);
        long invoice=jdbc.queryForObject("SELECT id FROM pos_supplier_invoices WHERE company_id=?",Long.class,company);
        var staged=intake.stage(token,request(Purpose.supplier_invoice_attachment,invoice,null,"invoice.pdf",pdf,"application/pdf"));var preview=actions.preview(token,"attach_supplier_invoice_file",new AttachRequest(staged.stagedFileId()));var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        var saved=actions.commit(token,"attach_supplier_invoice_file",commit);assertThat(actions.commit(token,"attach_supplier_invoice_file",commit).replayed()).isTrue();assertThat(count("pos_supplier_invoice_attachments")).isEqualTo(1);assertThat(count("finance_expenses")).isZero();
        assertThat(jdbc.queryForObject("SELECT status FROM pos_supplier_invoices WHERE company_id=? AND id=?",String.class,company,invoice)).isEqualTo("SUBMITTED");
        assertThat(Base64.getDecoder().decode(owner.read(token.user(),new ReadRequest(Purpose.supplier_invoice_attachment,invoice,saved.result().attachmentId())).contentBase64())).isEqualTo(pdf);
        var noInvoices=new StoredToken(token.id(),token.user(),Set.of("files.attach","inventory.procurement.manage"));assertThat(access.allowed(noInvoices,Purpose.supplier_invoice_attachment,true)).isFalse();
    }
    @Test void allNamedAttachmentOwnersRegisterAndEvidenceCompletesTheRequiredTask() {
        long announcement=applyHr("create_announcement",new Change(null,null,null,null,new AnnouncementChange("Synthetic files","general","Synthetic notice","all","draft",null,null,null,null))).announcement().id();
        long record=applyHr("create_hr_record",new Change(null,null,null,null,null,null,null,new RecordChange(person,"observation","low","pending","Synthetic record","Synthetic details",null,LocalDateTime.now(),List.of()))).record().id();
        long asset=applyHr("create_hr_asset",new Change(null,null,null,new AssetChange(null,"equipment","Synthetic asset",null,null,null,unit,"available",null,null,null,null),null)).asset().id();
        jdbc.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,user_code,position,department,unit_id,business_id,status) VALUES(?,?,?,'SYNTHETIC-FILE-OPERATOR','Operator','Operations',?,?,'active')",company,token.user().userCompanyId(),token.user().userId(),unit,business);
        long permission=applyHr("create_my_hr_permission",new Change(null,null,null,null,null,null,null,null,new PermissionChange("vacation","paid",LocalDate.now().plusDays(7),LocalDate.now().plusDays(8),false,"Synthetic permission",null))).permission().id();
        long task=((Number)tasks.createTask(company,token.user().userId(),Map.of("status","pending","priority","medium","title","Synthetic evidence task","unitId",unit,"businessId",business,"assignedUserCompanyId",token.user().userCompanyId(),"evidenceRequired",true)).get("id")).longValue();
        // Evidence is required by process templates; seed that owner flag on this synthetic task.
        jdbc.update("UPDATE process_tasks SET evidence_required=1 WHERE company_id=? AND id=?",company,task);
        assertThatThrownBy(()->tasks.validateCompletion(company,token.user().userId(),task)).isInstanceOf(IllegalArgumentException.class);
        for(var pair:List.of(Map.entry("attach_announcement_file",announcement),Map.entry("attach_hr_record_file",record),Map.entry("attach_my_hr_permission_file",permission),Map.entry("attach_hr_permission_file",permission),Map.entry("attach_task_evidence",task))) {
            var purpose=AiFileAccess.ACTIONS.get(pair.getKey());var staged=intake.stage(token,request(purpose,pair.getValue(),null,pair.getKey()+".pdf",pdf,"application/pdf"));
            var preview=actions.preview(token,pair.getKey(),new AttachRequest(staged.stagedFileId()));var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
            var attached=actions.commit(token,pair.getKey(),commit).result();assertThat(attached.attachmentId()).isPositive();assertThat(owner.read(token.user(),new ReadRequest(purpose,pair.getValue(),attached.attachmentId())).sha256()).isEqualTo(AiFileValidation.hash(pdf));
        }
        var png=new byte[]{(byte)137,80,78,71,13,10,26,10};var photo=intake.stage(token,request(Purpose.asset_photo,asset,null,"synthetic.png",png,"image/png"));
        var preview=actions.preview(token,"add_hr_asset_photo",new AttachRequest(photo.stagedFileId()));var saved=actions.commit(token,"add_hr_asset_photo",new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())).result();
        assertThat(owner.read(token.user(),new ReadRequest(Purpose.asset_photo,asset,saved.attachmentId())).sha256()).isEqualTo(AiFileValidation.hash(png));
        tasks.validateCompletion(company,token.user().userId(),task);assertThat(tasks.completeTask(company,token.user().userId(),task,Map.of("completionNotes","Synthetic completed evidence"))).containsEntry("status","completed");
        assertThat(count("user_permission_attachments")).isEqualTo(2);assertThat(count("process_task_attachments")).isEqualTo(1);assertThat(count("user_asset_photos")).isEqualTo(1);
    }
    @Test void contentTamperingExpiredIntakeChangedTargetAndForeignIdentityFailBeforeRegistration() {
        var staged=intake.stage(token,request(Purpose.employee_document,person,"resume","resume.pdf",pdf,"application/pdf"));
        var preview=actions.preview(token,"attach_employee_document",new AttachRequest(staged.stagedFileId()));var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        String key=jdbc.queryForObject("SELECT object_key FROM ai_staged_files WHERE id=?",String.class,staged.stagedFileId());objects.put(key,"%PDF-1.4\nTampered".getBytes());
        assertThatThrownBy(()->nested(()->actions.commit(token,"attach_employee_document",commit))).isInstanceOf(Conflict.class);assertThat(count("user_documents")).isZero();
        objects.put(key,pdf);jdbc.update("UPDATE user_work_profiles SET position='Concurrent edit' WHERE company_id=? AND user_company_id=?",company,person);
        assertThatThrownBy(()->nested(()->actions.commit(token,"attach_employee_document",commit))).isInstanceOf(Conflict.class);assertThat(count("user_documents")).isZero();
        var foreign=new StoredToken(token.id()+999,new AuthSessionUser(token.user().userId(),company+999,token.user().userCompanyId(),"Synthetic foreign","root"),token.scopes());
        assertThatThrownBy(()->actions.preview(foreign,"attach_employee_document",new AttachRequest(staged.stagedFileId()))).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(()->actions.commit(foreign,"attach_employee_document",commit)).isInstanceOf(Conflict.class);
        jdbc.update("UPDATE ai_staged_files SET expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE id=?",staged.stagedFileId());
        assertThatThrownBy(()->actions.preview(token,"attach_employee_document",new AttachRequest(staged.stagedFileId()))).isInstanceOf(Conflict.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM ai_action_confirmations WHERE company_id=? AND consumed_at IS NOT NULL AND tool_name LIKE 'file_attachment_v1:%'",Long.class,company)).isZero();
    }
    @Test void payrollExportsDoNotCreatePreferencesReconcileOrChangeTheRun() throws Exception {
        assertThatThrownBy(()->owner.export(token.user(),new ExportRequest(1L,null))).isInstanceOf(IllegalArgumentException.class);
        var start=LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        var payroll=new com.indice.erp.hr.payroll.HrPayrollAssistantContracts.Change("weekly",start,null,"single",null,null,null,null);
        long id=applyHr("prepare_hr_payroll",new Change(null,null,null,null,null,null,null,null,null,null,null,payroll)).payroll().runs().getFirst().id();
        jdbc.update("DELETE FROM payroll_preferences WHERE company_id=?",company);
        jdbc.update("UPDATE payroll_run_lines SET user_name_snapshot='=Synthetic formula' WHERE company_id=? AND run_id=?",company,id);
        var csv=owner.export(token.user(),new ExportRequest(id,"csv"));var pdfExport=owner.export(token.user(),new ExportRequest(id,"pdf"));
        assertThat(new String(Base64.getDecoder().decode(csv.contentBase64()),java.nio.charset.StandardCharsets.UTF_8)).contains("currency","CAD","'=Synthetic formula");
        assertThat(csv.mimeType()).isEqualTo("text/csv");assertThat(new String(Base64.getDecoder().decode(pdfExport.contentBase64()))).startsWith("%PDF-");
        try(var document=org.apache.pdfbox.Loader.loadPDF(Base64.getDecoder().decode(pdfExport.contentBase64()))) {
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(document)).contains("Net / Currency","CAD");
        }
        assertThat(count("payroll_preferences")).isZero();assertThat(jdbc.queryForObject("SELECT status FROM payroll_runs WHERE company_id=? AND id=?",String.class,company,id)).isEqualTo("draft");
        assertThat(access.exportAllowed(new StoredToken(token.id(),token.user(),Set.of("hr.payroll.read")))).isFalse();
    }
    @Test void expiredUnconfirmedFilesReleaseQuotaWithoutDeletingRegisteredEvidence() {
        var confirmed=intake.stage(token,request(Purpose.employee_document,person,"resume","registered.pdf",pdf,"application/pdf"));
        var preview=actions.preview(token,"attach_employee_document",new AttachRequest(confirmed.stagedFileId()));
        actions.commit(token,"attach_employee_document",new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString()));
        var unused=intake.stage(token,request(Purpose.employee_document,person,"resume","unused.pdf",pdf,"application/pdf"));
        var pendingKey=jdbc.queryForObject("SELECT object_key FROM ai_staged_files WHERE id=?",String.class,unused.stagedFileId());
        var activeKey=jdbc.queryForObject("SELECT object_key FROM ai_staged_files WHERE id=?",String.class,confirmed.stagedFileId());
        jdbc.update("UPDATE ai_staged_files SET expires_at=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL 1 MINUTE) WHERE company_id=?",company);
        cleanup.expire();
        assertThat(objects).containsKey(activeKey).doesNotContainKey(pendingKey);
        assertThat(jdbc.queryForObject("SELECT state FROM ai_staged_files WHERE id=?",String.class,unused.stagedFileId())).isEqualTo("EXPIRED");
        assertThat(jdbc.queryForObject("SELECT state FROM ai_staged_files WHERE id=?",String.class,confirmed.stagedFileId())).isEqualTo("ATTACHED");
        verify(meter).release(company,pendingKey,"ai_file_intake_expired");
    }
    @Test void employeeReplacementRollbackKeepsThePreviousDocumentAndDoesNotConsumeConfirmation() {
        var first=intake.stage(token,request(Purpose.employee_document,person,"resume","first.pdf",pdf,"application/pdf"));
        var firstPreview=actions.preview(token,"attach_employee_document",new AttachRequest(first.stagedFileId()));
        actions.commit(token,"attach_employee_document",new CommitRequest(firstPreview.confirmationToken(),UUID.randomUUID().toString()));
        var second=intake.stage(token,request(Purpose.employee_document,person,"resume","second.pdf",pdf,"application/pdf"));
        var preview=actions.preview(token,"attach_employee_document",new AttachRequest(second.stagedFileId()));
        assertThat(preview.previousFileName()).isEqualTo("first.pdf");
        var commit=new CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString());
        assertThatThrownBy(()->nested(()->{actions.commit(token,"attach_employee_document",commit);throw new IllegalStateException("Synthetic rollback");})).isInstanceOf(IllegalStateException.class);
        assertThat(owner.list(token.user(),Purpose.employee_document,person).items()).singleElement().satisfies(f->assertThat(f.fileName()).isEqualTo("first.pdf"));
        var key=jdbc.queryForObject("SELECT object_key FROM ai_staged_files WHERE id=?",String.class,first.stagedFileId());
        assertThat(objects).containsKey(key);
        assertThat(actions.commit(token,"attach_employee_document",commit).result().fileName()).isEqualTo("second.pdf");
    }
    private StageRequest request(Purpose purpose,long id,String document,String name,byte[] content,String mime){return new StageRequest(purpose,id,document,name,mime,Base64.getEncoder().encodeToString(content),UUID.randomUUID().toString());}
    private Result applyHr(String action,Change change){var preview=hr.preview(token,action,change);return hr.commit(token,action,new AiHrContracts.CommitRequest(preview.confirmationToken(),UUID.randomUUID().toString())).result();}
    private void nested(Runnable action){var transaction=new TransactionTemplate(transactions);transaction.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);transaction.execute(status->{action.run();return null;});}
    private long count(String table){return jdbc.queryForObject("SELECT COUNT(*) FROM "+table+" WHERE company_id=?",Long.class,company);}
}
