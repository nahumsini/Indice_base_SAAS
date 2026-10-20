package com.indice.erp.configcenter.profile;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.mock;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.configcenter.ConfigCenterService;
import com.indice.erp.configcenter.ConfigCenterScopeAccess;
import com.indice.erp.storage.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@JdbcTest(properties={"logging.level.org.springframework=WARN"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import(PersonalProfilePersistenceTest.Config.class)
class PersonalProfilePersistenceTest {
    @TestConfiguration static class Config {
        @Bean ConfigCenterService profiles(JdbcTemplate db) { return new ConfigCenterService(db,new ObjectMapper(),new BCryptPasswordEncoder(),new DisabledObjectStorageService(),new ObjectStorageProperties(),mock(CompanyStorageMeter.class),mock(ConfigCenterScopeAccess.class)); }
    }
    @Autowired JdbcTemplate db;
    @Autowired ConfigCenterService profiles;
    long user() {
        assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
        db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test-only','Synthetic User')",UUID.randomUUID()+"@example.invalid");
        return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
    }
    Map<String,Object> payload() { return new LinkedHashMap<>(Map.of("primer_nombre","Synthetic Given","apellido_paterno","Family Names","country","MX","preferred_language","es-MX")); }
    @Test void savesEveryPhoneAcrossReloadsAndKeepsOtherUsersUntouched() {
        long alice=user(),bob=user();
        var phones=List.of(Map.of("label","Mobile","phone","+52 55 5512 3456","country","MX"),Map.of("label","Office","phone","+1 416 555 1234","country","CA"));
        var body=payload();body.put("phone_numbers",phones);
        profiles.saveCurrentUser(7,alice,"user",body);profiles.saveCurrentUser(7,alice,"user",body);
        var saved=profiles.getCurrentUser(alice,"user");
        var list=new ObjectMapper().valueToTree(saved.get("phone_numbers"));
        assertThat(list.size()).isEqualTo(2);assertThat(list.get(1).get("phone").asText()).isEqualTo("+14165551234");
        assertThat(list.get(0).get("is_primary").asBoolean()).isTrue();
        assertThat(saved.get("telefono")).isEqualTo("+525555123456");
        assertThat(saved.get("nombres")).isEqualTo("Synthetic Given");assertThat(saved.get("apellidos")).isEqualTo("Family Names");
        assertThat(profiles.getCurrentUser(bob,"user").get("telefono")).isEqualTo("");
        body.put("country","CA");profiles.saveCurrentUser(8,alice,"user",body);
        assertThat(new ObjectMapper().valueToTree(profiles.getCurrentUser(alice,"user").get("phone_numbers")).get(0).get("country").asText()).isEqualTo("MX");
        body.put("phone_numbers",List.of());profiles.saveCurrentUser(8,alice,"user",body);
        assertThat(profiles.getCurrentUser(alice,"user").get("telefono")).isEqualTo("");
        assertThat(new ObjectMapper().valueToTree(profiles.getCurrentUser(alice,"user").get("phone_numbers")).size()).isZero();
    }
    @Test void invalidSecondaryNumberDoesNotPartiallyChangeTheNameOrPassword() {
        long alice=user();var body=payload();body.put("phone_numbers",List.of(Map.of("phone","123","country","CA")));
        body.put("new_password","new-synthetic-password");body.put("confirm_new_password","new-synthetic-password");
        assertThatThrownBy(()->profiles.saveCurrentUser(7,alice,"user",body)).isInstanceOf(ProfileInputException.class);
        assertThat(db.queryForObject("SELECT full_name FROM users WHERE id=?",String.class,alice)).isEqualTo("Synthetic User");
        assertThat(db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,alice)).isEqualTo("test-only");
    }
    @Test void legacyPhoneRemainsReadableAndPasswordIsStoredWithoutTrimming() {
        long alice=user();
        db.update("INSERT INTO user_profiles(user_id,phone,country) VALUES (?,?,'MX')",alice,"+525555123456");
        assertThat(new ObjectMapper().valueToTree(profiles.getCurrentUser(alice,"user").get("phone_numbers")).size()).isEqualTo(1);
        var body=payload();body.put("telefono","+525555123456");body.put("new_password"," synthetic secret ");body.put("confirm_new_password"," synthetic secret ");
        profiles.saveCurrentUser(7,alice,"user",body);
        var hash=db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,alice);
        assertThat(new BCryptPasswordEncoder().matches(" synthetic secret ",hash)).isTrue();
        assertThat(new BCryptPasswordEncoder().matches("synthetic secret",hash)).isFalse();
    }
}
