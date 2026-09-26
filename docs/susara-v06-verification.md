# Susara — V06 secure browser session

## Vulnerability and fix

V06 addresses OWASP A02 Cryptographic Failures: the browser previously stored the
JWT in `localStorage`. JavaScript running in the page could read that credential,
and Google OAuth returned a JWT in the redirect URL.

The browser session now uses an `HttpOnly`, `SameSite=Lax` cookie. Production adds
`Secure` and uses the `__Host-dineswift_session` cookie name. Login, registration
and Google OAuth establish the cookie; `GET /api/auth/me` restores the signed-in
user; `POST /api/auth/logout` clears it. Responses no longer expose the JWT in JSON
or OAuth query parameters. The frontends send credentials and the
`X-DineSwift-Request: 1` CSRF header. The gateway, RestaurantService and
OrderService accept the cookie and verify HS256 JWTs. Explicit bearer tokens remain
available for trusted non-browser clients and Postman testing.

Cookie-authenticated state-changing requests require both the custom header and an
allowed `Origin`. This blocks cross-site form requests while retaining the current
multi-port local development setup. CORS allows only `FRONTEND_URL` and
`RESTAURANT_MANAGER_URL`, with credentials enabled.

## Configuration

Copy each service's `.env.example` to its untracked `.env`. Set one strong,
unpredictable `JWT_SECRET` to the same value in UserService, ApiGateWay,
RestaurantService and OrderService. Configure the frontend origins exactly; do not
use `*` with credentialed CORS. Configure MongoDB and Google OAuth values where
required. Never commit secrets or include them in evidence captures.

For deployment, serve the frontend and APIs through the same site, use HTTPS and
set `NODE_ENV=production`. The `__Host-` cookie is intentionally host-only, so a
deployment that places APIs on unrelated domains needs a same-site reverse proxy
or a reviewed cookie architecture.

## Manual evidence procedure

Use a disposable test account and browser DevTools:

1. Clear the site's cookies and legacy `token`/`user` local-storage entries.
2. Register or log in. Capture the successful response showing user data without a
   token. In Application > Cookies, capture the session cookie flags. DevTools
   should show `HttpOnly` and `SameSite=Lax`; production evidence should also show
   `Secure` and the `__Host-` name.
3. Capture Local Storage showing that no new JWT is stored. Do not reveal the
   cookie value in screenshots.
4. Refresh the page. Capture `GET /api/auth/me` returning the user and the UI still
   signed in.
5. Perform an authenticated restaurant or order request through the gateway.
   Capture the request with credentials and `X-DineSwift-Request: 1`, plus its
   successful response.
6. Repeat a state-changing cookie request after removing the custom header, then
   with an unapproved `Origin`. Capture the 403 responses.
7. Log out. Capture the clearing `Set-Cookie`, then capture `/api/auth/me` returning
   401 and the signed-out UI.
8. Start Google OAuth. Confirm the authorization request contains a state value,
   the callback verifies it, and the final browser URL is `/login?oauth=success`
   without a JWT. Redact OAuth codes and cookie values.

For Postman, cookie-based writes need an allowed `Origin` header and
`X-DineSwift-Request: 1`. A trusted API-client bearer token is intentionally not
subject to the browser-origin check. Never export live tokens with the collection.

## Automated verification

Run:

```powershell
cd Services/UserService
npm.cmd test

cd ../RestaurantService
npm.cmd test
```

The UserService suite exercises real Express routes and HTTP for registration,
login, `/me`, logout, cookie flags, CORS, CSRF, OAuth state handling, gateway JSON
proxying, and RestaurantService/OrderService cookie authentication. It uses model
doubles and does not contact a live MongoDB or Google. RestaurantService tests
cover its authorization and input-validation routes.

Recorded result on 2026-09-26:

- UserService V06 integration tests: **10 passed**.
- RestaurantService security tests: **22 passed**.
- Main frontend production build: **passed**, with a large-chunk warning.
- Restaurant manager production build: **passed**, with existing warnings.
- Modified backend JavaScript syntax checks: **passed**.

Live smoke verification on 2026-09-26 used the configured MongoDB services and
the actual ApiGateWay. Registration returned 201 without a token field and set an
`HttpOnly`, `SameSite=Lax` cookie; `/me` returned 200; a logout request without the
CSRF header returned 403; logout returned 204; and `/me` then returned 401. After
logging in again, authenticated gateway requests to RestaurantService and
OrderService both returned 200. Cookie values and configuration secrets were not
printed or captured.

The live browser, database and Google OAuth flows still require manual verification
in a browser before final submission; Google OAuth was covered only by the isolated
integration fixture.

## Report-ready text

**Root cause:** Long-lived bearer credentials were exposed to browser JavaScript
through local storage and, for OAuth, through a redirect query parameter.

**Impact:** Any successful script injection or malicious browser extension with
page access could steal a reusable credential. URLs could also leak OAuth-issued
tokens through history, logs or referrer data.

**Remediation:** Move JWT transport to protected cookies, remove tokens from API
bodies and URLs, restore sessions through `/me`, clear them through logout, enforce
credentialed origin allowlists and require an origin-bound custom header for
cookie-authenticated writes. Validate OAuth state before establishing the session.

**Verification:** Automated HTTP integration tests cover session lifecycle, cookie
attributes, CORS, CSRF, OAuth state and downstream verification. Browser evidence
must confirm storage, refresh, logout and live OAuth behaviour.

Suggested commit: `fix(security): move browser authentication to httpOnly cookies`
