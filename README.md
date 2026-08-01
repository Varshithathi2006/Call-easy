# Call Easy - Twilio Anonymous Candidate Outreach Web App

Call Easy is a mobile-first web application designed for fast candidate outreach without exposing your personal phone number. It uses **Twilio Voice API** for call bridging, automatically sends **WhatsApp & Email follow-ups** upon tapping "Mark Call Complete", and manages candidate queue state.

---

## 🔑 Key Features

- **Personal Phone Number Protection**: When you tap **"Call Candidate"**, Twilio calls your phone first, then bridges to the candidate using your Twilio virtual number as Caller ID. Your personal number is never revealed.
- **Automated Multi-Channel Follow-up**: Tapping **"Mark Call Complete"** automatically sends an Email (via Nodemailer/SMTP) and a WhatsApp message (via Twilio WhatsApp API) using customizable templates.
- **Single-Page Mobile UI**: Designed for one-handed phone use with large touch targets, queue navigation ("Next Candidate"), status badges, and search/filters.
- **Editable Templates**: Customizable message templates with dynamic tags (`{name}`, `{role}`, `{company}`, `{next_step}`) and live preview.
- **Candidate Persistence**: Saves contact status (`pending`/`contacted`) and timestamps in `candidates.json` and `localStorage`.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
Copy `.env.example` to `.env` and enter your credentials:
```env
PORT=3000

# Twilio Account SID provided
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here

# Twilio Virtual Phone Number (Purchased in Twilio Console)
TWILIO_PHONE_NUMBER=+18005550199

# Twilio WhatsApp Sender Number (Sandbox: +14155238886)
TWILIO_WHATSAPP_NUMBER=+14155238886

# Your Personal Phone Number (Where Twilio calls you first)
RECRUITER_PHONE_NUMBER=+919876543210

# Base URL for Webhooks (Use ngrok URL for live testing)
SERVER_BASE_URL=http://localhost:3000

# Email Setup (SMTP or Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=recruiter@example.com
SMTP_PASS=your_app_password
EMAIL_FROM="Recruiter <recruiter@example.com>"
```

### 3. Run Server
```bash
npm start
```
Access the application at `http://localhost:3000` on mobile or desktop browser.

### 4. Testing Anonymous Voice Calls with ngrok
Because Twilio requires a public URL to fetch call bridging XML (TwiML), run ngrok when testing live phone calls:
```bash
npx ngrok http 3000
```
Update `SERVER_BASE_URL` in `.env` with your ngrok HTTPS URL (e.g. `https://xxxx.ngrok-free.app`).

---

## 🛠️ Twilio Account Setup & Costs

1. **Twilio Voice Number**: ~$1.15/month per virtual number + ~$0.013/min outbound calls.
2. **Twilio WhatsApp API**: Free sandbox testing (`whatsapp:+14155238886`) or paid WhatsApp Business Profile (~$0.005/msg).
3. **Email SMTP**: Free with Gmail App Password or SendGrid (100 free emails/day).
