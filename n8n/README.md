# BALANSÉ Assistant

The live workflow is published at https://kychver.app.n8n.cloud/workflow/PelCJJ6LH4J9T8nm. `balanse-assistant.workflow.json` is a source-controlled template for that workflow; importing it into the existing workflow again would create duplicate nodes.

The browser calls the `balanse-chat` Supabase Edge Function. That function reads only approved catalog fields and aggregate enrollment counts, then calls the n8n production webhook with `BALANSE_CHAT_WEBHOOK_SECRET`. n8n uses the existing Google Gemini credential and Gemini 3.5 Flash Lite. No browser bundle contains a Gemini key, service-role key, or webhook token.

To verify the deployed path locally, run `node --env-file=.env --env-file=.env.chatbot.local scripts/test-balanse-chat.mjs gateway` from the project root. The local secret file is Git-ignored. The chatbot is also available in the existing help menu while running `npm run dev`.

If the public website moves to another origin, add its exact origin to the function's `BALANSE_CHAT_ALLOWED_ORIGINS` secret. It is a comma-separated list and replaces the built-in defaults, so include all origins that should remain allowed. Re-deploy the frontend after changing its source; the Supabase function and n8n workflow are already live.
