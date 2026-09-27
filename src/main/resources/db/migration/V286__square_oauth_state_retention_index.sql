ALTER TABLE pos_square_oauth_states
  ADD KEY ix_square_oauth_state_expiry (expires_at, id);
