package com.indice.erp.ai.hr;

import static com.indice.erp.ai.hr.AiHrContracts.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.ai.action.AiActionRepository;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.hr.assistant.HrAssistantContracts.*;
import com.indice.erp.hr.assistant.HrAssistantService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

/** Uses established immutable confirmation and execution persistence. */
@Service
public class AiHrActionService {
    private final AiActionRepository repository;
    private final AiHrExecutionService execution;
    private final HrAssistantService owner;
    private final AiHrAccess access;
    private final ObjectMapper mapper;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    public AiHrActionService(AiActionRepository repository, AiHrExecutionService execution, HrAssistantService owner, AiHrAccess access, ObjectMapper mapper, Clock clock) {
        this.repository=repository; this.execution=execution; this.owner=owner; this.access=access; this.mapper=mapper; this.clock=clock;
    }
    public Preview preview(StoredToken token, String action, Change request) {
        access.require(token, action);
        var prepared=owner.prepare(token.user(), action, request);
        byte[] bytes=new byte[32]; random.nextBytes(bytes);
        var raw="idx_confirm_"+Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var expires=clock.instant().plus(Duration.ofMinutes(5));
        Map<String,Object> normalized=mapper.convertValue(prepared,new TypeReference<>(){});
        var id=repository.insertConfirmation(token, internal(action), hash(raw), hash(json(prepared)), normalized, expires);
        repository.insertAudit(token, action, id, "PREVIEW", "SUCCESS", UUID.randomUUID().toString(), null, Map.of("action",action), null, null, null);
        var effects=new ArrayList<String>();
        effects.add("Guarda exclusivamente los datos mostrados después de confirmar. Las validaciones y efectos pertenecen a RH.");
        if(com.indice.erp.hr.assistant.HrAssistantPayrollService.ACTIONS.contains(action))effects.add("Aplica los importes y monedas calculados por el propietario de nómina. Conserva reglas del país, separación de funciones y trazabilidad; un cambio de importes requiere una nueva revisión.");
        if(action.equals("adjust_hr_payroll_line"))effects.add("Reemplaza todos los conceptos manuales de la línea seleccionada. Conserva incentivos aplicados y recalcula deducciones y aportaciones con el motor oficial.");
        if(action.equals("recalculate_hr_payroll"))effects.add("Actualiza cálculos y registra la revisión; la nómina sigue en borrador.");
        if(action.equals("approve_hr_payroll"))effects.add("Aprueba y congela la nómina validada; crea las cuentas por pagar configuradas por el propietario. No transfiere dinero.");
        if(action.equals("register_hr_payroll_paid"))effects.add("Registra el pago según el ciclo existente; exige las cuentas por pagar ya pagadas y conserva separación de funciones. Esta acción no inicia una transferencia.");
        if (Set.of("create_employee","import_employees").contains(action)) effects.add("Crea expediente y acceso estándar; ocupa los lugares disponibles del plan. No entrega contraseñas ni asigna privilegios administrativos.");
        if ("update_employee".equals(action)) effects.add("Conserva el rol de acceso y los campos omitidos. Las condiciones laborales mostradas alimentan asistencia y nómina.");
        if ("inactivate_employee".equals(action)) effects.add("Inactiva el acceso a la empresa y conserva el expediente, documentos e historial. No equivale a una terminación laboral.");
        if ("terminate_employee".equals(action)) effects.add("Registra la baja laboral, fecha y motivos mostrados; inactiva la membresía y conserva el expediente. No calcula ni paga un finiquito.");
        if (Set.of("reassign_hr_asset","change_hr_asset_status").contains(action)) effects.add("Cierra la asignación anterior cuando corresponde y conserva el historial de responsables y estados del activo.");
        if ("update_announcement".equals(action)) effects.add("Reemplaza el contenido y la audiencia mostrados. El propietario cancela las entregas anteriores y sincroniza las nuevas si se publica.");
        if (Set.of("create_hr_record","update_hr_record").contains(action)) effects.add("Guarda los acuerdos y testigos mostrados. Conserva el expediente del acta y registra los cambios de estado en su historial.");
        if (action.startsWith("mark_announcement_")) effects.add("Cambia exclusivamente la lectura de tu propia membresía; no marca el comunicado como leído por otros colaboradores.");
        if ("create_announcement".equals(action)) effects.add("published entrega el comunicado a la audiencia; draft no lo entrega. scheduled usa la fecha local que interpreta el módulo de comunicados.");
        if(action.equals("create_my_hr_permission"))effects.add("Registra tu solicitud pendiente con las fechas y tratamiento de nómina mostrados.");
        if(action.equals("approve_hr_permission"))effects.add("Aprueba la solicitud y sincroniza las jornadas con asistencia y el tratamiento de nómina mostrado.");
        if(action.equals("reject_hr_permission"))effects.add("Guarda el rechazo y las notas de revisión; conserva la solicitud.");
        if(action.equals("withdraw_my_hr_permission"))effects.add("Elimina únicamente tu solicitud pendiente y sus adjuntos mediante el ciclo existente; conserva la auditoría de la acción delegada.");
        if(action.equals("create_hr_incentive"))effects.add("Registra aplicaciones de nómina con los importes, monedas y destinatarios mostrados y calculados por el propietario. No paga ni transfiere dinero.");
        if(action.equals("cancel_hr_incentive"))effects.add("Pausa el incentivo y cancela aplicaciones todavía aprobadas; conserva las ya aplicadas y sus importes históricos.");
        if(com.indice.erp.hr.assistant.HrAssistantAttendanceService.ACTIONS.contains(action)) effects.add("Aplica exclusivamente la configuración, colaboradores y fechas mostrados mediante el propietario de asistencia. Conserva el historial de eventos y recalcula la proyección usada por nómina.");
        if(action.equals("update_hr_schedule"))effects.add("Reemplaza todas las reglas del horario mostrado. Las asignaciones existentes conservan la referencia al horario y usan sus nuevas reglas.");
        if(action.equals("assign_hr_schedule"))effects.add("Cierra o divide las asignaciones de horario que se superponen con el rango mostrado. Rechaza actividad registrada o un contrato de sitio incompatible.");
        if(action.equals("set_hr_allowed_locations"))effects.add("Reemplaza la lista completa de ubicaciones permitidas por la selección mostrada; una lista vacía retira las ubicaciones anteriores.");
        if(action.equals("clear_hr_work_assignments"))effects.add("Retira horario y sitio exclusivamente para el día mostrado, conservando o dividiendo los rangos restantes mediante el propietario.");
        if(action.equals("correct_hr_attendance"))effects.add("Registra eventos administrativos de corrección para las fechas mostradas. status vacío elimina la corrección y vuelve al estado calculado; no inventa entradas físicas.");
        if(action.equals("record_hr_attendance_event"))effects.add("Registra la entrada o salida como ajuste administrativo, con la fecha y hora mostradas. El estado final se recalcula al guardar; no sustituye identificación, biometría ni captura en kiosco.");
        return new Preview(action,raw,expires,true,prepared.before(),prepared.after(),prepared.change(),List.copyOf(effects));
    }
    public Committed commit(StoredToken token,String action,CommitRequest request) {
        access.require(token,action);
        if(request==null||request.confirmationToken()==null||!request.confirmationToken().matches("idx_confirm_[A-Za-z0-9_-]{43}")||request.idempotencyKey()==null||request.idempotencyKey().isBlank()||request.idempotencyKey().length()<8||request.idempotencyKey().length()>128)
            throw new IllegalArgumentException("Valid confirmation and idempotency key required.");
        var confirmation=repository.findConfirmation(hash(request.confirmationToken())).orElseThrow(()->new Conflict("confirmation_invalid"));
        if(!internal(action).equals(confirmation.tool())||confirmation.accessTokenId()!=token.id()||confirmation.companyId()!=token.user().companyId()||confirmation.userId()!=token.user().userId()||confirmation.userCompanyId()!=token.user().userCompanyId()) throw new Conflict("confirmation_identity_mismatch");
        var key=hash(request.idempotencyKey());
        var existing=repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key);
        if(existing.isPresent()) return replay(token,action,confirmation,existing.get(),key);
        if(confirmation.consumedAt()!=null) throw new Conflict("confirmation_used");
        if(!confirmation.expiresAt().isAfter(clock.instant())) throw new Conflict("confirmation_expired");
        try { return execution.execute(token,confirmation,key,UUID.randomUUID().toString()); }
        catch(DuplicateKeyException exception) {
            var raced=repository.findExecution(token.user().companyId(),token.user().userId(),internal(action),key).orElseThrow(()->exception);
            return replay(token,action,confirmation,raced,key);
        } catch(RuntimeException exception) {
            repository.insertAudit(token,action,confirmation.id(),"COMMIT","FAILURE",UUID.randomUUID().toString(),key,Map.of("action",action),null,"action_failed","The HR owner rejected this operation.");
            throw exception;
        }
    }
    private Committed replay(StoredToken token,String action,AiActionRepository.Confirmation confirmation,AiActionRepository.Execution result,String key) {
        if(result.confirmationId()!=confirmation.id()||!result.fingerprint().equals(confirmation.fingerprint())) throw new Conflict("idempotency_key_conflict");
        if(!"COMPLETED".equals(result.status())) throw new Conflict("action_in_progress");
        var saved=mapper.convertValue(result.result(),Result.class); owner.requireResultAccess(token.user(),saved);
        repository.insertAudit(token,action,confirmation.id(),"COMMIT","REPLAY",result.correlationId(),key,Map.of("action",action),null,null,null);
        return new Committed(action,true,result.correlationId(),saved);
    }
    static String internal(String action) { if(!HrAssistantService.ACTIONS.contains(action)) throw new IllegalArgumentException("Unsupported HR action."); return "hr_action_v1:"+action; }
    private String json(Object value) { try{return mapper.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Invalid HR confirmation.",e);} }
    private String hash(String value) { try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException("SHA-256 unavailable.",e);} }
}
