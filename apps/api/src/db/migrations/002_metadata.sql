-- Everything the user can filter, group and measure is defined here, as data.

INSERT INTO app.tenants (id, name) VALUES
  ('culture-sport', 'מינהל התרבות והספורט');

INSERT INTO meta.datasets (key, tenant_id, label, question_prefix, source_table) VALUES
  ('support-requests', 'culture-sport', 'בקשות תמיכה', 'הצג את כלל בקשות התמיכה', 'data.support_requests');

INSERT INTO meta.fields
  (dataset_key, key, label, data_type, storage, source_name, operators,
   is_filterable, is_groupable, is_listable, phrase_template, range_template, synonyms, sort_order)
VALUES
  ('support-requests', 'organization_name', 'שם הגוף', 'text', 'column', 'organization_name', '{}',
   false, false, true, NULL, NULL, '{}', 1),
  ('support-requests', 'status', 'סטטוס בקשה', 'enum', 'column', 'status', '{in}',
   true, true, true, '{values}', NULL, '{סטטוס,סטטוסים}', 10),
  ('support-requests', 'org_type', 'סוג גוף', 'enum', 'column', 'org_type', '{in}',
   true, true, true, 'ל{values}', NULL, '{סוג הגוף,סוגי גופים,גוף מגיש}', 20),
  ('support-requests', 'domain', 'תחום תמיכה', 'enum', 'column', 'domain', '{in}',
   true, true, true, 'בתחום {values}', NULL, '{תחום,תחומים}', 30),
  ('support-requests', 'district', 'מחוז', 'enum', 'column', 'district', '{in}',
   true, true, true, 'במחוז {values}', NULL, '{מחוזות}', 40),
  ('support-requests', 'year', 'שנה', 'year', 'column', 'year', '{in,between}',
   true, true, true, 'בשנת {values}', 'בשנים {from}–{to}', '{שנים,שנת תמיכה}', 50),
  ('support-requests', 'requested_amount', 'סכום מבוקש (₪)', 'number', 'column', 'requested_amount', '{between}',
   true, false, true, NULL, 'בסכום של {from}–{to} ₪', '{}', 60);

INSERT INTO meta.field_options (dataset_key, field_key, value, label, phrase, synonyms, sort_order) VALUES
  ('support-requests', 'status', 'submitted', 'הוגשה', 'שהוגשו', '{בסטטוס הוגשה,ממתינות}', 1),
  ('support-requests', 'status', 'in_review', 'בבדיקה', 'שנמצאות בבדיקה', '{בטיפול}', 2),
  ('support-requests', 'status', 'approved', 'אושרה', 'שאושרו', '{אושרו,מאושרות}', 3),
  ('support-requests', 'status', 'rejected', 'נדחתה', 'שנדחו', '{נדחו,דחויות}', 4),

  ('support-requests', 'org_type', 'association', 'עמותה', 'עמותות', '{עמותות}', 1),
  ('support-requests', 'org_type', 'municipality', 'רשות מקומית', 'רשויות מקומיות', '{רשויות מקומיות,רשויות,עיריות,מועצות}', 2),
  ('support-requests', 'org_type', 'sports_club', 'אגודה', 'אגודות', '{אגודות}', 3),
  ('support-requests', 'org_type', 'culture_institution', 'מוסד תרבות', 'מוסדות תרבות', '{מוסדות תרבות}', 4),

  ('support-requests', 'domain', 'culture', 'תרבות', 'התרבות', '{}', 1),
  ('support-requests', 'domain', 'sport', 'ספורט', 'הספורט', '{}', 2),
  ('support-requests', 'domain', 'museums', 'מוזיאונים', 'המוזיאונים', '{מוזיאון}', 3),
  ('support-requests', 'domain', 'libraries', 'ספריות', 'הספריות', '{ספרייה}', 4),
  ('support-requests', 'domain', 'culture_events', 'אירועי תרבות', 'אירועי התרבות', '{}', 5),

  ('support-requests', 'district', 'north', 'צפון', NULL, '{}', 1),
  ('support-requests', 'district', 'haifa', 'חיפה', NULL, '{}', 2),
  ('support-requests', 'district', 'center', 'מרכז', NULL, '{}', 3),
  ('support-requests', 'district', 'tel_aviv', 'תל אביב', NULL, '{תל-אביב}', 4),
  ('support-requests', 'district', 'jerusalem', 'ירושלים', NULL, '{}', 5),
  ('support-requests', 'district', 'south', 'דרום', NULL, '{}', 6),
  ('support-requests', 'district', 'judea_samaria', 'יהודה ושומרון', NULL, '{"יו\"ש"}', 7);

INSERT INTO meta.metrics (dataset_key, key, label, aggregate, source_column, synonyms, sort_order) VALUES
  ('support-requests', 'count', 'מספר בקשות', 'count', NULL, '{מספר,כמה,כמות}', 1),
  ('support-requests', 'total_amount', 'סכום מבוקש', 'sum', 'requested_amount', '{סכום,סך,תקציב}', 2),
  ('support-requests', 'avg_amount', 'סכום ממוצע', 'avg', 'requested_amount', '{ממוצע}', 3);
