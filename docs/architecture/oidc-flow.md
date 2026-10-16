# OpenID Connect (OIDC) Implementation Guide

## Overview
IdentityHub implements the OpenID Connect (OIDC) Core 1.0 specification layer on top of OAuth 2.0 to provide cryptographic identity tokens and standardized user information delivery.

## Endpoints

### 1. Discovery Metadata
- **URL**: `GET /.well-known/openid-configuration`
- **Description**: Returns standard JSON metadata describing endpoints, supported response types, subject types, ID token signing algorithms, and scopes.

### 2. JSON Web Key Set (JWKS)
- **URL**: `GET /.well-known/jwks.json`
- **Description**: Exposes the public RSA verification key formatted per RFC 7517.
- **Key Parameters**:
  - `kty`: `RSA`
  - `use`: `sig`
  - `alg`: `RS256`
  - `kid`: `identityhub-key-01`
  - `n`, `e`: Public modulus and exponent

### 3. UserInfo Endpoint
- **URL**: `GET /oidc/userinfo`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**:
  ```json
  {
    "sub": "user-uuid",
    "email": "user@example.com",
    "email_verified": true,
    "name": "Jane Doe",
    "given_name": "Jane",
    "family_name": "Doe",
    "updated_at": 1700000000
  }
  ```

## ID Token Claims Structure
ID tokens are signed with RS256 and include:
```json
{
  "iss": "http://localhost:5000",
  "sub": "b2c3d4e5-...",
  "aud": "identityhub-crm",
  "exp": 1700000300,
  "iat": 1700000000,
  "email": "user@example.com",
  "email_verified": true,
  "name": "Jane Doe",
  "given_name": "Jane",
  "family_name": "Doe"
}
```
Client applications validate the signature using the JWKS endpoint, check that `iss` matches the IdP URL, `aud` matches their own client ID, and `exp` is in the future.
