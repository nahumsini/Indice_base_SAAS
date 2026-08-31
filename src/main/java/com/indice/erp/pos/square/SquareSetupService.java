package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SquareSetupService {

    private static final String SCOPES =
        "DEVICE_CREDENTIAL_MANAGEMENT,MERCHANT_PROFILE_READ,PAYMENTS_READ,PAYMENTS_WRITE";

    private final SquareTerminalProperties properties;
    private final SquareTerminalSecretProvider secrets;
    private final SquareTokenCodec tokenCodec;
    private final SquareConnectionTokenService tokenService;
    private final SquareTerminalGateway gateway;
    private final SquareConnectionRepository connections;
    private final SquareTerminalRepository terminals;
    private final CashRegisterService cashRegisters;
    private final SquareAuditService audit;
    private final Clock clock;

    public SquareSetupService(SquareTerminalProperties properties, SquareTerminalSecretProvider secrets,
            SquareTokenCodec tokenCodec, SquareConnectionTokenService tokenService, SquareTerminalGateway gateway,
            SquareConnectionRepository connections, SquareTerminalRepository terminals,
            CashRegisterService cashRegisters, SquareAuditService audit, Clock clock) {
        this.properties = properties;
        this.secrets = secrets;
        this.tokenCodec = tokenCodec;
        this.tokenService = tokenService;
        this.gateway = gateway;
        this.connections = connections;
        this.terminals = terminals;
        this.cashRegisters = cashRegisters;
        this.audit = audit;
        this.clock = clock;
    }

    public SquareTerminalDtos.OAuthStartResponse startOAuth(PosContext context) {
        secrets.requireEnabled();
        var state = SquareHashing.randomHex(32);
        connections.createOAuthState(context, SquareHashing.sha256(state), properties.getEnvironment(),
            clock.instant().plusSeconds(properties.getOauthStateTtlSeconds()));
        var url = properties.apiBaseUrl() + "/oauth2/authorize?client_id=" + enc(secrets.applicationId())
            + "&scope=" + enc(SCOPES) + "&session=false&state=" + enc(state)
            + "&redirect_uri=" + enc(properties.getRedirectUrl());
        return new SquareTerminalDtos.OAuthStartResponse(url);
    }

    public SquareTerminalDtos.OAuthCallbackResponse completeOAuth(String code, String state) {
        secrets.requireEnabled();
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            throw PosApiException.badRequest("Square OAuth code and state are required.");
        }
        var stored = connections.consumeOAuthState(SquareHashing.sha256(state), clock.instant());
        if (stored == null) throw PosApiException.badRequest("Square OAuth state is invalid or expired.");
        var token = gateway.exchangeCode(code.trim());
        connections.upsertConnection(stored, new SquareRecords.Connection(0, stored.companyId(),
            token.merchantId(), tokenCodec.protect(token.accessToken()),
            token.refreshToken() == null ? null : tokenCodec.protect(token.refreshToken()), token.expiresAt()));
        audit.record(new PosContext(stored.userId(), stored.companyId(), "Square OAuth", "system", true,
            com.indice.erp.pos.PosScope.corporateOffice()), "SQUARE_CONNECTED", "OK",
            "Square OAuth connection completed.");
        return new SquareTerminalDtos.OAuthCallbackResponse(true, token.merchantId());
    }

    public List<SquareTerminalDtos.SquareLocation> squareLocations(PosContext context) {
        return tokenService.withToken(context, gateway::listLocations);
    }

    public SquareRecords.Location linkLocation(PosContext context, String squareLocationId) {
        var match = squareLocations(context).stream()
            .filter(location -> location.id().equals(squareLocationId))
            .findFirst()
            .orElseThrow(() -> PosApiException.badRequest("Square location was not found for this merchant."));
        var linked = connections.upsertLocation(context, match);
        audit.record(context, "LOCATION_LINKED", "OK", "Square location linked.");
        return linked;
    }

    public SquareTerminalDtos.PairTerminalResponse pairTerminal(
            PosContext context, SquareTerminalDtos.PairTerminalRequest request) {
        var location = connections.findLocation(context, request.squareLocationId())
            .orElseThrow(() -> PosApiException.badRequest("Link the Square location before pairing a terminal."));
        var name = blank(request.name()) == null ? "Indice POS Terminal" : request.name().trim();
        var code = tokenService.withToken(context, token -> gateway.createDeviceCode(
            token, SquareHashing.randomHex(16), location.squareLocationId(), name));
        var terminal = terminals.insert(context, location, code.id(), code.code(), name, code.pairBy());
        audit.recordTerminal(context, terminal.id(), "TERMINAL_PAIRING_CREATED", "WAITING",
            "Square Terminal pairing code created.");
        return new SquareTerminalDtos.PairTerminalResponse(terminal.id(), code.id(), code.code(), code.pairBy());
    }

    @Transactional
    public SquareTerminalDtos.TerminalResponse assignTerminal(
            PosContext context, long registerId, long terminalId) {
        cashRegisters.requireOperationalRegister(context, registerId);
        var terminal = terminals.findById(context, terminalId)
            .orElseThrow(() -> PosApiException.badRequest("Square terminal was not found."));
        if (!"PAIRED".equalsIgnoreCase(terminal.status()) || blank(terminal.deviceId()) == null) {
            throw PosApiException.badRequest("Square terminal must be paired before assignment.");
        }
        terminals.assign(context, registerId, terminalId);
        audit.recordTerminal(context, terminalId, "TERMINAL_ASSIGNED", "OK",
            "Square Terminal assigned to POS register " + registerId + ".");
        return terminal(terminals.findById(context, terminalId).orElseThrow());
    }

    @Transactional
    public void unassignTerminal(PosContext context, long registerId) {
        cashRegisters.requireOperationalRegister(context, registerId);
        terminals.unassign(context, registerId);
        audit.record(context, "TERMINAL_UNASSIGNED", "OK",
            "Square Terminal unassigned from POS register " + registerId + ".");
    }

    @Transactional
    public SquareTerminalDtos.TerminalResponse disableTerminal(PosContext context, long terminalId) {
        var terminal = terminals.findById(context, terminalId)
            .orElseThrow(() -> PosApiException.notFound("Square terminal was not found."));
        if (!terminals.disable(context, terminal.id())) {
            throw PosApiException.conflict("Square terminal could not be disabled.");
        }
        audit.recordTerminal(context, terminalId, "TERMINAL_DISABLED", "OK",
            "Square Terminal disabled.");
        return terminal(terminals.findById(context, terminalId).orElseThrow());
    }

    @Transactional
    public SquareTerminalDtos.PairTerminalResponse refreshPairingCode(PosContext context, long terminalId) {
        var terminal = terminals.findById(context, terminalId)
            .orElseThrow(() -> PosApiException.notFound("Square terminal was not found."));
        if ("PAIRED".equalsIgnoreCase(terminal.status())) {
            throw PosApiException.conflict("Square terminal is already paired.");
        }
        var code = tokenService.withToken(context, token -> gateway.createDeviceCode(
            token, SquareHashing.randomHex(16), terminal.squareLocationId(), terminal.name()));
        if (!terminals.replaceDeviceCode(context, terminal.id(), code.id(), code.code(), code.pairBy())) {
            throw PosApiException.conflict("Square terminal pairing could not be refreshed.");
        }
        audit.recordTerminal(context, terminalId, "TERMINAL_PAIRING_REFRESHED", "WAITING",
            "Square Terminal pairing code refreshed.");
        return new SquareTerminalDtos.PairTerminalResponse(terminal.id(), code.id(), code.code(), code.pairBy());
    }

    public List<SquareTerminalDtos.TerminalResponse> listTerminals(PosContext context) {
        return terminals.list(context).stream().map(this::terminal).toList();
    }

    private SquareTerminalDtos.TerminalResponse terminal(SquareRecords.Terminal terminal) {
        return new SquareTerminalDtos.TerminalResponse(terminal.id(), terminal.name(), terminal.deviceId(),
            terminal.squareLocationId(), terminal.status(), terminal.assignedRegisterId());
    }

    private String enc(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }

    private String blank(String value) {
        return value == null || value.isBlank() ? null : value;
    }
}
