# نشر system.samaa.dev

دليل إعداد **مرة واحدة** على السيرفر. بعد ذلك يكفي الدفع إلى `main` (أو تشغيل الـ workflow يدوياً).

النطاق: `https://system.samaa.dev`  
مسار التطبيق: `/var/www/samaa-dev-system`  
منفذ Node الداخلي: **`3000` فقط** (`127.0.0.1:3000`)

## منافذ محجوزة — لا تستخدمها لهذا المشروع

هذه المنافذ مشغولة على السيرفر. لا تربط بها PM2 ولا nginx لهذا التطبيق:

`8080`, `8081`, `8082`, `8083`, `8084`, `8085`, `8090`

- العامة: `80` / `443` عبر nginx فقط
- التطبيق: `127.0.0.1:3000` فقط (لا تفتحه للعامة)
- سرّ `DEPLOY_PORT` في GitHub = منفذ **SSH** (عادةً `22`)، وليس منفذ التطبيق
- منفذ Vite `8080` في التطوير المحلي لا يخص الـ VPS

---

## 1) DNS

أضف سجل `A` لـ `system.samaa.dev` يشير إلى IP السيرفر. انتظر انتشار DNS قبل certbot.

---

## 2) مستخدم النشر ومجلد التطبيق

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/samaa-dev-system
sudo chown -R deploy:deploy /var/www/samaa-dev-system
```

---

## 3) مفتاح SSH مخصص للنشر

على جهازك (ليس على السيرفر):

```bash
ssh-keygen -t ed25519 -C "github-actions-samaa-dev-system" -f ./samaa-deploy -N ""
```

على السيرفر كـ `deploy`:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
# الصق محتوى samaa-deploy.pub:
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

المفتاح الخاص (`samaa-deploy`) يُضاف كـ GitHub Secret باسم `DEPLOY_SSH_KEY`. لا تستخدم مفتاحك الشخصي.

---

## 4) Node.js 22 و PM2

```bash
# مثال Ubuntu — Node 22 عبر NodeSource أو nvm
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

تشغيل أولي بعد وصول أول build من الـ Action:

```bash
cd /var/www/samaa-dev-system
PORT=3000 pm2 start .output/server/index.mjs --name samaa-dev-system
pm2 save
pm2 startup
# نفّذ الأمر الذي يطبعه pm2 startup (يحتاج sudo مرة واحدة)
```

لاحقاً الـ workflow يعيد التحميل تلقائياً عبر `PORT=3000 pm2 reload ...`.

---

## 5) nginx

أنشئ مثلاً `/etc/nginx/sites-available/system.samaa.dev`:

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

فعّل الموقع:

```bash
sudo ln -sf /etc/nginx/sites-available/system.samaa.dev /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d system.samaa.dev
```

جدار ناري: افتح `80` و`443` فقط للعامة. لا تفتح `3000` أو أي من المنافذ المحجوزة أعلاه لهذا الغرض.

---

## 6) GitHub Secrets

في المستودع → **Settings → Secrets and variables → Actions**:

| Secret | القيمة |
| --- | --- |
| `DEPLOY_HOST` | IP أو hostname السيرفر |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_SSH_KEY` | محتوى المفتاح الخاص كاملاً |
| `DEPLOY_PORT` | منفذ SSH فقط (اتركه فارغاً أو `22`) |
| `VITE_FIREBASE_API_KEY` | من Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |

لا تضع `FIREBASE_ADMIN_*` في Secrets البناء الحالية (غير مستخدمة في الواجهة، ولا تُحقَن ببادئة `VITE_`).

---

## 7) Firebase Authorized domain

Firebase Console → **Authentication → Settings → Authorized domains** → أضف:

`system.samaa.dev`

---

## 8) أول نشر

1. أكمل الخطوات أعلاه (DNS، مستخدم، مفتاح، Node/PM2، nginx، Secrets، Firebase).
2. ادفع إلى `main` أو شغّل يدوياً: **Actions → Deploy to VPS → Run workflow**.
3. إن كان أول مرة ولم يكن PM2 يعمل بعد، الـ workflow يشغّله تلقائياً على المنفذ `3000`.
4. افتح `https://system.samaa.dev` واختبر تسجيل الدخول بـ Google.

بعد ذلك: أي تحديث لمواصفات النظام يُدفع للكود فقط — النشر يتبع عبر GitHub Actions دون الدخول للسيرفر.
