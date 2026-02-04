# תכנון אפליקציית חזון לגן קהילתי
# ComGarden Vision App — Design Document

**תאריך:** 2025-02-04
**סטטוס:** מאושר לפיתוח
**גרסה:** 1.0

---

## סקירה כללית | Overview

אפליקציית ווב מובייל-פירסט המאפשרת לחברי קהילה לתכנן ולשתף את החזון שלהם לגן הקהילתי החדש. המשתמשים מניחים "מדבקות" של אלמנטים שונים (עצים, ערוגות, ספסלים וכו') על תצלום אווירי של מיקום הגן, ומשתפים את התוצאה בוואטסאפ.

### User Journey

1. משתמש מקבל קישור בוואטסאפ → מקליק
2. האפליקציה נטענת מיידית (< 2 שניות ב-4G)
3. התצלום האווירי של הגן מוצג על המסך
4. פאנל תחתון מציג קטגוריות מדבקות
5. המשתמש מקליק על מדבקה → היא מופיעה על הקנבס → גורר/מסובב/משנה גודל
6. יכול לעבור בין הנחת מדבקות, ציור חופשי, והוספת טקסט
7. מקליק "שיתוף" → הקנבס מיוצא ל-JPEG → חלונית שיתוף נפתחת
8. שולח את התמונה לקבוצת הוואטסאפ

---

## ארכיטקטורה | Architecture

### Stack

- **Frontend:** Vanilla HTML/CSS/JS (ללא framework)
- **Canvas Library:** Fabric.js (מ-CDN)
- **Hosting:** GitHub Pages
- **Backend:** אין — אפליקציה סטטית לחלוטין

### מבנה קבצים | File Structure

```
comgarden/
├── index.html                  # מבנה HTML ראשי
├── css/
│   └── styles.css              # כל העיצוב, RTL layout
├── js/
│   ├── app.js                  # אתחול ראשי, חיווט אירועים
│   ├── canvas.js               # הגדרת Fabric.js canvas, zoom/pan
│   ├── stickers.js             # טעינת מדבקות, לוגיקת הנחה
│   ├── tools.js                # ציור, טקסט, undo
│   └── share.js                # ייצוא ושיתוף
├── assets/
│   ├── garden-photo.jpg        # תצלום אווירי (ממוטב)
│   └── stickers/               # 28 קבצי SVG
│       ├── trees-greenery/
│       ├── food-growing/
│       ├── structures-paths/
│       ├── water-nature/
│       └── furniture-amenities/
└── README.md
```

### Module Responsibilities

| קובץ | אחריות |
|------|--------|
| `app.js` | אתחול האפליקציה, חיווט אירועים בין מודולים |
| `canvas.js` | הגדרת canvas, zoom, pan, רקע התמונה |
| `stickers.js` | טעינת manifest, טעינה עצלה של SVGs, הנחה על הקנבס |
| `tools.js` | מצב ציור, מצב טקסט, מערכת undo |
| `share.js` | ייצוא ל-JPEG, אינטגרציית Web Share API |

---

## עיצוב ממשק | UI Design

### Layout (Mobile-First, RTL)

```
┌─────────────────────────────────┐
│  [↩️ בטל]         [שיתוף 📤]   │  ← Top bar (fixed)
├─────────────────────────────────┤
│                                 │
│                                 │
│      Aerial photo canvas        │  ← Main workspace
│      (pinch to zoom/pan)        │     Touch: drag objects
│                                 │     Two-finger: rotate
│                                 │
│                                 │
├─────────────────────────────────┤
│  🌿  🥕  🏗️  💧  🪑  │  ✏️  T  │  ← Category tabs + tools
├─────────────────────────────────┤
│ [○] [□] [△] [▭] [◇] [⬭] →→→   │  ← Sticker strip (scroll)
└─────────────────────────────────┘
```

### Interaction Modes

1. **Place mode** (ברירת מחדל) — הקש על מדבקה, הקש על קנבס להנחה, גרור/סובב/שנה גודל
2. **Draw mode** — ציור חופשי באצבע, בוחר צבע מופיע
3. **Text mode** — הקש על קנבס להנחת תיבת טקסט, מקלדת נפתחת

### Touch Gestures

| מחווה | פעולה |
|-------|-------|
| גרירה באצבע אחת | הזזת אובייקט נבחר |
| צביטה (pinch) | זום קנבס פנימה/החוצה |
| סיבוב בשתי אצבעות | סיבוב אובייקט נבחר |
| הקשה כפולה על אובייקט | פתיחת בקרות גודל/מחיקה |
| הקשה כפולה על ריק | איפוס זום |

### Bottom Panel Behavior

- מתכווץ לסרגל דק כשגוררים למטה (יותר מקום לקנבס)
- החלקה למעלה מחזירה את הפאנל המלא
- טאבים מציגים אימוג'י + תווית בעברית במסכים רחבים, אימוג'י בלבד במסכים צרים

---

## ספריית מדבקות | Sticker Library

### Categories & Items (28 total)

| קטגוריה | אייקון | פריטים |
|---------|--------|--------|
| עצים וצמחייה | 🌿 | עץ גדול, שתיל, שיח, ערוגת פרחים מלבנית, ערוגת פרחים עגולה, משטח דשא |
| גידולים | 🥕 | ערוגה מוגבהת, אדנית תבלינים, עץ פרי, חממה, פח קומפוסט |
| מבנים ושבילים | 🏗️ | פרגולה, גזיבו, שביל מרוצף, דק עץ, גדר, מחסן |
| מים וטבע | 💧 | מזרקה, בריכת שכשוך, אמבט ציפורים, מאכיל ציפורים, מדורה |
| ריהוט ואביזרים | 🪑 | ספסל, שולחן פיקניק, מטבח חוץ, פח אשפה, מנורת גן, מתקן משחק |

### Visual Style

- **צורות גיאומטריות פשוטות** — מראה "דיאגרמת תכנון"
- **מבט-על** (top-down) — תואם לתצלום האווירי
- **צבעים ברורים** — עץ = עיגול ירוק, ערוגה = מלבן חום וכו'

### Manifest Format

```json
{
  "stickers": [
    {
      "id": "large-tree",
      "file": "trees-greenery/large-tree.svg",
      "label": "עץ גדול",
      "category": "trees-greenery",
      "defaultScale": 1.0
    }
  ],
  "categories": [
    { "id": "trees-greenery", "label": "עצים וצמחייה", "icon": "🌿" }
  ]
}
```

---

## הנחיות אינטראקציה | Interaction Hints

### First-Time Onboarding (Overlay)

```
┌───────────────────────┐
│  👋 ברוכים הבאים!      │
│                       │
│  1. בחרו מדבקה מלמטה  │
│     ↓ (חץ לפאנל)      │
│                       │
│  2. גררו אותה לתמונה  │
│     (אנימציית גרירה)  │
│                       │
│  3. צבטו לזום, סובבו  │
│     בשתי אצבעות       │
│                       │
│    [ יאללה, מתחילים! ]│
└───────────────────────┘
```

### Persistent Help

- כפתור `?` קטן בפינה — מציג מחדש את ה-onboarding

### Contextual Hints (מופיעים פעם אחת)

| טריגר | הודעה |
|-------|-------|
| מדבקה ראשונה הונחה | "גררו לשנות מיקום • צבטו לשנות גודל" |
| זום רחוק | "הקישו פעמיים לחזור לתצוגה מלאה" |
| מצב ציור הופעל | אנימציית פולס על הקנבס |
| מצב טקסט הופעל | סמן מהבהב עם "הקלידו כאן..." |

### Visual Affordances

- אובייקטים נבחרים מציגים ידיות בפינות (resize) + קשת סיבוב למעלה
- מדבקות בפאנל עם צל "הרמה" עדין
- מצב פעיל (ציור/טקסט) מודגש עם קו תחתון צבעוני
- כפתור שיתוף פועם בעדינות אחרי 30 שניות חוסר פעילות

### Tooltips

לחיצה ארוכה על כל כפתור מציגה tooltip בעברית

### Empty State

אם אין אובייקטים אחרי 10 שניות — יד מונפשת מדגימה מחוות גרירה

---

## זרימת נתונים | Data Flow

### Application State

```javascript
appState = {
  canvas: Fabric.js canvas instance,
  currentMode: 'place' | 'draw' | 'text',
  selectedCategory: 'trees-greenery',
  history: [/* מערך snapshots לundo */],
  hintsShown: { onboarding: false, firstPlace: false, ... }
}
```

### Sticker Loading Flow

1. באתחול → טעינת `stickers/manifest.json`
2. Manifest מכיל: שם קובץ, קטגוריה, תווית בעברית, גודל ברירת מחדל
3. SVGs נטענים lazily — רק כשטאב קטגוריה נבחר
4. SVGs שנטענו נשמרים בזיכרון לשימוש חוזר

### Undo System

- כל פעולה שומרת snapshot של הקנבס למערך history
- מקסימום 20 צעדי undo (מניעת bloat בזיכרון)
- Undo שולף את ה-state האחרון ומשחזר

### Local Persistence

```javascript
// שמירה בכל שינוי (debounced 500ms)
canvas.on('object:modified', () => {
  localStorage.setItem('comgarden-canvas-state', JSON.stringify(canvas.toJSON()));
});

// שחזור בטעינה
const saved = localStorage.getItem('comgarden-canvas-state');
if (saved) {
  canvas.loadFromJSON(JSON.parse(saved), canvas.renderAll.bind(canvas));
}
```

### Export & Share Flow

1. משתמש מקליק "שיתוף"
2. הקנבס מיוצא ל-JPEG blob (עם תמונת הרקע)
3. אם `navigator.share` זמין → חלונית שיתוף מקורית נפתחת
4. אם לא → הורדה ישירה עם שם קובץ `גן-קהילתי-החזון-שלי.jpg`

---

## טיפול בשגיאות | Error Handling

### Network Failures

| מצב | טיפול |
|-----|-------|
| טעינה ראשונית נכשלה | מסך שגיאה: "לא הצלחנו לטעון את האפליקציה. בדקו את החיבור לאינטרנט ורעננו את הדף" |
| SVG מדבקה נכשל | אייקון placeholder עם tooltip |

### Browser Compatibility

- **יעד:** Chrome/Safari mobile (95%+ מהמשתמשים בישראל)
- `navigator.share` לא זמין → fallback להורדה ישירה
- Touch events לא זמינים → mouse events כ-fallback

### Canvas Edge Cases

| מצב | טיפול |
|-----|-------|
| תמונת הגן נכשלה | מלבן placeholder צבעוני עם הודעה |
| localStorage פגום | catch שגיאת parse, ניקוי storage, התחלה מחדש עם toast |
| 50+ אובייקטים | toast עדין: "טיפ: פחות זה יותר! 😊" |

### Touch Gesture Conflicts

| מצב | טיפול |
|-----|-------|
| גרירה ליד קצה המסך | הקנבס זז אוטומטית לאפשר הנחה |
| pinch כשאובייקט נבחר | זום קנבס, לא resize אובייקט |
| נגיעה בטעות בגלילת פאנל | 100ms delay לפני זיהוי כ"כוונת הנחה" |

### Storage Quota

- שגיאת quota → toast: "לא ניתן לשמור. נסו לפנות מקום במכשיר"
- האפליקציה ממשיכה לעבוד, בלי auto-save

### Share Failures

- משתמש דחה share → לא עושים כלום
- Share API זרק שגיאה → fallback להורדה
- ייצוא JPEG נכשל → הקטנת רזולוציה וניסיון חוזר

### Accidental Data Loss

- כפתור back / swipe לסגירה → אם יש אובייקטים: "יש לכם עבודה שלא שותפה. לצאת בכל זאת?"
- דורש `beforeunload` event listener

### Reset Option

- כפתור "התחל מחדש" בתפריט העזרה
- אישור: "למחוק את כל העבודה ולהתחיל מחדש?"
- מנקה localStorage וטוען קנבס ריק

---

## שלבי בנייה | Build Phases

| שלב | תוצר | ניתן לבדוק |
|-----|------|------------|
| **1. Canvas foundation** | תמונה נטענת, pinch-zoom, pan | ניווט בסיסי חלק |
| **2. Sticker system** | 5 מדבקות לדוגמה, גרירה להנחה, הזזה/סיבוב/שינוי גודל | לופ אינטראקציה מרכזי |
| **3. Full sticker library** | כל 28 המדבקות ב-5 קטגוריות | טאבים, מגוון מדבקות |
| **4. Drawing & text** | ציור חופשי, הנחת טקסט, בוחר צבע | כלי ביטוי יצירתי |
| **5. Undo & persistence** | כפתור undo, שמירה/שחזור localStorage | לא מאבדים עבודה |
| **6. Export & share** | ייצוא JPEG, חלונית שיתוף מקורית | הפיצ'ר העיקרי — שיתוף עובד |
| **7. Onboarding & hints** | overlay ראשוני, טיפים הקשריים | סבתא יכולה להבין |
| **8. Polish** | טיפול בשגיאות, edge cases, ביצועים | מוכן לשימוש קהילתי |

### Timeline Estimate

- **שלבים 1-2:** יום 1 — לופ מרכזי עובד
- **שלבים 3-6:** ימים 2-4 — feature complete
- **שלבים 7-8:** יום 5 — מוכן לקהילה

---

## Deployment

### GitHub Pages

- **URL:** `https://zivba.github.io/comgarden/`
- **Deploy:** Push to `main` → auto-deploys in ~60 seconds

### Future Migration Path

אם יידרש בעתיד (custom domain, server-side logic, איחוד תחת GCP של העמותה):
- Dockerfile פשוט לשרת static files
- Deploy ל-Cloud Run בפרויקט `comgarden`

---

## Open Questions / Future Enhancements

1. **Segment zoom** — הצגת אחד משלושת הסגמנטים בנפרד (תלוי קושי)
2. **Gallery mode** — גלריה משותפת לצפייה והצבעה על חזונות
3. **Offline mode** — Service worker לעבודה ללא חיבור
4. **Sticker requests** — דרך לקהילה לבקש מדבקות נוספות

---

**מסמך זה מאושר לפיתוח.** 🌱
