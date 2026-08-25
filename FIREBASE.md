# تحويل Samaa Dev من Supabase إلى Firebase

هذا الملف هو عقد العمل بينك وبين Cursor.

- **أنت (يدوياً):** إنشاء مشروع Firebase من Console، تفعيل الخدمات، ونسخ مفاتيح الربط إلى `.env`.
- **Cursor:** كتابة كل الكود: المصادقة، Firestore، قواعد الأمان، واستبدال كل تعامل التطبيق مع Supabase.

لا يبدأ Cursor تنفيذ التحويل في الكود حتى تقول صراحة:

> نفّذ التحويل إلى Firebase

قبل ذلك يكتفي باتباع هذا الملف عند أي سؤال أو تخطيط.

---

## 1) ما الذي يتغيّر؟

التطبيق حالياً نظام إدارة داخلي (عملاء، مشاريع، مهام، سبرنتات، مالية، فريق) مبني على:

| الحالي (Lovable + Supabase) | الهدف (يدوي + Firebase) |
| --- | --- |
| `@supabase/supabase-js` | `firebase` (Auth + Firestore في المتصفح) |
| `@lovable.dev/cloud-auth-js` + Google OAuth | Firebase Authentication — Google |
| جداول Postgres + RLS | مجموعات Firestore + Security Rules |
| `supabaseAdmin` (service role) | `firebase-admin` على السيرفر فقط |
| متغيرات `VITE_SUPABASE_*` | متغيرات `VITE_FIREBASE_*` |

واجهة الصفحات ومنطق الأعمال يبقى كما هو. يتغيّر فقط مصدر البيانات والمصادقة.

---

## 2) خطواتك اليدوية في Firebase Console

نفّذ هذا الترتيب قبل أن تطلب من Cursor كتابة الكود.

### أ. إنشاء المشروع

1. افتح [Firebase Console](https://console.firebase.google.com/).
2. **Add project** → اسم مقترح: `samaa-dev-system`.
3. عطّل Google Analytics إن لم تحتاجه.
4. بعد الإنشاء افتح المشروع.

### ب. تطبيق الويب

1. أيقونة **Web** (`</>`).
2. اسم التطبيق: `samaa-dev-web`.
3. لا تفعّل Firebase Hosting الآن إلا إذا أردت الاستضافة لاحقاً.
4. انسخ قيم الإعداد (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

### ج. Authentication

1. **Build → Authentication → Get started**.
2. **Sign-in method → Google → Enable**.
3. أدخل البريد الداعم للمشروع.
4. **Authentication → Settings → Authorized domains**: أضف
   - `localhost`
   - نطاق Lovable الحالي إن بقي مستخدماً
   - أي نطاق إنتاج لاحق
   - **للتجربة من الجوال على نفس الشبكة:** أضف عنوان IP المحلي بدون منفذ، مثال: `192.168.100.6`
     (خطأ `auth/unauthorized-domain` يعني أن النطاق/الـ IP غير مُدرَج هنا)
5. سجّل أول مستخدم تجريبي بعد التحويل (حساب Google لفريق الوكالة).

> **ملاحظة LAN:** `localhost` مصرّح به افتراضياً. فتح التطبيق عبر `http://192.168.x.x:8080` يتطلب إضافة ذلك الـ IP في Authorized domains. إن استمر الخطأ بعد الإضافة، افتح [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client (Web) المرتبط بمشروع Firebase، وأضف تحت **Authorized JavaScript origins**:
> `http://192.168.100.6:8080` (استبدل بالـ IP الفعلي والمنفذ).

### د. Firestore

1. **Build → Firestore Database → Create database**.
2. ابدأ في **production mode** (Cursor سيكتب قواعد الأمان في الملفات).
3. اختر أقرب موقع مناسب (مثلاً `eur3` لأوروبا).
4. **قائمة الإيميلات المسموحة (إلزامي قبل أي دخول):**
   - أنشئ مجموعة `allowed_emails`
   - لكل عضو: مستند جديد، **معرّف المستند = الإيميل بحروف صغيرة** (مثال: `you@company.com`)
   - يمكنك ترك الحقول فارغة أو وضع `{ "active": true }`
   - أضف إيميلك أولاً قبل تسجيل الدخول
5. باقي المجموعات تُنشأ من الكود عند أول كتابة.

### هـ. مفاتيح السيرفر (اختياري لكن مطلوب لعمليات الإدارة)

إذا احتجت دوال سيرفر (إنشاء مستخدم، ترقية أدوار، مهام خلفية):

1. أيقونة الترس → **Project settings → Service accounts**.
2. **Generate new private key**.
3. احفظ ملف JSON خارج المستودع. لا ترفعه إلى Git.
4. انسخ `client_email` و `private_key` إلى `.env` كمتغيرات سيرفر فقط.

### و. ضع القيم في `.env`

انسخ من `.env.example` ثم املأ القيم الحقيقية. لا تشارك ملف `.env` ولا مفاتيح الخدمة.

بعد حفظ `.env` أعد تشغيل `npm run dev`.

### ز. نشر قواعد Firestore (مهم)

بعد أن يكتب Cursor ملفات `firestore.rules` و `firestore.indexes.json`، انشرها من Firebase Console:

1. **Firestore → Rules** → الصق محتوى `firestore.rules` → Publish.
2. **Firestore → Indexes** → أنشئ الفهارس المركبة من `firestore.indexes.json` (أو اقبل روابط إنشاء الفهرس عند أول استعلام).

بدون نشر القواعد، وضع الإنتاج يرفض كل القراءة/الكتابة.

**تذكير:** أي شخص يختار حساب Google خارج `allowed_emails` يُرفض ويُسجَّل خروجه فوراً. لإضافة عضو جديد: أنشئ مستنداً في `allowed_emails` بمعرّف = إيميله بحروف صغيرة.

---

## 3) متغيرات البيئة

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# سيرفر فقط — لا تستخدم بادئة VITE_
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

`VITE_*` تظهر في المتصفح (هذا طبيعي لمفاتيح Firebase للعميل). مفاتيح Admin تبقى على السيرفر فقط.

---

## 4) مخطط Firestore (بديل الجداول)

كل مستند يستخدم `id` نفسه كمعرّف المستند. الحقول تطابق أسماء الأعمدة الحالية حتى لا تنكسر الواجهة.

```
profiles/{uid}
  full_name, job_title, avatar_url, created_at, updated_at

user_roles/{uid}
  roles: ["admin" | "manager" | "developer"]
  created_at

clients/{id}
  name, company, created_by, created_at, updated_at
  contacts/{id}          # أو حقل contacts داخل المستند إن كان 1-إلى-1
    email, phone, notes, satisfaction, created_at, updated_at

projects/{id}
  name, client_id, scope_of_work, budget, start_date, deadline,
  status, priority, created_by, created_at, updated_at

milestones/{id}
  project_id, title, amount, due_date, is_completed, completed_at, created_at, updated_at

project_resources/{id}
  project_id, kind, label, url, created_at

sprints/{id}
  project_id, name, goal, start_date, end_date, status, created_at, updated_at

tasks/{id}
  project_id, sprint_id, title, description, status, priority, position,
  assignee_id, estimated_hours, actual_hours, due_date, created_by,
  completed_at, created_at, updated_at

transactions/{id}
  kind, amount, category, description, occurred_on, due_date, is_paid,
  client_id, project_id, created_by, created_at, updated_at
```

أدوار التطبيق تبقى: `admin` | `manager` | `developer`.

- `isStaff` = admin أو manager
- `isAdmin` = admin فقط

جهات اتصال العميل حالياً جدول `client_contacts` بعلاقة 1-إلى-1. في Firestore تُحفظ كحقل داخل `clients/{id}` أو مجموعة فرعية `clients/{id}/contacts`. Cursor يختار الشكل الأبسط مع الإبقاء على نفس شكل البيانات الذي تقرأه الصفحات.

---

## 5) قواعد الأمان (ما يجب أن يكتبه Cursor)

الملف: `firestore.rules`

السياسة الحالية في Supabase (تقريباً):

- أي مستخدم مسجّل في الفريق يقرأ البيانات التشغيلية.
- `client_contacts` (بيانات حساسة) للموظفين فقط: admin / manager.
- الكتابة حسب الدور (المدير والمسؤول أوسع صلاحية من المطوّر).
- لا وصول عام بدون تسجيل دخول.

Cursor يترجم هذا إلى قواعد Firestore باستخدام `user_roles/{request.auth.uid}`. أول حساب Admin يُنشأ يدوياً من Console (أو سكربت لمرة واحدة) حتى لا تُقفل القاعدة على الجميع.

فهارس مطلوبة (يكتبها Cursor في `firestore.indexes.json`):

- `tasks`: `project_id` + `position`
- `tasks`: `sprint_id` + `position`
- `milestones`: `project_id` + `due_date`
- `sprints`: `project_id` + `start_date`
- `project_resources`: `project_id` + `created_at`

---

## 6) ما ينفّذه Cursor عند أمر التحويل

بالترتيب، دون كسر الواجهة:

1. تثبيت `firebase` و `firebase-admin`. إزالة `@supabase/supabase-js` بعد انتهاء الاستبدال.
2. إنشاء `src/integrations/firebase/client.ts` (تطبيق الويب + Auth + Firestore).
3. إنشاء `src/integrations/firebase/client.server.ts` (Admin SDK، استيراد من السيرفر فقط).
4. إنشاء أنواع `src/integrations/firebase/types.ts` بدل جداول Supabase.
5. استبدال طبقة البيانات في `src/lib/data.ts` لتستخدم Firestore مع الإبقاء على نفس `queryOptions` ونفس أسماء الحقول.
6. استبدال `src/hooks/use-auth.ts` بـ Firebase Auth (`onAuthStateChanged` / `getIdToken`).
7. صفحة `/auth`: Google عبر `signInWithPopup` أو `signInWithRedirect` بدل `lovable.auth`.
8. حماية `/_authenticated`: التحقق من `auth.currentUser` بدل `supabase.auth.getUser()`.
9. تحديث كل المسارات التي تستورد `supabase` (مهام، مشاريع، عملاء، مالية، فريق، سبرنتات).
10. وسطاء TanStack Start: إرفاق توكن Firebase بدل `attachSupabaseAuth`.
11. تسجيل الخروج في `AppShell`.
12. ملفات `firestore.rules` و `firestore.indexes.json` و `firebase.json`.
13. عدم حذف تكامل Lovable للتقارير إلا إذا طُلب ذلك صراحة. المصادقة فقط تنتقل إلى Firebase.

قيود على Cursor:

- لا يضع مفاتيح Admin في كود العميل.
- لا يعيد كتابة تاريخ Git ولا يعمل force push (المشروع مربوط بـ Lovable).
- لا يخترع أعمدة جديدة؛ يحافظ على أسماء الحقول الحالية.
- لا يبدأ التنفيذ قبل أمر «نفّذ التحويل إلى Firebase».
- إذا كانت قيم `.env` ناقصة، يتوقف ويطلب منك إكمال الربط اليدوي.

---

## 7) الملفات التي ستتأثر

```
src/integrations/firebase/          ← جديد
src/integrations/supabase/          ← يُستبدل ثم يُحذف بعد الاستقرار
src/lib/data.ts
src/hooks/use-auth.ts
src/start.ts
src/routes/auth.tsx
src/routes/__root.tsx
src/routes/_authenticated/**
src/components/layout/AppShell.tsx
src/integrations/lovable/index.ts   ← فصل المصادقة عن Supabase
package.json
.env / .env.example
firestore.rules
firestore.indexes.json
firebase.json
```

---

## 8) التحقق بعد التنفيذ

Cursor يتحقق عبر المتصفح إن أمكن، وإلا عبر أقرب بديل:

1. تشغيل `npm run dev` بدون أخطاء بيئة Firebase.
2. `/auth` → تسجيل دخول Google → التحويل إلى `/dashboard`.
3. المستخدم غير المسجّل يُعاد إلى `/auth` من الصفحات المحمية.
4. العملاء، المشاريع، المهام، السبرنتات، المالية، الفريق: قراءة وإضافة كما السابق.
5. تسجيل الخروج يعيد إلى صفحة الدخول.
6. إعادة تحميل الصفحة تُبقي الجلسة.

---

## 9) قائمة يدوية سريعة

- [ ] مشروع Firebase جاهز
- [ ] تطبيق ويب مضاف والقيم منسوخة
- [ ] Google Sign-in مفعّل
- [ ] `localhost` ضمن Authorized domains
- [ ] (للتجربة من الجوال) IP الشبكة مثل `192.168.100.6` ضمن Authorized domains
- [ ] Firestore Database منشأة
- [ ] `.env` مملوء من `.env.example`
- [ ] (اختياري) حساب خدمة للسيرفر
- [ ] قلت لـ Cursor: **نفّذ التحويل إلى Firebase**
