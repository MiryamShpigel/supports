# תוכנית עבודה – POC מערכת תמיכות רוחבית

## הבנת המטלה
כלי חיפוש ודוחות לעובד מינהל התרבות והספורט: בונה שאילתה (פילטרים + פילוחים) או כותב שאלה חופשית, רואה ניסוח קריא של השאלה, מקבל טבלה + גרף, ושומר שאילתות.
עיקר הציון: ארכיטקטורה – Metadata Driven, מודולריות, החלפת ספקי AI, הרחבה למשרדים/תחומים/מקורות מידע.

## סטאק (סופי)
| שכבה | בחירה |
|---|---|
| Monorepo | npm workspaces: `apps/api`, `apps/web`, `packages/shared` |
| חוזים משותפים | `@supports/shared` – טיפוסים, סכמות zod, ולידציה מול מטא-דאטה, ניסוח שאלה |
| שרת | Node.js + Express 5 + TypeScript, pg, zod, pino |
| DB | PostgreSQL 16 (Docker) – סכמות `app` / `meta` / `data`, JSONB לשדות דינמיים |
| קליינט | Angular 20 (standalone, signals), Angular Material, ng2-charts |
| AI | Claude (`claude-opus-5-5`) דרך ממשק `LlmProvider`; fallback ל-Rule-based |
| בדיקות | vitest |

## סטטוס
- [x] מבנה monorepo + חבילת shared (+ בדיקות)
- [x] API: מודולים metadata / queries / saved-queries / nl-query / audit, שכבות controller→service→repository
- [x] מיגרציות SQL + מטא-דאטה + seed (3,000 בקשות, 2 שאילתות לדוגמה)
- [x] דוגמת הוספת שדה במטא-דאטה בלבד (`apps/api/src/db/examples/add-social-cluster-field.sql`)
- [x] קליינט Angular: שאלה חופשית, בונה שאילתה דינמי, תוצאות (טבלה+גרף), שאילתות שמורות
- [ ] אימות מקצה לקצה מול DB אמיתי
- [ ] README בעברית + תשובות לשאלות + DevOps + תרשימים (Mermaid)
- [ ] Dockerfiles + docker-compose מלא + CI לדוגמה

## הערות
- בסעיף UML מופיע פעמיים "תרשים מחלקות"; השני ("תרחיש מקצה לקצה") הוא Sequence Diagram.
- הזדהות מדומה (headers עם ברירת מחדל) – בייצור OIDC.
