# نشر quran-school.samaa.dev يدوياً

دليل رفع وتشغيل تطبيق **quran-school** على نفس السيرفر بجانب `system.samaa.dev` — **بدون** GitHub Actions.

| البند | القيمة |
| --- | --- |
| النطاق | `https://quran-school.samaa.dev` |
| مسار التطبيق | `/var/www/quran-school` |
| منفذ Node الداخلي | **`3001` فقط** (`127.0.0.1:3001`) |
| اسم PM2 | `quran-school` |
| ملف nginx | `/etc/nginx/sites-available/quran-school.samaa.dev` |

## منافذ — انتبه قبل الإعداد

### ممنوعة على السيرفر (مشغولة)

`8080`, `8081`, `8082`, `8083`, `8084`, `8085`, `8090`

### مستخدمة بمشروع آخر

| المشروع | النطاق | المنفذ |
| --- | --- | --- |
| samaa-dev-system | `system.samaa.dev` | `3000` |

### هذا المشروع

- **التطبيق:** `127.0.0.1:3001` فقط (لا تفتحه للعامة)
- **العامة:** `80` / `443` عبر nginx فقط
- منفذ Vite `8080` للتطوير المحلي فقط، وليس على الـ VPS

---

## 0) متطلبات المشروع (قبل أول نشر)

في مستودع **quran-school** (TanStack Start + Nitro + Firebase):

**`vite.config.ts`** — إضافة preset للـ VPS:

```ts
export default defineConfig({
  // ... باقي الإعدادات
  nitro: {
    preset: "node-server",
  },
});
```

**`package.json`** — سكربت التشغيل:

```json
"start": "node .output/server/index.mjs"
```

**`.env`** — قيم Firebase للبناء:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 1) DNS (مرة واحدة)

في لوحة إدارة نطاق `samaa.dev` أنشئ سجل:

| Type | Name | Value |
| --- | --- | --- |
| A | `quran-school` | IP السيرفر |

تحقق أن الاسم يحلّ:

```bash
dig +short quran-school.samaa.dev
```

يجب أن يظهر IP السيرفر قبل طلب شهادة SSL.

---

## 2) البناء على جهازك (كل نشر)

من جذر مشروع quran-school:

```bash
npm ci
npm run build
```

تحقق من وجود ملف التشغيل:

```bash
ls -la .output/server/index.mjs
```

---

## 3) إعداد السيرفر (مرة واحدة)

إن كان السيرفر مُعدّاً مسبقاً لـ `system.samaa.dev` (Node، nginx، certbot، PM2)، يكفي إنشاء المجلد:

```bash
sudo mkdir -p /var/www/quran-school
sudo chown -R "$USER:$USER" /var/www/quran-school
```

إن لم يكن أي شيء مثبتاً بعد (مثال Ubuntu):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2

sudo mkdir -p /var/www/quran-school
sudo chown -R "$USER:$USER" /var/www/quran-school
```

---

## 4) رفع الملفات

من جهازك (استبدل `USER` و`SERVER_IP`):

```bash
rsync -az --delete \
  .output/ \
  USER@SERVER_IP:/var/www/quran-school/.output/
```

بديل بـ `scp` (أبطأ):

```bash
scp -r .output USER@SERVER_IP:/var/www/quran-school/
```

---

## 5) تشغيل التطبيق بـ PM2 (مرة أولى)

على السيرفر:

```bash
cd /var/www/quran-school
PORT=3001 pm2 start .output/server/index.mjs --name quran-school
pm2 save
```

إن لم تكن نفّذت `pm2 startup` من قبل (مرة واحدة للسيرفر):

```bash
pm2 startup
# نفّذ الأمر الذي يطبعه pm2 startup (يحتاج sudo)
pm2 save
```

تحقق:

```bash
pm2 status
curl -sI http://127.0.0.1:3001 | head
```

---

## 6) nginx + HTTPS (مرة واحدة)

أنشئ الملف `/etc/nginx/sites-available/quran-school.samaa.dev`:

```nginx
server {
  listen 80;
  server_name quran-school.samaa.dev;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

فعّل الموقع واحصل على الشهادة:

```bash
sudo ln -sf /etc/nginx/sites-available/quran-school.samaa.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d quran-school.samaa.dev
```

جدار ناري: افتح `80` و`443` فقط للعامة. لا تفتح `3001` ولا أي من المنافذ المحجوزة أعلاه.

---

## 7) Firebase (مرة واحدة)

في [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Settings** → **Authorized domains**:

أضف: `quran-school.samaa.dev`

(استخدم مشروع Firebase الخاص بتطبيق quran-school إن كان مختلفاً عن samaa-dev-system.)

---

## 8) كل تحديث لاحق

1. على جهازك: `npm run build`
2. ارفع `.output` بنفس أمر `rsync` في القسم 4
3. على السيرفر:

```bash
PORT=3001 pm2 reload quran-school
```

---

## التحقق النهائي

افتح: [https://quran-school.samaa.dev](https://quran-school.samaa.dev)

- الصفحة تفتح عبر HTTPS
- تسجيل الدخول يعمل بعد إضافة النطاق في Firebase
- `system.samaa.dev` ما زال يعمل على المنفذ `3000` دون تعارض

---

## ملاحظات

- لا ترفع ملف `.env` أو مفاتيح Admin إلى Git
- سكربت الإنتاج: `npm start` → `node .output/server/index.mjs`
- إعداد Nitro للـ VPS: `preset: "node-server"` في `vite.config.ts`
- يمكن نسخ هذا الملف إلى جذر مستودع quran-school للرجوع إليه هناك
