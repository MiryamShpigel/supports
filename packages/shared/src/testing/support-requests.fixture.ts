import type { DatasetMetadata } from '../metadata.js';

/** Trimmed copy of the seeded metadata, used by unit tests in shared and api. */
export const supportRequestsFixture: DatasetMetadata = {
  key: 'support-requests',
  label: 'בקשות תמיכה',
  questionPrefix: 'הצג את כלל בקשות התמיכה',
  metrics: [
    { key: 'count', label: 'מספר בקשות', aggregate: 'count' },
    { key: 'total_amount', label: 'סכום מבוקש', aggregate: 'sum' },
  ],
  fields: [
    {
      key: 'status', label: 'סטטוס', dataType: 'enum', operators: ['in'],
      filterable: true, groupable: true, listable: true, sortOrder: 10,
      phraseTemplate: '{values}',
      options: [
        { value: 'submitted', label: 'הוגשה', phrase: 'שהוגשו' },
        { value: 'approved', label: 'אושרה', phrase: 'שאושרו', synonyms: ['אושרו', 'מאושרות'] },
        { value: 'rejected', label: 'נדחתה', phrase: 'שנדחו' },
      ],
    },
    {
      key: 'org_type', label: 'סוג גוף', dataType: 'enum', operators: ['in'],
      filterable: true, groupable: true, listable: true, sortOrder: 20,
      phraseTemplate: 'ל{values}',
      options: [
        { value: 'association', label: 'עמותה', phrase: 'עמותות', synonyms: ['עמותות'] },
        { value: 'municipality', label: 'רשות מקומית', phrase: 'רשויות מקומיות', synonyms: ['רשויות מקומיות'] },
      ],
    },
    {
      key: 'domain', label: 'תחום תמיכה', dataType: 'enum', operators: ['in'],
      filterable: true, groupable: true, listable: true, sortOrder: 30,
      phraseTemplate: 'בתחום {values}',
      options: [
        { value: 'culture', label: 'תרבות', phrase: 'התרבות' },
        { value: 'sport', label: 'ספורט', phrase: 'הספורט' },
      ],
    },
    {
      key: 'district', label: 'מחוז', dataType: 'enum', operators: ['in'],
      filterable: true, groupable: true, listable: true, sortOrder: 40,
      phraseTemplate: 'במחוז {values}',
      options: [
        { value: 'north', label: 'צפון' },
        { value: 'south', label: 'דרום' },
      ],
    },
    {
      key: 'year', label: 'שנה', dataType: 'year', operators: ['in', 'between'],
      filterable: true, groupable: true, listable: true, sortOrder: 50,
      phraseTemplate: 'בשנת {values}', rangeTemplate: 'בשנים {from}–{to}',
    },
    {
      key: 'organization_name', label: 'שם הגוף', dataType: 'text', operators: [],
      filterable: false, groupable: false, listable: true, sortOrder: 1,
    },
  ],
};
