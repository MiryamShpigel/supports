import { loadEnv } from '../config/env.js';
import { createDb } from '../lib/db.js';
import { createLogger } from '../lib/logger.js';

/**
 * Generates deterministic demo data (same data on every run) for the culture-sport tenant.
 * Re-running replaces the previous demo data.
 */
const TENANT = 'culture-sport';
const REQUEST_COUNT = 3000;
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

type OrgType = 'association' | 'municipality' | 'sports_club' | 'culture_institution';
interface Organization { name: string; type: OrgType; district: string }

const ORGANIZATIONS: Organization[] = [
  ...[
    ['north', ['עיריית נצרת', 'עיריית צפת', 'עיריית כרמיאל', 'עיריית טבריה', 'מועצה אזורית גליל עליון']],
    ['haifa', ['עיריית חיפה', 'עיריית חדרה', 'עיריית זכרון יעקב']],
    ['center', ['עיריית ראשון לציון', 'עיריית פתח תקווה', 'עיריית רחובות', 'עיריית נתניה']],
    ['tel_aviv', ['עיריית תל אביב-יפו', 'עיריית רמת גן', 'עיריית חולון']],
    ['jerusalem', ['עיריית ירושלים', 'עיריית בית שמש', 'מועצה מקומית מבשרת ציון']],
    ['south', ['עיריית באר שבע', 'עיריית אשדוד', 'עיריית אילת', 'עיריית דימונה']],
    ['judea_samaria', ['עיריית אריאל', 'עיריית מעלה אדומים', 'מועצה אזורית גוש עציון']],
  ].flatMap(([district, names]) =>
    (names as string[]).map((name) => ({ name, type: 'municipality' as const, district: district as string })),
  ),
  ...orgs('association', [
    ['north', 'עמותת צלילים בגליל'], ['north', 'עמותת תיאטרון הצפון'], ['haifa', 'עמותת מחול כרמל'],
    ['center', 'עמותת קולות השרון'], ['tel_aviv', 'עמותת אמנות ברחוב'], ['tel_aviv', 'עמותת סיפור עירוני'],
    ['jerusalem', 'עמותת מוזיקה בהר'], ['south', 'עמותת תרבות בנגב'], ['south', 'עמותת ספורט לכל בדרום'],
    ['judea_samaria', 'עמותת יוצרים בשומרון'], ['center', 'עמותת קריאה לכולם'],
  ]),
  ...orgs('sports_club', [
    ['north', 'אגודת הפועל קריית שמונה'], ['haifa', 'אגודת מכבי חיפה כדורסל'], ['center', 'אגודת אליצור נתניה'],
    ['tel_aviv', 'אגודת הפועל תל אביב אתלטיקה'], ['jerusalem', 'אגודת בית"ר ירושלים שחייה'],
    ['south', 'אגודת הפועל באר שבע ג\'ודו'], ['judea_samaria', 'אגודת מכבי אריאל'],
  ]),
  ...orgs('culture_institution', [
    ['jerusalem', 'מוזיאון ירושלים לאמנות'], ['tel_aviv', 'מוזיאון העיר תל אביב'], ['haifa', 'מוזיאון המדע חיפה'],
    ['north', 'הספרייה האזורית גליל'], ['south', 'הספרייה העירונית באר שבע'], ['center', 'היכל התרבות רחובות'],
    ['tel_aviv', 'תיאטרון הבימה העירוני'], ['jerusalem', 'הספרייה הציבורית ירושלים'],
  ]),
];

const DOMAINS_BY_TYPE: Record<OrgType, string[]> = {
  municipality: ['culture', 'sport', 'libraries', 'culture_events', 'culture_events', 'sport'],
  association: ['culture', 'culture', 'culture_events', 'sport'],
  sports_club: ['sport'],
  culture_institution: ['museums', 'libraries', 'culture', 'culture_events'],
};

const AMOUNT_RANGE: Record<OrgType, [number, number]> = {
  municipality: [150_000, 2_500_000],
  association: [20_000, 400_000],
  sports_club: [30_000, 800_000],
  culture_institution: [100_000, 3_000_000],
};

function orgs(type: OrgType, list: [string, string][]): Organization[] {
  return list.map(([district, name]) => ({ name, type, district }));
}

/** Small seeded PRNG so the demo data is identical on every machine. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(2025);
const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)]!;

/** Older years are decided; recent years still have open requests. */
function statusFor(year: number): string {
  const r = random();
  if (year <= 2023) return r < 0.72 ? 'approved' : 'rejected';
  if (year === 2024) return r < 0.6 ? 'approved' : r < 0.85 ? 'rejected' : 'in_review';
  return r < 0.3 ? 'approved' : r < 0.45 ? 'rejected' : r < 0.75 ? 'in_review' : 'submitted';
}

function buildRequests() {
  const columns = {
    organization_name: [] as string[], org_type: [] as string[], domain: [] as string[],
    district: [] as string[], year: [] as number[], status: [] as string[],
    requested_amount: [] as number[], submitted_at: [] as string[],
  };
  for (let i = 0; i < REQUEST_COUNT; i++) {
    const org = pick(ORGANIZATIONS);
    const year = pick(YEARS);
    const [min, max] = AMOUNT_RANGE[org.type];
    columns.organization_name.push(org.name);
    columns.org_type.push(org.type);
    columns.domain.push(pick(DOMAINS_BY_TYPE[org.type]));
    columns.district.push(org.district);
    columns.year.push(year);
    columns.status.push(statusFor(year));
    columns.requested_amount.push(Math.round((min + random() * (max - min)) / 1000) * 1000);
    columns.submitted_at.push(new Date(Date.UTC(year - 1, 9 + Math.floor(random() * 3), 1 + Math.floor(random() * 28))).toISOString());
  }
  return columns;
}

const env = loadEnv();
const log = createLogger(env);
const db = createDb(env);

try {
  const c = buildRequests();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM data.support_requests WHERE tenant_id = $1', [TENANT]);
    await client.query(
      `INSERT INTO data.support_requests
         (tenant_id, organization_name, org_type, domain, district, year, status, requested_amount, submitted_at)
       SELECT $1, * FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::text[], $8::numeric[], $9::timestamptz[])`,
      [TENANT, c.organization_name, c.org_type, c.domain, c.district, c.year, c.status, c.requested_amount, c.submitted_at],
    );

    await client.query(`DELETE FROM app.saved_queries WHERE tenant_id = $1 AND created_by = 'demo.user'`, [TENANT]);
    await client.query(
      `INSERT INTO app.saved_queries (tenant_id, name, description, definition, created_by) VALUES
        ($1, 'תרבות בצפון 2023–2025', 'הדוגמה ממסמך הדרישות', $2, 'demo.user'),
        ($1, 'ספורט לפי מחוז', 'בקשות ספורט שאושרו, כולל סכום', $3, 'demo.user')`,
      [
        TENANT,
        {
          dataset: 'support-requests',
          filters: [
            { field: 'status', operator: 'in', values: ['approved'] },
            { field: 'domain', operator: 'in', values: ['culture'] },
            { field: 'district', operator: 'in', values: ['north'] },
            { field: 'year', operator: 'between', values: [2023, 2025] },
          ],
          groupBy: ['year'],
          metrics: ['count'],
        },
        {
          dataset: 'support-requests',
          filters: [
            { field: 'status', operator: 'in', values: ['approved'] },
            { field: 'domain', operator: 'in', values: ['sport'] },
          ],
          groupBy: ['district'],
          metrics: ['count', 'total_amount'],
        },
      ],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  log.info({ requests: REQUEST_COUNT, organizations: ORGANIZATIONS.length }, 'Seed completed');
} catch (err) {
  log.error({ err }, 'Seed failed');
  process.exitCode = 1;
} finally {
  await db.end();
}
