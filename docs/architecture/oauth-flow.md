# OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)

## Overview
IdentityHub implements the OAuth 2.0 Authorization Code grant with Proof Key for Code Exchange (PKCE) using the `S256` code challenge method.

## Authorization Flow

1. **Client Authorization Request**:
   - The browser application generates a cryptographically random `code_verifier` (43 to 128 characters).
   - Generates the `code_challenge`:
     ```
     code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
     ```
   - Redirects the user's browser to:
     ```
     GET /oauth/authorize?
       client_id=identityhub-crm&
       redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback&
       response_type=code&
       scope=openid%20profile%20email&
       state=<random_state>&
       code_challenge=<challenge>&
       code_challenge_method=S256
     ```

2. **Authorization Server Validation**:
   - Validates that `client_id` exists, is active, and the `redirect_uri` matches an exact pre-registered URI.
   - Validates that `code_challenge_method` is strictly `S256`.
   - Checks for an active IdentityHub central session (`identityhub_sso_session`).
   - If not authenticated, redirects user to login.
   - If authenticated, checks for prior consent in `OAuthConsent`.

3. **Consent Screen**:
   - If consent is required, presents an interactive consent prompt detailing requested scopes.
   - On denial, redirects to `redirect_uri?error=access_denied`.
   - On approval, records consent and generates an authorization code.

4. **Authorization Code Issuance**:
   - Generates a cryptographically random authorization code (stored as SHA-256 hash).
   - Binds code to `client_id`, `userId`, `redirect_uri`, `scope`, and `code_challenge`.
   - Code expires in 300 seconds (5 minutes) and is strictly single-use.
   - Redirects to client callback:
     ```
     302 Found
     Location: http://localhost:3001/api/auth/callback?code=AUTH_CODE&state=STATE
     ```

5. **Token Exchange**:
   - Client backend makes a direct POST request to `/oauth/token`:
     ```http
     POST /oauth/token HTTP/1.1
     Host: localhost:5000
     Content-Type: application/x-www-form-urlencoded

     grant_type=authorization_code&
     client_id=identityhub-crm&
     code=AUTH_CODE&
     redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fauth%2Fcallback&
     code_verifier=VERIFIER
     ```
   - Server computes `SHA256(code_verifier)` and verifies equality against stored `code_challenge` using constant-time comparison.
   - Server invalidates authorization code immediately (replay protection).
   - Issues tokens:
     ```json
     {
       "access_token": "eyJhbGciOiJSUzI1NiIs...",
       "id_token": "eyJhbGciOiJSUzI1NiIs...",
       "token_type": "Bearer",
       "expires_in": 900,
       "scope": "openid profile email"
     }
     ```
