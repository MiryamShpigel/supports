-- More free-text synonyms, found while testing real questions.
-- Metadata only: the parsers pick them up without any code change.

UPDATE meta.field_options SET synonyms = synonyms || '{הוגש,הוגשו,שהוגשו}'
WHERE dataset_key = 'support-requests' AND field_key = 'status' AND value = 'submitted';

UPDATE meta.field_options SET synonyms = synonyms || '{אושר}'
WHERE dataset_key = 'support-requests' AND field_key = 'status' AND value = 'approved';

UPDATE meta.field_options SET synonyms = synonyms || '{נדחה,שנדחו}'
WHERE dataset_key = 'support-requests' AND field_key = 'status' AND value = 'rejected';

UPDATE meta.field_options SET synonyms = synonyms || '{מוסד התרבות,מוסדות התרבות}'
WHERE dataset_key = 'support-requests' AND field_key = 'org_type' AND value = 'culture_institution';
