-- Demonstration: adding a new field ("אשכול חברתי") with metadata only.
-- No code change, no schema change, no redeploy. Run it and refresh the browser:
-- the field appears in the filters, in grouping, in the phrased question and in the AI prompt.
--
--   docker compose exec -T db psql -U supports -d supports < apps/api/src/db/examples/add-social-cluster-field.sql

BEGIN;

INSERT INTO meta.fields
  (dataset_key, key, label, data_type, storage, source_name, operators,
   is_filterable, is_groupable, is_listable, phrase_template, synonyms, sort_order)
VALUES
  ('support-requests', 'social_cluster', 'אשכול חברתי', 'enum', 'attribute', 'social_cluster', '{in}',
   true, true, true, 'באשכול חברתי {values}', '{אשכול,אשכולות}', 45);

INSERT INTO meta.field_options (dataset_key, field_key, value, label, phrase, sort_order)
SELECT 'support-requests', 'social_cluster', n::text, n::text, n::text, n
FROM generate_series(1, 10) AS n;

-- Backfill: the values arrive from the source system as data (here: random, for the demo).
UPDATE data.support_requests
SET attributes = attributes || jsonb_build_object('social_cluster', (1 + floor(random() * 10))::int::text);

COMMIT;
