-- Optional defense-in-depth policies for Neon Postgres.
-- The application service layer must still enforce tenant checks.

ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_test_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_answer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_anonymization_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_users_tenant_isolation ON client_users
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY tests_tenant_isolation ON tests
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY client_test_quotas_tenant_isolation ON client_test_quotas
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY participants_tenant_isolation ON participants
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY participant_tokens_tenant_isolation ON participant_tokens
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY participant_consents_tenant_isolation ON participant_consents
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY participant_answer_drafts_tenant_isolation ON participant_answer_drafts
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY participant_anonymization_audits_tenant_isolation ON participant_anonymization_audits
  USING (client_id = current_setting('app.client_id', true)::uuid);

CREATE POLICY results_tenant_isolation ON results
  USING (client_id = current_setting('app.client_id', true)::uuid);
