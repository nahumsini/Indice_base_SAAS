package com.indice.erp.pos.ticket;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.payment.PaymentMapper;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.ticket.dto.PosTicketDetailResponse;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final TicketMapper ticketMapper;
    private final PaymentMapper paymentMapper;

    public TicketService(
            TicketRepository ticketRepository,
            PaymentRepository paymentRepository,
            TicketMapper ticketMapper,
            PaymentMapper paymentMapper) {
        this.ticketRepository = ticketRepository;
        this.paymentRepository = paymentRepository;
        this.ticketMapper = ticketMapper;
        this.paymentMapper = paymentMapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> list(PosContext context) {
        var items = ticketRepository.findAll(context).stream().map(ticketMapper::toResponse).toList();
        return Map.of("items", items, "count", items.size());
    }

    @Transactional(readOnly = true)
    public PosTicketDetailResponse get(PosContext context, long ticketId) {
        var ticket = ticketRepository.findById(context, ticketId)
            .orElseThrow(() -> new NoSuchElementException("Ticket not found."));
        var items = ticketRepository.findItems(context, ticketId).stream().map(ticketMapper::toResponse).toList();
        var payments = paymentRepository.findByTicketId(context, ticketId).stream().map(paymentMapper::toResponse).toList();
        return new PosTicketDetailResponse(ticketMapper.toResponse(ticket), items, payments);
    }
}
