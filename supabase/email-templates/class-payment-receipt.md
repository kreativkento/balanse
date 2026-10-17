# Class payment e-receipt email

The live HTML is built in `supabase/functions/send-payment-receipt/receipt-html.ts` and sent via the **send-payment-receipt** Edge Function when an admin approves a payment.

Branding matches `confirm-signup.html`: `#1E2A35` header, `#c49a3c` accents, `#F7F5F0` background. Logo URL: `{PUBLIC_SITE_URL}/logo_main_white.svg` from the app `public/` folder.

Philippines OR-style fields come from `class_payments` (seller/buyer snapshots, UID, VAT lines when present, class schedule, payment method label).
