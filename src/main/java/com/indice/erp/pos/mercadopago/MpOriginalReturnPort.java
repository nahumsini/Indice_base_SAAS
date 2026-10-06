package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
/** Explicit original-tender owner contract for POS physical returns. */
@Service
@RequiredArgsConstructor
public class MpOriginalReturnPort {
    private final MpRefundService owner;
    public MpRefundRecord refund(PosContext context,long intentId,MpRefundRequest request,long returnId){return owner.refundOriginalReturn(context,intentId,request,returnId);}
}
