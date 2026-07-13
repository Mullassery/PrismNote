# Google SSO Setup Guide

PrismNote now supports Google Sign-In for secure, seamless authentication.

## Quick Start

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose application type: **Web application**
4. Add authorized JavaScript origins:
   - `http://localhost:8000` (development)
   - `http://localhost:5173` (frontend dev server)
   - `https://yourdomain.com` (production)
5. Add authorized redirect URIs:
   - `http://localhost:8000/` (development)
   - `https://yourdomain.com/` (production)
6. Copy your **Client ID** and **Client Secret**

### 3. Configure PrismNote

Create a `.env` file in the root directory:

```bash
# Frontend - Copy your Client ID here
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com

# Backend - Optional (for server-side verification)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

### 4. Run PrismNote

```bash
# Frontend dev server (detects .env)
cd frontend && npm run dev

# Production build
npm run build
```

## How It Works

### Frontend Flow
1. User clicks "Sign in with Google"
2. Google OAuth popup appears
3. User authenticates with Google
4. Frontend receives ID token
5. Token sent to `/api/auth/google` endpoint
6. User is logged in and redirected to app

### Backend Flow
1. Receive ID token from frontend
2. Fetch Google's public keys (JWKS)
3. Verify JWT signature
4. Extract user email, name, picture
5. Create/update user in PrismNote
6. Issue PrismNote JWT token
7. Return auth response to frontend

## Features

✅ **One-click signup** — No password required  
✅ **Secure verification** — Google JWT signature verification  
✅ **Email verified** — Only accept email-verified Google accounts  
✅ **User info syncing** — Name and profile picture from Google  
✅ **Seamless integration** — Works alongside email/password auth  

## Security Notes

- **No password storage** — Google handles authentication
- **HTTPS in production** — Always use HTTPS for OAuth
- **Token verification** — All tokens verified server-side
- **CORS protected** — Only your origin can authenticate
- **Session isolation** — Each user gets unique session

## Troubleshooting

### "Invalid token format"
- Make sure you're using a valid Google ID token
- Check browser console for errors

### "Key not found"
- Google's JWKS endpoint may have changed
- Try refreshing the app

### "Email not verified"
- User needs to verify their email in Google Account settings
- This is a security requirement

### "CORS error"
- Add your domain to "Authorized JavaScript origins" in Google Cloud Console
- Restart the app after updating credentials

## Testing

### With Demo Credentials

For development, you can test with a Google test account:

1. Add test user email in Google Cloud Console → "OAuth 2.0 consent screen"
2. Use that account to sign in
3. Check browser DevTools → Network to see token exchange

### Production Verification

Before deploying:

1. Update `.env` with production Client ID
2. Add production domain to Google Cloud Console
3. Test login at `https://yourdomain.com/login`
4. Verify user session persists after page reload

## Migrating Existing Users

If you have existing email/password users:

1. **Email matching** — Users with same email can use either auth method
2. **Account linking** — Coming in v1.4: Link Google account to existing email account
3. **No migration needed** — Both auth methods work simultaneously

## Support

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [PrismNote GitHub Issues](https://github.com/Mullassery/prismnote/issues)
- [Email support](mailto:mullassery@gmail.com)
