# Call Easy - Twilio Anonymous Candidate Outreach Web App

Call Easy is a mobile-first web application designed for fast candidate outreach without exposing your personal phone number. It uses **Twilio Voice API** for call bridging, automatically sends **WhatsApp & Email follow-ups** with the official application link `https://admission.saveetha.com/`, and manages candidate queue state.

---

## 🔑 Key Features

- **Personal Phone Number Protection**: Tapping **"CALL CANDIDATE"** tells Twilio to call your phone first, then bridge to the candidate using your Twilio virtual number as Caller ID. Your personal number is never revealed.
- **Automated Multi-Channel Follow-up**: Tapping **"MARK CALL COMPLETE"** automatically sends an Email (Nodemailer/SendGrid) and a WhatsApp message (Twilio WhatsApp API) with the official application link `https://admission.saveetha.com/`.
- **Single-Page Mobile UI**: Designed for one-handed phone use with large touch targets, queue navigation ("Next Candidate"), status badges, and search/filters.
- **Dark & Light Theme**: Built-in theme switcher (Sun/Moon toggle) with automatic system preference detection (`prefers-color-scheme`) and `localStorage` persistence.
- **2,407 Candidate Dataset**: Preserves candidates #1 through #1778 (`Arivuselvi` through `Rahul Hp`) and appends clean candidate entries from `FEB-MAT-2026_sorted.xlsx` and `CMAT 2026 Edit With TN.xlsx`.

---

## 📋 Prerequisites, Setup Guide & Cost Breakdown

### 1. Twilio Voice API & Phone Number Masking
- **Account SID**: Set `TWILIO_ACCOUNT_SID=your_twilio_account_sid_here` in `.env`.
- **Auth Token**: Copy your Auth Token from your [Twilio Console](https://console.twilio.com/) into `.env` under `TWILIO_AUTH_TOKEN`.
- **Virtual Phone Number Options**:
  - **US / International Virtual Number**: Purchased instantly in Twilio Console for **~$1.15/month**. Outbound calls to Indian phone numbers cost **~$0.013 – $0.035/minute**.
  - **Indian Local Virtual Number (`+91`)**: Requires local TRAI compliance verification (GSTIN / Address proof / Business Registration). Approval timeline is **3 to 7 business days**.

### 2. WhatsApp Business API Setup & Timeline
- **Twilio WhatsApp Sandbox (Instant Testing)**: Works immediately using Twilio's shared WhatsApp sender (`+14155238886`).
- **Production WhatsApp Business Account (WABA)**:
  - **Prerequisites**: Meta Business Manager Verification + Verified Business Domain.
  - **Timeline**: **2 to 5 business days** for Meta approval.
  - **Cost**: ~$0.005 to $0.008 per message in India.

### 3. Email Infrastructure Setup (SendGrid / Amazon SES)
- **Dedicated Business Sender**: Send FROM `admissions@saveetha.com` instead of personal email.
- **SendGrid Free Tier**: **100 emails/day free forever**.
- **Domain Authentication (DKIM & SPF)**: Add 3 DNS CNAME records to your domain registrar (GoDaddy, Cloudflare, Hostinger) to guarantee inbox delivery.
- **Timeline**: **15 to 30 minutes** for DNS propagation.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies & Run Backend Server
```bash
npm install
npm start
```
Access the application at `http://localhost:3000` or via GitHub Pages at `https://varshithathi2006.github.io/Call-easy`.

### 2. Configure Environment Variables (`.env`)
```env
PORT=3000

TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

TWILIO_PHONE_NUMBER=+18005550199
TWILIO_WHATSAPP_NUMBER=+14155238886

RECRUITER_PHONE_NUMBER=+919876543210

SERVER_BASE_URL=http://localhost:3000

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=admissions@saveetha.com
SMTP_PASS=your_app_password
EMAIL_FROM="Saveetha Admissions Cell <admissions@saveetha.com>"
```
