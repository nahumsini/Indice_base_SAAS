package com.indice.erp.files;
import com.indice.erp.auth.*;
import com.indice.erp.billing.subscription.CompanySubscriptionStatusProvider;
import com.indice.erp.hr.users.HrSchedulingDirectoryService;
import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
@Component
public class FileAccess {
 private final SessionAuthService auth;private final SessionCsrfService csrf;private final JdbcTemplate db;
 private final CompanySubscriptionStatusProvider subscriptions;private final HrSchedulingDirectoryService directory;
 public FileAccess(SessionAuthService auth,SessionCsrfService csrf,JdbcTemplate db,CompanySubscriptionStatusProvider subscriptions,HrSchedulingDirectoryService directory){this.auth=auth;this.csrf=csrf;this.db=db;this.subscriptions=subscriptions;this.directory=directory;}
 public AuthSessionUser actor(HttpSession session,String token,boolean write){var a=auth.currentUser(session).orElseThrow(()->new ResponseStatusException(UNAUTHORIZED));require(!auth.isPublicDemoSession(session),FORBIDDEN,"files_access_denied");if(write)try{csrf.requireCsrf(session,token);}catch(IllegalArgumentException e){throw new ResponseStatusException(FORBIDDEN);}read(a);return a;}
 public void read(AuthSessionUser a){require(a!=null&&a.companyId()!=null&&a.userId()!=null,UNAUTHORIZED,"files_access_denied");require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM user_companies WHERE company_id=? AND user_id=? AND status='active')",Boolean.class,a.companyId(),a.userId()))&&directory.eligible(a.companyId(),a.userId()),FORBIDDEN,"files_access_denied");require(subscriptions.currentStatus(a.companyId()).accessAllowed(),PAYMENT_REQUIRED,"files_subscription_required");}
 public void mutation(AuthSessionUser a,String expected){read(a);require(key(a).equals(expected),CONFLICT,"files_actor_changed");db.queryForObject("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,a.companyId());require(!db.queryForList("SELECT id FROM user_companies WHERE company_id=? AND user_id=? AND status='active' FOR UPDATE",a.companyId(),a.userId()).isEmpty(),FORBIDDEN,"files_access_denied");read(a);}
 public static String key(AuthSessionUser a){return "files:"+a.companyId()+":"+a.userId();}
 public static void uuid(String id){try{require(UUID.fromString(id).toString().equals(id),BAD_REQUEST,"files_invalid_id");}catch(NullPointerException|IllegalArgumentException e){throw new ResponseStatusException(BAD_REQUEST,"files_invalid_id");}}
 public static String parent(String id){if(id==null||id.isBlank())return null;uuid(id);return id;}
 public static String name(String s){require(s!=null&&!s.isBlank()&&s.length()<=180&&!s.chars().anyMatch(c->c==47||c==92||Character.isISOControl(c)),BAD_REQUEST,"files_invalid_name");require(!s.trim().equals(".")&&!s.trim().equals(".."),BAD_REQUEST,"files_invalid_name");return s.trim();}
 public static void require(boolean value,org.springframework.http.HttpStatus status,String code){if(!value)throw new ResponseStatusException(status,code);}
}
