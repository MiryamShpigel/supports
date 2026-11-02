-- Reverts add-social-cluster-field.sql, so the demo can be repeated.
--   docker compose exec -T db psql -U supports -d supports < apps/api/src/db/examples/remove-social-cluster-field.sql

BEGIN;
DELETE FROM meta.fields WHERE dataset_key = 'support-requests' AND key = 'social_cluster';
UPDATE data.support_requests SET attributes = attributes - 'social_cluster';
COMMIT;
