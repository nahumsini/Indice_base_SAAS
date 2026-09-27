ALTER TABLE pos_mercado_pago_oauth_states
  ADD KEY ix_mp_oauth_state_expiry (expires_at, id);
