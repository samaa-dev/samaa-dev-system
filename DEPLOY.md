# نشر system.samaa.dev يدوياً

دليل رفع وتشغيل التطبيق على السيرفر **بدون** الاعتماد على GitHub Actions لتجهيز السيرفر.

| البند | القيمة |
| --- | --- |
| النطاق | `https://system.samaa.dev` |
| مسار التطبيق | `/var/www/samaa-dev-system` |
| منفذ Node الداخلي | **`3000` فقط** (`127.0.0.1:3000`) |

## منافذ محجوزة — لا تستخدمها

هذه المنافذ مشغولة على السيرفر. لا تربط بها PM2 ولا nginx لهذا التطبيق:

`8080`, `8081`, `8082`, `8083`, `8084`, `8085`, `8090`

- العامة: `80` / `443` عبر nginx فقط
- التطبيق: `127.0.0.1:3000` فقط (لا تفتحه للعامة)
- منفذ Vite `8080` للتطوير المحلي فقط، وليس على الـ VPS

---

## 1) DNS (مرة واحدة)

في لوحة إدارة نطاق `samaa.dev` أنشئ سجل:

| Type | Name | Value |
| --- | --- | --- |
| A | `system` | IP السيرفر |

تحقق أن الاسم يحلّ:

```bash
dig +short system.samaa.dev
```

يجب أن يظهر IP السيرفر قبل طلب شهادة SSL.

---

## 2) البناء على جهازك (كل نشر)

تأكد أن ملف `.env` في جذر المشروع يحتوي قيم Firebase:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

ثم من جذر المشروع:

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

على السيرفر (مثال Ubuntu):

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

# PM2
sudo npm install -g pm2

# مجلد التطبيق
sudo mkdir -p /var/www/samaa-dev-system
sudo chown -R "$USER:$USER" /var/www/samaa-dev-system
```

---

## 4) رفع الملفات

من جهازك (استبدل `USER` و`SERVER_IP`):

```bash
rsync -az --delete \
  .output/ \
  USER@SERVER_IP:/var/www/samaa-dev-system/.output/
```

بديل بـ `scp` (أبطأ وأقل ملاءمة للتحديثات المتكررة):

```bash
scp -r .output USER@SERVER_IP:/var/www/samaa-dev-system/
```

---

## 5) تشغيل التطبيق بـ PM2 (مرة أولى)

على السيرفر:

```bash
cd /var/www/samaa-dev-system
PORT=3000 pm2 start .output/server/index.mjs --name samaa-dev-system
pm2 save
pm2 startup
```

نفّذ الأمر الذي يطبعه `pm2 startup` (يحتاج `sudo` مرة واحدة).

تحقق:

```bash
pm2 status
curl -sI http://127.0.0.1:3000 | head
```

---

## 6) nginx + HTTPS (مرة واحدة)

أنشئ الملف `/etc/nginx/sites-available/system.samaa.dev`:

```nginx
server {
  listen 80;
  server_name system.samaa.dev;

  location / {
    proxy_pass http://127.0.0.1:3000;
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
sudo ln -sf /etc/nginx/sites-available/system.samaa.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d system.samaa.dev
```

جدار ناري: افتح `80` و`443` فقط للعامة. لا تفتح `3000` ولا أي من المنافذ المحجوزة أعلاه لهذا التطبيق.

---

## 7) Firebase (مرة واحدة)

في [Firebase Console](https://console.firebase.google.com/) → **Authentication** → **Settings** → **Authorized domains**:

أضف: `system.samaa.dev`

---

## 8) كل تحديث لاحق

1. على جهازك: `npm run build`
2. ارفع `.output` بنفس أمر `rsync` في القسم 4
3. على السيرفر:

```bash
PORT=3000 pm2 reload samaa-dev-system
```

---

## التحقق النهائي

افتح: [https://system.samaa.dev](https://system.samaa.dev)

- الصفحة تفتح عبر HTTPS
- تسجيل الدخول بـ Google يعمل بعد إضافة النطاق في Firebase

---

## ملاحظات

- لا ترفع ملف `.env` أو مفاتيح Admin إلى Git
- سكربت الإنتاج في المشروع: `npm start` → `node .output/server/index.mjs`
- إعداد Nitro للـ VPS موجود في `vite.config.ts` (`preset: "node-server"`)
- يوجد أيضاً workflow في `.github/workflows/deploy.yml` إن رغبت لاحقاً بأتمتة الرفع؛ هذا الدليل يغطي المسار اليدوي فقط
