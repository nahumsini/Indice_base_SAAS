package com.indice.erp.configcenter.profile;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.ConfigCenterService;
import com.indice.erp.configcenter.ConfigCenterScopeAccess;
import com.indice.erp.storage.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class PersonalProfileValidationTest {
    final JdbcTemplate db = mock(JdbcTemplate.class);
    final ObjectStorageService storage = mock(ObjectStorageService.class);
    final CompanyStorageMeter meter = mock(CompanyStorageMeter.class);
    final BCryptPasswordEncoder encoder = mock(BCryptPasswordEncoder.class);
    final ConfigCenterService service = new ConfigCenterService(db, new ObjectMapper(), encoder,
        storage, new ObjectStorageProperties(), meter, mock(ConfigCenterScopeAccess.class));
    Map<String, Object> valid() { return new LinkedHashMap<>(Map.of("primer_nombre", "Synthetic", "apellido_paterno", "User", "country", "MX", "preferred_language", "es-MX")); }
    @Test void validatesAllFieldsBeforeAnyWriteOrStorageCommit() {
        var cases = List.of(
            Map.of("primer_nombre", "", "apellido_paterno", ""), Map.of("primer_nombre", "a".repeat(101)),
            Map.of("country", "ZZ"), Map.of("preferred_language", "unknown"),
            Map.of("new_password", "short", "confirm_new_password", "short"),
            Map.of("new_password", "password-one", "confirm_new_password", "password-two"),
            Map.of("new_password", "é".repeat(40), "confirm_new_password", "é".repeat(40)),
            Map.of("new_password", 12345678)
        );
        for (var invalid : cases) {
            var payload = valid(); payload.putAll(invalid);
            payload.put("avatar_object_key", "config-center/user-profiles/7/1/avatar/new.webp");
            assertThatThrownBy(() -> service.saveCurrentUser(7, 1, "user", payload)).isInstanceOf(ProfileInputException.class);
        }
        verifyNoInteractions(db, storage, meter, encoder);
    }
    @Test void validatesEveryPhoneAndRejectsDuplicateNumbersOrOversizedLists() {
        var good = Map.of("phone", "+525555123456", "country", "MX", "label", "Mobile");
        for (var phones : List.of(List.of(good, Map.of("phone", "123", "country", "CA")), List.of(good,good), Collections.nCopies(11,good))) {
            var payload = valid(); payload.put("phone_numbers", phones);
            assertThatThrownBy(() -> service.saveCurrentUser(7, 1, "user", payload)).isInstanceOf(ProfileInputException.class);
        }
        verifyNoInteractions(db, meter, encoder);
    }
    @Test void passwordsKeepTheirExactCharacters() {
        var payload = valid(); payload.put("new_password", " exact secret "); payload.put("confirm_new_password", " exact secret ");
        when(encoder.encode(" exact secret ")).thenReturn("synthetic-hash");
        when(db.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Map<String,Object>>>any(), eq(1L))).thenReturn(List.of(Map.of("id",1L)));
        service.saveCurrentUser(7,1,"user",payload);
        verify(encoder).encode(" exact secret ");
        verify(db).update("UPDATE users SET password_hash = ? WHERE id = ?", "synthetic-hash",1L);
    }
    @Test void uploadedImageMustHaveAnAllowedActualSizeAndMatchingType() {
        var payload = valid(); payload.put("phone_numbers", List.of()); payload.put("avatar_object_key", "config-center/user-profiles/7/1/avatar/new.webp"); payload.put("avatar_content_type", "image/webp");
        when(storage.objectExists(anyString(), anyString())).thenReturn(true);
        when(storage.objectMetadata(anyString(), anyString())).thenReturn(new StoredObjectMetadata(1024*1024+1,"image/webp"));
        assertThatThrownBy(() -> service.saveCurrentUser(7,1,"user",payload)).isInstanceOf(ProfileInputException.class);
        when(storage.objectMetadata(anyString(), anyString())).thenReturn(new StoredObjectMetadata(100,"image/jpeg"));
        assertThatThrownBy(() -> service.saveCurrentUser(7,1,"user",payload)).isInstanceOf(ProfileInputException.class);
        verifyNoInteractions(db,meter);
        payload.put("avatar_object_key", "config-center/user-profiles/8/2/avatar/foreign.webp");
        assertThatThrownBy(() -> service.saveCurrentUser(7,1,"user",payload)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void oldPhotoIsRemovedOnlyAfterCommitAndQuotaBelongsToItsOriginalCompany() {
        String old = "config-center/user-profiles/6/1/avatar/old.webp", next = "config-center/user-profiles/7/1/avatar/new.webp";
        var payload = valid(); payload.put("avatar_object_key",next); payload.put("avatar_content_type","image/webp");
        when(storage.objectExists(anyString(),eq(next))).thenReturn(true);
        when(storage.objectMetadata(anyString(),eq(next))).thenReturn(new StoredObjectMetadata(100,"image/webp"));
        doReturn(List.of(old)).when(db).query(contains("FROM user_profiles WHERE user_id"), org.mockito.ArgumentMatchers.<RowMapper<String>>any(), eq(1L));
        doReturn(List.of(Map.of("id",1L))).when(db).query(contains("LEFT JOIN user_profiles"), org.mockito.ArgumentMatchers.<RowMapper<Map<String,Object>>>any(), eq(1L));
        when(storage.isEnabled()).thenReturn(true);
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.saveCurrentUser(7,1,"user",payload);
            verify(storage,never()).deleteObject(anyString(),anyString());
            verify(meter).release(6L,old,"profile_avatar_replaced");
            TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
            verify(storage).deleteObject(anyString(),eq(old));
        } finally { TransactionSynchronizationManager.clearSynchronization(); }
    }
}
