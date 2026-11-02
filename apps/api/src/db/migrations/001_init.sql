-- Schemas separate responsibilities:
--   app  - application data (tenants, saved queries, audit)
--   meta - metadata that drives the UI, query engine and AI parser
--   data - the business data being queried (one table per dataset)
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS meta;
CREATE SCHEMA IF NOT EXISTS data;

-- A tenant is a ministry / administration using the system.
CREATE TABLE app.tenants (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- metadata

CREATE TABLE meta.datasets (
  key              text PRIMARY KEY,
  tenant_id        text NOT NULL REFERENCES app.tenants(id),
  label            text NOT NULL,
  question_prefix  text NOT NULL,
  source_table     text NOT NULL CHECK (source_table ~ '^[a-z_]+\.[a-z_][a-z0-9_]*$'),
  is_active        boolean NOT NULL DEFAULT true
);

CREATE TABLE meta.fields (
  dataset_key      text NOT NULL REFERENCES meta.datasets(key) ON DELETE CASCADE,
  key              text NOT NULL CHECK (key ~ '^[a-z_][a-z0-9_]*$'),
  label            text NOT NULL,
  data_type        text NOT NULL CHECK (data_type IN ('enum', 'number', 'year', 'text')),
  -- 'column': a physical column. 'attribute': a key inside the JSONB attributes column,
  -- which is how new fields are added without a schema change.
  storage          text NOT NULL CHECK (storage IN ('column', 'attribute')),
  source_name      text NOT NULL CHECK (source_name ~ '^[a-z_][a-z0-9_]*$'),
  operators        text[] NOT NULL DEFAULT '{}',
  is_filterable    boolean NOT NULL DEFAULT true,
  is_groupable     boolean NOT NULL DEFAULT true,
  is_listable      boolean NOT NULL DEFAULT true,
  phrase_template  text,
  range_template   text,
  synonyms         text[] NOT NULL DEFAULT '{}',
  sort_order       int NOT NULL DEFAULT 100,
  is_active        boolean NOT NULL DEFAULT true,
  PRIMARY KEY (dataset_key, key)
);

CREATE TABLE meta.field_options (
  dataset_key  text NOT NULL,
  field_key    text NOT NULL,
  value        text NOT NULL,
  label        text NOT NULL,
  phrase       text,
  synonyms     text[] NOT NULL DEFAULT '{}',
  sort_order   int NOT NULL DEFAULT 100,
  PRIMARY KEY (dataset_key, field_key, value),
  FOREIGN KEY (dataset_key, field_key) REFERENCES meta.fields(dataset_key, key) ON DELETE CASCADE
);

CREATE TABLE meta.metrics (
  dataset_key    text NOT NULL REFERENCES meta.datasets(key) ON DELETE CASCADE,
  key            text NOT NULL CHECK (key ~ '^[a-z_][a-z0-9_]*$'),
  label          text NOT NULL,
  aggregate      text NOT NULL CHECK (aggregate IN ('count', 'sum', 'avg')),
  source_column  text CHECK (source_column ~ '^[a-z_][a-z0-9_]*$'),
  synonyms       text[] NOT NULL DEFAULT '{}',
  sort_order     int NOT NULL DEFAULT 100,
  PRIMARY KEY (dataset_key, key),
  CHECK (aggregate = 'count' OR source_column IS NOT NULL)
);

-- ---------------------------------------------------------------- business data

CREATE TABLE data.support_requests (
  id                 bigserial PRIMARY KEY,
  tenant_id          text NOT NULL REFERENCES app.tenants(id),
  organization_name  text NOT NULL,
  org_type           text NOT NULL,
  domain             text NOT NULL,
  district           text NOT NULL,
  year               int  NOT NULL,
  status             text NOT NULL,
  requested_amount   numeric(14, 2) NOT NULL CHECK (requested_amount >= 0),
  attributes         jsonb NOT NULL DEFAULT '{}',
  submitted_at       timestamptz NOT NULL DEFAULT now()
);

-- Every query is scoped by tenant, so tenant leads each index.
CREATE INDEX ix_support_requests_tenant_year     ON data.support_requests (tenant_id, year);
CREATE INDEX ix_support_requests_tenant_status   ON data.support_requests (tenant_id, status);
CREATE INDEX ix_support_requests_tenant_domain   ON data.support_requests (tenant_id, domain);
CREATE INDEX ix_support_requests_tenant_district ON data.support_requests (tenant_id, district);
CREATE INDEX ix_support_requests_attributes      ON data.support_requests USING gin (attributes);

-- ---------------------------------------------------------------- saved queries & audit

CREATE TABLE app.saved_queries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text NOT NULL REFERENCES app.tenants(id),
  name         text NOT NULL,
  description  text,
  definition   jsonb NOT NULL,
  created_by   text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  last_run_at  timestamptz,
  UNIQUE (tenant_id, created_by, name)
);

CREATE TABLE app.audit_log (
  id              bigserial PRIMARY KEY,
  tenant_id       text NOT NULL,
  user_id         text NOT NULL,
  action          text NOT NULL,
  entity_type     text,
  entity_id       text,
  details         jsonb NOT NULL DEFAULT '{}',
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_audit_log_tenant_time ON app.audit_log (tenant_id, created_at DESC);
