package com.indice.erp.sales.funneling.brand;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.configcenter.ConfigCenterService;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;
import static com.indice.erp.sales.funneling.brand.BrandContracts.*;
import static com.indice.erp.sales.funneling.brand.BrandAccess.*;

/** Company-owned advertising context; does not mutate the global company identity or campaigns. */
@Service
public class BrandLibraryService {
    private final JdbcTemplate db;private final ObjectMapper mapper;private final BrandAccess access;
    private final ConfigCenterService company;private final Validator validator;
    public BrandLibraryService(JdbcTemplate db,ObjectMapper mapper,BrandAccess access,ConfigCenterService company,Validator validator){this.db=db;this.mapper=mapper;this.access=access;this.company=company;this.validator=validator;}
    private record Stored(Details details,long version,String mutation,String digest) {}
    private Stored stored(long tenant){return db.query("SELECT * FROM sales_brand_profiles WHERE company_id=?",(r,n)->new Stored(decode(r.getString("details_json"),Details.class),r.getLong("version"),r.getString("last_mutation_id"),r.getString("last_digest")),tenant).stream().findFirst().orElse(new Stored(empty(),0,null,null));}
    @Transactional(readOnly=true)
    public Profile get(AuthSessionUser a){access.read(a);var s=stored(a.companyId());return new Profile(name(a),company.getCompanyLogo(a.companyId()),s.details(),s.version(),key(a));}
    private String name(AuthSessionUser a){return db.queryForObject("SELECT name FROM companies WHERE id=?",String.class,a.companyId());}
    @Transactional
    public Profile save(AuthSessionUser a,String expected,ProfileInput in){
        access.mutation(a,expected);require(in!=null&&validator.validate(in).isEmpty(),BAD_REQUEST,"brand_input_invalid");uuid(in.mutationId());
        var current=stored(a.companyId());
        String json=encode(in.details()),digest=digest(json);
        if(in.mutationId().equals(current.mutation())){require(digest.equals(current.digest()),CONFLICT,"brand_retry_changed");return get(a);}
        require(current.version()==in.version(),CONFLICT,"brand_version_conflict");
        db.update("INSERT INTO sales_brand_profiles(company_id,details_json,version,last_mutation_id,last_digest) VALUES(?,?,1,?,?) ON DUPLICATE KEY UPDATE details_json=VALUES(details_json),version=version+1,last_mutation_id=VALUES(last_mutation_id),last_digest=VALUES(last_digest),updated_at=CURRENT_TIMESTAMP(6)",a.companyId(),json,in.mutationId(),digest);
        audit(a,"PROFILE",null,current.version()+1);return get(a);
    }
    @Transactional(readOnly=true)
    public Snapshot snapshot(AuthSessionUser a,String id){access.read(a);campaign(a,id);return db.query("SELECT snapshot_json FROM sales_funnel_brand_contexts WHERE company_id=? AND funnel_id=?",(r,n)->decode(r.getString(1),Snapshot.class),a.companyId(),id).stream().findFirst().orElse(new Snapshot(name(a),empty(),List.of(),0,0,false));}
    @Transactional
    public Snapshot select(AuthSessionUser a,String expected,String id,Selection in){
        access.mutation(a,expected);campaign(a,id);require(in!=null&&validator.validate(in).isEmpty(),BAD_REQUEST,"brand_input_invalid");uuid(in.mutationId());
        require(new HashSet<>(in.assetIds()).size()==in.assetIds().size(),BAD_REQUEST,"brand_input_invalid");in.assetIds().forEach(BrandAccess::uuid);
        var prior=db.queryForList("SELECT version,last_mutation_id,last_digest FROM sales_funnel_brand_contexts WHERE company_id=? AND funnel_id=?",a.companyId(),id);
        String hash=digest(encode(List.of(in.includeProfile(),in.profileVersion(),in.assetIds())));
        if(!prior.isEmpty()&&in.mutationId().equals(prior.getFirst().get("last_mutation_id"))){require(hash.equals(prior.getFirst().get("last_digest")),CONFLICT,"brand_retry_changed");return snapshot(a,id);}
        long version=prior.isEmpty()?0:((Number)prior.getFirst().get("version")).longValue();require(version==in.version(),CONFLICT,"brand_version_conflict");
        var profile=stored(a.companyId());require(!in.includeProfile()||profile.version()==in.profileVersion(),CONFLICT,"brand_profile_changed");
        List<Asset> assets=in.assetIds().stream().map(file->{var rows=db.query("SELECT * FROM sales_brand_assets WHERE company_id=? AND id=? AND status IN ('READY','ARCHIVED')",(r,n)->asset(r),a.companyId(),file);require(!rows.isEmpty(),BAD_REQUEST,"brand_asset_unavailable");var asset=rows.getFirst();require(asset.status().equals("READY")||snapshot(a,id).assets().stream().anyMatch(old->old.id().equals(file)),BAD_REQUEST,"brand_asset_unavailable");return asset;}).toList();
        var result=new Snapshot(name(a),in.includeProfile()?profile.details():empty(),assets,version+1,in.includeProfile()?profile.version():0,in.includeProfile());
        db.update("INSERT INTO sales_funnel_brand_contexts(company_id,funnel_id,snapshot_json,version,last_mutation_id,last_digest) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE snapshot_json=VALUES(snapshot_json),version=VALUES(version),last_mutation_id=VALUES(last_mutation_id),last_digest=VALUES(last_digest),updated_at=CURRENT_TIMESTAMP(6)",a.companyId(),id,encode(result),version+1,in.mutationId(),hash);
        audit(a,"SELECTION",id,version+1);return result;
    }
    private void campaign(AuthSessionUser a,String id){uuid(id);require(Boolean.TRUE.equals(db.queryForObject("SELECT EXISTS(SELECT 1 FROM sales_funnels WHERE company_id=? AND id=?)",Boolean.class,a.companyId(),id)),NOT_FOUND,"funnel_not_found");}
    static Asset asset(java.sql.ResultSet r)throws java.sql.SQLException{return new Asset(r.getString("id"),r.getString("filename"),r.getString("content_type"),r.getLong("size_bytes"),r.getString("category"),r.getString("status"),r.getString("description"),r.getString("logo_variant"));}
    void audit(AuthSessionUser a,String event,String reference,long version){db.update("INSERT INTO sales_brand_audit(company_id,actor_id,event_type,reference_id,version) VALUES(?,?,?,?,?)",a.companyId(),a.userId(),event,reference,version);}
    private String encode(Object value){try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Unable to encode brand context",e);}}
    private <T>T decode(String json,Class<T> type){try{return mapper.readValue(json,type);}catch(Exception e){throw new IllegalStateException("Invalid stored brand context",e);}}
    private static String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
}
