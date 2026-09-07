package com.indice.erp.finance.receivables;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.storage.ObjectStorageProperties;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.StoredObjectMetadata;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ReceivableReceiptServiceTest {
    final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    final ObjectStorageService storage = mock(ObjectStorageService.class);
    final CompanyStorageMeter meter = mock(CompanyStorageMeter.class);
    final ReceivableReceiptService receipts = new ReceivableReceiptService(jdbc, mock(ReceivablesRepository.class), storage, new ObjectStorageProperties(), meter);
    final FinanceContext context = new FinanceContext(4L, 7L, "Synthetic collector", "admin", true, FinanceScope.corporateOffice());
    final String key = "companies/7/receivables/9/payment-receipts/12345678-1234-1234-1234-123456789012";
    ReceivableReceiptService.ReceiptInput receipt(String objectKey) {
        return new ReceivableReceiptService.ReceiptInput(objectKey, "receipt.pdf", "application/pdf", 50);
    }

    @Test void anotherCompanyOrReceivableCannotAttachAnUploadedObject() {
        for (String wrong : new String[]{key.replace("companies/7/", "companies/8/"), key.replace("receivables/9/", "receivables/10/")}) {
            assertThatThrownBy(() -> receipts.register(context, 9, 10, receipt(wrong))).hasMessageContaining("does not belong");
        }
        verifyNoInteractions(storage, jdbc, meter);
    }

    @Test void metadataAndContentMustAgreeBeforeChargingStorageOrUpdatingPayment() {
        when(storage.objectMetadata(anyString(), eq(key))).thenReturn(new StoredObjectMetadata(49, "application/pdf"));
        assertThatThrownBy(() -> receipts.register(context, 9, 10, receipt(key))).hasMessageContaining("differs");
        when(storage.objectMetadata(anyString(), eq(key))).thenReturn(new StoredObjectMetadata(50, "application/pdf"));
        when(storage.readObjectPrefix(anyString(), eq(key), eq(16))).thenReturn("<html>fake</html>".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThatThrownBy(() -> receipts.register(context, 9, 10, receipt(key))).hasMessageContaining("does not match");
        verifyNoInteractions(jdbc, meter);
    }

    @Test void recognizedSignaturesDoNotAcceptAnotherFileTypeOrEmptyData() {
        assertThat(ReceivableReceiptService.validSignature("application/pdf", "%PDF-1.7".getBytes(java.nio.charset.StandardCharsets.US_ASCII))).isTrue();
        assertThat(ReceivableReceiptService.validSignature("image/png", "%PDF-1.7".getBytes(java.nio.charset.StandardCharsets.US_ASCII))).isFalse();
        assertThat(ReceivableReceiptService.validSignature("application/pdf", new byte[0])).isFalse();
    }
}
