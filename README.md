# AMIR REMIXES

סטודיו מוזיקה אישי: שירים מתיאור, שירים מהמילים שלך (גם בהשראת קטע שמעלים), רימיקס לשיר שמעלים, קטעים אינסטרומנטליים, כתיבת מילים, הארכת שירים והפרדת ערוצים. היצירה עצמה נעשית דרך ה-API הרשמי של Mureka, עם המפתח והקרדיטים שלך.

Next.js · Supabase (כניסה, דאטה-בייס, קבצים) · Vercel (אירוח)

## הקמה, פעם אחת (בערך 15 דקות)

### 1. Supabase: דאטה-בייס וכניסה
1. נכנסים ל-https://supabase.com, ‏Start your project, ונכנסים עם GitHub.
2. ‏**New project**. שם: `amir-remixes`. בוחרים סיסמה לדאטה-בייס ושומרים אותה. אזור: Frankfurt, הכי קרוב לישראל.
3. כשהפרויקט מוכן, הולכים ל-**SQL Editor**, מדביקים את כל התוכן של `supabase/migrations/0001_init.sql`, ולוחצים **Run**. אם הרצת את הקובץ הזה לפני שנוסף הרימיקס, תריץ גם את `supabase/migrations/0002_remix.sql`.
4. ב-**Project Settings → API** (או בכפתור **Connect**) מעתיקים שני ערכים:
   - Project URL
   - Publishable key (בפרויקטים ישנים: anon public key)

### 2. Mureka: מפתח API
נכנסים ל-https://platform.mureka.ai, ‏**API Keys**, ויוצרים מפתח. היצירה נעשית על חשבון הקרדיטים של החשבון הזה.

### 3. Vercel: העלאה לאוויר
1. נכנסים ל-https://vercel.com ונכנסים עם GitHub.
2. ‏**Add New → Project**, בוחרים את הריפו `amir-remixes` ולוחצים **Import**.
3. לפני **Deploy**, פותחים את **Environment Variables** ומוסיפים:

   | שם | ערך |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | ה-Project URL מ-Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ה-Publishable key מ-Supabase |
   | `MUREKA_API_KEY` | המפתח מ-Mureka |
   | `ALLOWED_EMAILS` | המייל שלך (משמש כחשבון הבעלים של השירים) |
   | `APP_PASSWORD` | הסיסמה לכניסה לאפליקציה. בוחרים לבד |
   | `SUPABASE_SECRET_KEY` | ב-Supabase: ‏Project Settings → API Keys → Secret keys |

4. לוחצים **Deploy**. בסוף מקבלים כתובת, למשל `https://amir-remixes.vercel.app`.

### 4. להיכנס
פותחים את הכתובת ומקלידים את הסיסמה מ-`APP_PASSWORD`. בלי מיילים ובלי קישורים. החלפת הסיסמה ב-Vercel (ואז Redeploy) מנתקת את כל המכשירים.

## איך זה בנוי

| קובץ | מה הוא עושה |
| --- | --- |
| `lib/mureka.ts` | הלקוח של Mureka. המפתח לא יוצא מהשרת |
| `app/api/*` | נקודות הקצה: יצירה, מעקב, מילים, ערוצים, יתרה. כל אחת בודקת שהמשתמש מחובר ונמצא ברשימה |
| `proxy.ts` | שולח מבקרים בלי סיסמה ל-`/login` |
| `components/Studio.tsx` | מסך הסטודיו |
| `supabase/migrations/` | הטבלה `tracks`, ההרשאות, והתיקייה הפרטית `tracks` לקבצי האודיו |

קבצים שמעלים לרימיקס או להשראה עולים ישר מהדפדפן לתיקייה הפרטית שלך ב-Supabase, ו-Mureka מקבלת קישור זמני אליהם. כך גם קבצים של 10MB עוברים, למרות המגבלה של Vercel על גודל בקשה.

כששיר מוכן, השרת מעתיק את קבצי ה-MP3 לתיקייה הפרטית ב-Supabase, כדי שהספרייה תמשיך לעבוד גם אחרי שהקישורים של Mureka פגים.

## פיתוח מקומי

```bash
cp .env.example .env.local   # למלא את הערכים
npm install
npm run dev                  # http://localhost:3000
npm test
```

