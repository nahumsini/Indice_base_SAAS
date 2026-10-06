package com.indice.erp.pos.assistant;
import static com.indice.erp.pos.assistant.PosTerminalContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.mercadopago.*;
import com.indice.erp.pos.square.*;
import com.indice.erp.pos.returns.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
@Service
@RequiredArgsConstructor
public class PosTerminalDispatch {
    private final PosAssistantService pos;private final PosTerminalPreparation preparation;private final PosTerminalReadService reads;
    private final SquareTerminalPaymentService square;private final MpPaymentService mp;private final SquareAssistantPort squarePort;private final MpAssistantPort mpPort;
    private final SquareRefundService squareRefund;private final MpRefundService mpRefund;private final SquareRefundReviewService squareReview;private final MpRefundReviewService mpReview;
    private final PosReturnCoordinator returns;private final PosReturnRepository returnRows;
    public Result dispatch(AuthSessionUser user,Prepared saved,String key){
        if(TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("External terminal work must run outside a database transaction.");
        var ctx=pos.context(user);var c=saved.change();var empty=Records.empty();var records=empty;
        switch(saved.action()){
            case "create_pos_terminal_payment"->{
                var existing=reads.paymentByKey(ctx,c.provider(),key);
                if(existing.isPresent()){if(existing.get().ticketId()==null){if(c.provider().equals("SQUARE"))square.recover(ctx,existing.get().id());else mp.recover(ctx,existing.get().id());}records=new Records(List.of(reads.payment(ctx,c.provider(),existing.get().id())),List.of(),List.of(),List.of());}
                else {var current=preparation.prepare(user,saved.action(),c);if(!PosTerminalSnapshots.canonical(saved).equals(PosTerminalSnapshots.canonical(current)))throw new IllegalStateException("Unstarted terminal checkout changed; review again.");var request=preparation.request(ctx,c.checkout(),saved.checkout().totals().totalAmount(),false,new TreeMap<>());
                    long id=c.provider().equals("SQUARE")?square.create(ctx,PosTerminalPreparation.squareRequest(request,key)).intentId():mp.create(ctx,PosTerminalPreparation.mpRequest(request,key)).intentId();records=new Records(List.of(reads.payment(ctx,c.provider(),id)),List.of(),List.of(),List.of());}
            }
            case "recover_pos_terminal_payment","cancel_pos_terminal_payment"->{boolean cancel=saved.action().startsWith("cancel_");if(c.provider().equals("SQUARE")){if(cancel)square.cancel(ctx,c.id());else square.recover(ctx,c.id());}else{if(cancel)mp.cancel(ctx,c.id());else mp.recover(ctx,c.id());}records=new Records(List.of(reads.payment(ctx,c.provider(),c.id())),List.of(),List.of(),List.of());}
            case "refund_pos_card_payment"->{var in=c.refund();var result=c.provider().equals("SQUARE")?squarePort.safe(squareRefund.refund(ctx,c.id(),new SquareRefundRequest(key,saved.refundAmount(),in.reason()))):mpPort.safe(mpRefund.refund(ctx,c.id(),new MpRefundRequest(key,saved.refundAmount(),in.reason())));records=new Records(List.of(),List.of(result),List.of(),List.of());}
            case "recheck_pos_card_refund"->{var r=reads.refund(ctx,c.provider(),c.id());if(Set.of("PENDING","UNCERTAIN","RECONCILIATION_REQUIRED","DEAD_LETTER").contains(r.status()))r=c.provider().equals("SQUARE")?squarePort.safe(squareReview.recheck(ctx,r.intentId(),r.id(),new SquareRefundReviewRequest(c.reason(),r.version()))):mpPort.safe(mpReview.recheck(ctx,r.intentId(),r.id(),new MpRefundReviewRequest(c.reason(),r.version())));records=new Records(List.of(),List.of(r),List.of(),List.of());}
            case "confirm_pos_card_return"->{var r=returnRows.get(ctx,c.id());if(!"COMPLETED".equals(r.status()))r=returns.confirm(ctx,c.id(),new PosReturnDtos.ConfirmRequest(false,Map.of()));records=new Records(List.of(),reads.returnRefund(ctx,r.id()).stream().toList(),List.of(r),List.of());}
            default->throw new IllegalArgumentException("Unknown terminal dispatch.");
        }
        return new Result(saved.action(),key,records);
    }
}
