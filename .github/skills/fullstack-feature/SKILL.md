---
name: fullstack-feature
description: 'Use when implementing or debugging a feature that spans the Angular web app, Express API, and/or @supports/shared. Covers architecture-preserving full-stack changes, Angular Signals, shared contracts, metadata-driven behavior, and validation.'
---

# פיתוח פיצ'ר Full Stack

## מטרה

לספק שינוי מלא מקצה לקצה בלי לעקוף את גבולות הארכיטקטורה של מערכת התמיכות.

## תהליך

1. קרא את `AGENTS.md`, את הסעיף המתאים ב־`README.md`, ואת הקבצים הסמוכים למימוש. חפש דפוס קיים לפני הוספת abstraction או שכבה.
2. עקוב אחר זרימת הנתונים בין ה־UI, `@supports/shared`, ה־API והמטא־דאטה. קבע אילו שכבות באמת צריכות להשתנות.
3. אם משתנה חוזה, עדכן תחילה את הטיפוסים/סכמות ב־`packages/shared`, ואז חבר את ה־API וה־web לאותו חוזה.
4. ב־API שמור על אחריות נפרדת ל־controller, service ו־repository; שמור בחירת מימושים ב־`container.ts`.
5. ב־web השתמש ב־standalone components וב־Signals: stores מנהלים מצב, `computed` גוזר ערכים, ו־`SupportsApi` מרכז קריאות HTTP.
6. עבור התנהגות עסקית דינמית, השתמש במטא־דאטה הקיימת. אל תקודד שדות, ערכי enum, כינויים או תוויות שאמורים להיות ניתנים לשינוי דרך המטא־דאטה.
7. שמור שגיאות ו־timeouts גלויים ומדויקים; אל תוסיף catch שממיר כשל לתוצאה שנראית תקינה. שמור נתונים סודיים מחוץ ללוגים.
8. הוסף או עדכן בדיקות ברמת החוזה והשכבה ששונתה. הרץ את הבדיקות הממוקדות, ובהתאם להיקף גם `npm test` ו־`npm run build`.
9. עדכן תיעוד הקשור ישירות לשינוי וסכם את הקבצים והאימות שבוצע.

## כללי תכנון

- העדף שימוש חוזר בחוזה וב־helper משותף על פני מימוש מקביל ב־web וב־API.
- שמור על API ציבורי וטיפוסים מצומצמים ומפורשים.
- אל תשנה התנהגות UX או מגבלות שירות, כגון זמן ההמתנה של AI, בלי דרישה מפורשת.
- אל תרחיב את היקף השינוי לתיקון בעיות לא קשורות.
