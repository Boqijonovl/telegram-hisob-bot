# Hisob Bot - Telegram Expense Tracker & Mini App

Ushbu loyiha foydalanuvchilarning kundalik xarajatlari va daromadlarini hisoblab borishga mo'ljallangan Telegram bot va Telegram Mini App (Web App) hisoblanadi.

## ✨ Xususiyatlari
* **Telegram Mini App Interfeysi**: Telegram ichida ochiladigan chiroyli, responsive va Telegram'ning yorug' yoki qorong'u mavzusiga (light/dark theme) to'liq moslashuvchan premium interfeys.
* **Tezkor Qo'shish (Chat orqali)**: Mini App-ni ochmasdan, to'g'ridan-to'g'ri botga yozish orqali tranzaksiyalarni qo'shish (masalan: `30000 taksi uyga`, `+1500000 maosh`).
* **Byudjet Limitlari**: Oylik xarajat limitini belgilash va limit oshib ketganda bot orqali chatga shaxsiy ogohlantirish xabarini yuborish.
* **CSV Eksport**: Barcha operatsiyalar tarixini Microsoft Excel-ga mos keladigan UTF-8 kodlash tizimidagi `.csv` shaklida yuklab olish.
* **Zaxiralash (Backup)**: `/backup` buyrug'i orqali barcha ma'lumotlarni shaxsiy chatga `.json` fayl ko'rinishida yuborish.

## 🛠 Texnologiyalar
* **Frontend**: React, Vite, Lucide Icons, Vanilla CSS
* **Backend**: Node.js, Express, Telegraf (Telegram Bot API)
* **Database**: Local JSON File Database (hech qanday qo'shimcha o'rnatishlarsiz Windows-da ishlaydi)

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Loyihani yuklab oling va bog'liqliklarni o'rnating:
Har bir papkada alohida-alohida dependency-larni o'rnating:

```bash
# Backend uchun
cd backend
npm install

# Frontend uchun
cd ../frontend
npm install
```

### 2. Atrof-muhit sozlamalari (.env)
`backend` papkasi ichida `.env` nomli fayl yarating (yoki `.env.example` dan nusxa oling) va quyidagi ma'lumotlarni to'ldiring:
```env
BOT_TOKEN=Sizning_Telegram_Bot_Tokeningiz
PORT=5000
WEBAPP_URL=http://localhost:5173
```
*Bot tokenini [@BotFather](https://t.me/BotFather) orqali olishingiz mumkin.*

### 3. Ishga tushirish
Har bir qismni alohida terminal oynasida ishga tushiring:

```bash
# Backend va Telegram botni ishga tushirish
cd backend
npm start

# Frontend (Mini App) ni ishga tushirish
cd frontend
npm run dev
```

---

## 🔒 Xavfsizlik Eslatmasi
Sizning shaxsiy bot tokeningiz (`BOT_TOKEN`) va ma'lumotlar bazangiz (`database.json`) GitHub-ga yuklanib ketmasligi uchun loyihaga `.gitignore` fayli sozlangan. **Hech qachon shaxsiy tokenlaringizni ochiq holda internetga yuklamang!**
