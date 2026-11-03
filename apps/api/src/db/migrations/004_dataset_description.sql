-- What a dataset is about, in plain words. It goes into the AI prompt so the model can tell
-- a question this data answers from one that is related but broader, or unrelated.
ALTER TABLE meta.datasets ADD COLUMN description text;

UPDATE meta.datasets
SET description = 'בקשות שגופים (עמותות, רשויות מקומיות, אגודות, מוסדות תרבות) הגישו לתמיכה כספית ממינהל התרבות והספורט: תחום, מחוז, שנה, סטטוס וסכום מבוקש. המערכת מכירה רק גופים שהגישו בקשה, ולא את כלל הגופים בארץ.'
WHERE key = 'support-requests';
