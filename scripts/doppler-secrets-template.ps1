# This file is a template.
# Do not put real secrets in the committed file.
# Copy it to scripts/doppler-secrets.local.ps1.
# Put real secrets only in the local file.
# Run it with:
#   .\scripts\doppler-secrets.local.ps1

doppler secrets set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="PASTE_CLERK_PUBLISHABLE_KEY_HERE"
doppler secrets set CLERK_SECRET_KEY="PASTE_CLERK_SECRET_KEY_HERE"
doppler secrets set ADMIN_EMAIL="edumoustapha60@gmail.com"

doppler secrets set ICONSCOUT_API_KEY="PASTE_ICONSCOUT_API_KEY_HERE"
doppler secrets set ICONSCOUT_CLIENT_ID="43425795687865"

doppler secrets set NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
doppler secrets set NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
doppler secrets set NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/chat"
doppler secrets set NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/chat"
