package com.indice.erp.sales;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

class InventoryMovementAttachmentServiceTest {
    SalesRepository records=mock(SalesRepository.class);
    HrOperationalScopeService scopes=mock(HrOperationalScopeService.class);
    ObjectStorageService storage=mock(ObjectStorageService.class);
    CompanyStorageMeter meter=mock(CompanyStorageMeter.class);
    JdbcTemplate jdbc=mock(JdbcTemplate.class);
    ObjectStorageProperties properties=new ObjectStorageProperties();
    AuthSessionUser user=new AuthSessionUser(1L,7L,4L,"Fixture","root");
    InventoryMovementAttachmentService service;
    @BeforeEach @SuppressWarnings("unchecked") void setup() {
        properties.getMinio().setBucketSalesDocuments("sales");
        service=new InventoryMovementAttachmentService(records,scopes,storage,properties,meter,jdbc,new ObjectMapper());
        when(records.get(eq(7L),any(),eq(99L))).thenReturn(Map.of("businessUnitId","2","businessId","3","status","confirmed"));
        when(storage.isEnabled()).thenReturn(true);
        when(jdbc.query(anyString(),any(RowMapper.class),any(),any())).thenReturn(List.of());
        when(meter.presign(eq(7L),eq("SALES"),eq("sales"),anyString(),eq("application/pdf"),eq(8L),anyInt()))
          .thenAnswer(call->new PresignedUpload(call.getArgument(3),"https://example.invalid/upload",java.time.Instant.now().plusSeconds(60),Map.of()));
    }
    String reserve() {return service.reserve(user,99L,new InventoryMovementAttachmentService.UploadRequest("invoice.pdf","application/pdf",8)).objectKey();}
    InventoryMovementAttachmentService.RegisterRequest request(String key){return new InventoryMovementAttachmentService.RegisterRequest(key,"invoice.pdf","application/pdf",8);}
    @Test void registrationRequiresStoredObjectBeforeMetadata() {
        String key=reserve();
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key)));
        verify(records,never()).createFile(anyLong(),anyLong(),anyMap());
        verify(meter,never()).commit(anyLong(),anyString(),anyString(),anyLong());
    }
    @Test void successfulRegistrationVerifiesBytesAndStoresReferenceOnly() {
        String key=reserve();
        when(storage.objectExists("sales",key)).thenReturn(true);
        when(storage.objectMetadata("sales",key)).thenReturn(new StoredObjectMetadata(8,"application/pdf"));
        when(storage.readObjectPrefix("sales",key,16)).thenReturn("%PDF-1.7".getBytes(StandardCharsets.US_ASCII));
        when(records.createFile(eq(7L),eq(1L),anyMap())).thenReturn(10L);
        var saved=service.register(user,99L,request(key));
        assertEquals("10",saved.id()); assertEquals("99",saved.movementId()); assertTrue(saved.registered());
        verify(meter).commit(7L,"sales",key,8);
        verify(scopes,atLeastOnce()).requireAssignmentInScope(user,2L,3L);
        verify(jdbc).update(contains("UPDATE sales_inventory_movements"),contains("invoice.pdf"),eq(7L),eq(99L));
    }
    @Test void sizeAndContentSpoofingAreRejected() {
        String key=reserve(); when(storage.objectExists("sales",key)).thenReturn(true);
        when(storage.objectMetadata("sales",key)).thenReturn(new StoredObjectMetadata(9,"application/pdf"));
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key)));
        when(storage.objectMetadata("sales",key)).thenReturn(new StoredObjectMetadata(8,"application/pdf"));
        when(storage.readObjectPrefix("sales",key,16)).thenReturn("<html>xx".getBytes(StandardCharsets.US_ASCII));
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key)));
        verify(records,never()).createFile(anyLong(),anyLong(),anyMap());
    }
    @Test void wrongTenantMovementOrUserPrefixCannotBeRegistered() {
        String key=reserve();
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key.replace("/7/99/1/","/8/99/1/"))));
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key.replace("/7/99/1/","/7/100/1/"))));
        assertThrows(IllegalArgumentException.class,()->service.register(user,99L,request(key.replace("/7/99/1/","/7/99/2/"))));
        verify(storage,never()).objectExists(anyString(),anyString());
    }
    @Test void assignmentAndCancelledMovementFailBeforeStorage() {
        doThrow(new com.indice.erp.hr.HrAccessDeniedException("Forbidden")).when(scopes).requireAssignmentInScope(user,2L,3L);
        assertThrows(com.indice.erp.hr.HrAccessDeniedException.class,this::reserve);
        verifyNoInteractions(meter);
        reset(scopes);
        when(records.get(eq(7L),any(),eq(99L))).thenReturn(Map.of("status","cancelled","businessUnitId","2","businessId","3"));
        assertThrows(IllegalArgumentException.class,this::reserve);
    }
    @Test void fileRulesLimitTypesSizeAndPathNames() {
        assertDoesNotThrow(()->InventoryMovementAttachmentService.validate("invoice.pdf","application/pdf",100));
        assertThrows(IllegalArgumentException.class,()->InventoryMovementAttachmentService.validate("x.svg","image/svg+xml",100));
        assertThrows(IllegalArgumentException.class,()->InventoryMovementAttachmentService.validate("x.pdf","image/png",100));
        assertThrows(IllegalArgumentException.class,()->InventoryMovementAttachmentService.validate("../x.pdf","application/pdf",100));
        assertThrows(IllegalArgumentException.class,()->InventoryMovementAttachmentService.validate("x.pdf","application/pdf",0));
        assertThrows(IllegalArgumentException.class,()->InventoryMovementAttachmentService.validate("x.pdf","application/pdf",11*1024*1024));
    }
    @Test @SuppressWarnings("unchecked") void registrationRetryReturnsExistingFileWithoutDoubleCommit() throws Exception {
        String key=reserve();
        var rs=mock(java.sql.ResultSet.class);
        when(rs.getLong("id")).thenReturn(10L); when(rs.getLong("bytes")).thenReturn(8L);
        when(rs.getString("file_name")).thenReturn("invoice.pdf"); when(rs.getString("mime")).thenReturn("application/pdf"); when(rs.getString("object_key")).thenReturn(key);
        when(jdbc.query(anyString(),any(RowMapper.class),any(),any())).thenAnswer(call -> List.of(((RowMapper<?>)call.getArgument(1)).mapRow(rs,0)));
        assertEquals("10",service.register(user,99L,request(key)).id());
        verify(meter,never()).commit(anyLong(),anyString(),anyString(),anyLong());
        verify(records,never()).createFile(anyLong(),anyLong(),anyMap());
    }
    @Test void downloadRejectsFileFromAnotherMovement() {
        assertThrows(NoSuchElementException.class,()->service.download(user,99L,123L));
        verify(storage,never()).presignDownload(anyString(),anyString(),anyInt());
    }

}
