# Susara — V03 RestaurantService access control

## Scope and baseline

Baseline reviewed: `6cd6006` (`merge: combine all security updates`).
Only V03 is implemented in this change. V07's complete validation, V06's cookie
migration and V08's dependency audit remain separate work. No commits or pushes
were created by this task.

Before: RestaurantService mounted handlers without authentication. Anyone reaching
port 5002 could create/update/delete restaurants and menu items. Rating/comment
handlers accepted a client-controlled `userId`. Gateway JWT verification did not
protect direct service access. Public registration also accepted privileged roles.

After: protected routes verify an HS256 JWT, expiration and user ID; restaurant
management requires `restaurant-admin` and ownership of the parent restaurant.
New restaurants receive the verified creator's ID as owner. Ownership cannot be
assigned through a request body. Public registration creates customers only.
Ratings/comments use the verified author's identity. Public catalogue browsing is
retained; internal owner data and individual rating history are not serialized.
Comment author IDs remain public pseudonymous identifiers, as in the existing UI.

## Access policy

All paths below have `/api` as their prefix on RestaurantService (port 5002).

| Method and path | Access |
| --- | --- |
| GET /restaurants, /restaurants/:id, /cuisines | Public |
| GET /menu-items, /menu-items/:id, /restaurants/:restaurantId/menu-items | Public |
| GET /restaurants/:restaurantId/menu-items/:id/comments | Public |
| POST /restaurants | Approved restaurant administrator |
| PUT, DELETE /restaurants/:id | Restaurant administrator who owns that restaurant |
| POST /restaurants/:restaurantId/menu-items | Parent restaurant's administrator/owner |
| PUT, DELETE /menu-items/:id | Parent restaurant's administrator/owner |
| POST /restaurants/:restaurantId/menu-items/:id/rate | Any authenticated user; verified author |
| POST /restaurants/:restaurantId/menu-items/:id/comments | Any authenticated user; verified author |

Missing/invalid/expired credentials return 401, insufficient role/ownership 403,
missing resources 404, malformed management resource IDs 400. Missing signing
configuration returns 503 when a bearer credential is supplied. The gateway's
existing invalid-token status remains 403; it still requires a JWT for catalogue
requests. This change does not relax that policy or add new gateway proxy routes.

## Local setup

1. In RestaurantService's untracked `.env`, configure `MONGO_URI` and the **same**
   `JWT_SECRET` as UserService and ApiGateWay. Use `.env.example` as a template.
   Never place real secrets in screenshots, reports, source files or commits.
2. If running the separate manager at `http://localhost:3000`, set
   `RESTAURANT_MANAGER_URL=http://localhost:3000` in RestaurantService,
   ApiGateWay and UserService. Their existing `FRONTEND_URL` remains supported.
   This is an explicit additional allowed origin, not wildcard CORS.
3. Run `npm install` and `npm start` in RestaurantService; start UserService and
   ApiGateWay using their existing setup. Restart all three after config changes.
4. Run the restaurant client (`Services/RestaurantService/client`, `npm start`).
   Sign in using the new sign-in form. Its bearer token is held only in memory;
   refreshing requires another sign-in. The existing main frontend token storage
   is deliberately left for V06; its review requests now send that credential.

### Approved accounts and legacy ownership

Use two disposable test users (A and B) approved as restaurant administrators and
one customer. Register normally, then a trusted database operator can assign the
two test accounts the `restaurant-admin` role in the **UserService database**.
Identify accounts by verified `_id`, not just an unverified email. Sign in again
after assigning the role because claims are embedded in the JWT.

Public signup must never perform this promotion. Existing privileged accounts
should be reviewed: a previously self-selected role is not evidence of approval.
If unapproved privileged accounts existed, remove those roles and invalidate their
already-issued credentials (the current architecture supports coordinated JWT
secret rotation across all verifying services, which signs out all users).

Existing restaurants without `owner` remain publicly readable but cannot be
modified. A trusted operator must review an explicit restaurant-to-user mapping.
For each approved mapping, use the RestaurantService database's native collection
update (the application schema intentionally makes owner immutable):

```javascript
// mongosh, connected to the correct RestaurantService test database.
// Replace BOTH placeholders with independently verified 24-hex IDs.
db.restaurants.updateOne(
  { _id: ObjectId("RESTAURANT_ID"), owner: { $exists: false } },
  { $set: { owner: ObjectId("APPROVED_USER_ID") } }
)
```

Require `matchedCount === 1` and `modifiedCount === 1`; otherwise investigate.
Do not assign all restaurants to one account or add a public claim-owner endpoint.
No database records or roles were changed automatically by this task.

## Postman evidence

Use a disposable database. Set `base=http://localhost:5002/api` and keep tokens
in local, non-exported Postman variables. Login at
`POST http://localhost:5001/api/auth/login` with `email` and `password` to obtain
A, B and customer tokens. In Authorization choose Bearer Token for signed-in
cases, and **No Auth** (remove any inherited header) for anonymous cases.

Create test restaurant as A with `POST {{base}}/restaurants`:

```json
{
  "name": "V03 Test Restaurant",
  "cuisine": "Sri Lankan",
  "image": "https://example.com/restaurant.jpg",
  "deliveryTime": 30,
  "minOrder": 500,
  "location": { "type": "Point", "coordinates": [79.8612, 6.9271] }
}
```

Save its `_id` as `restaurantId`. Create an item with
`POST {{base}}/restaurants/{{restaurantId}}/menu-items` as A:

```json
{
  "name": "Test Rice",
  "category": "Main",
  "price": 750,
  "images": ["https://example.com/rice.jpg"]
}
```

Save its `_id` as `menuItemId`. Execute each case below, inspecting database state
as well as HTTP status. Use separate disposable resources for successful deletes.

| Test | Baseline expected with valid data/healthy DB | Fixed expected |
| --- | --- | --- |
| GET catalogue without token | 200 | 200 |
| POST restaurant without token | 201 | 401, nothing created |
| PUT/DELETE restaurant or menu without token | 200 | 401, unchanged |
| Add menu without token | 201 | 401 |
| Any management write as customer | Accepted | 403 |
| Any management write as B on A's resources | Accepted | 403 |
| Management write as A on A's resources | Accepted | 200/201 |
| Management write on unassigned legacy restaurant | Accepted | 403 |
| Write with altered signature or expired JWT | Credential ignored | 401 |
| Anonymous rating/comment | Accepted with valid payload | 401 |
| Review as A with B's `userId` in body | B trusted | Stored author is A |
| Update body includes `owner`, `$set.owner`, `_id`, `menuItems` | No owner protection | These fields cannot change ownership/relationships |
| Signup with `role: "restaurant-admin"` | Role accepted | 400, no account created |

Review bodies: `{"rating":4,"userId":"OTHER_USER_ID"}` and
`{"text":"V03 test comment","userId":"OTHER_USER_ID"}`. Submit a second rating
with the same JWT: it updates that user's existing rating rather than creating
another identity. A nonexistent management resource returns 404 for an authorized
administrator; an invalid ID returns 400.

Repeat restaurant create/update/delete and nested menu/review requests through
`http://localhost:5000/api/restaurants...`. The gateway proxies these paths and
now restores parsed JSON bodies. Top-level `/api/menu-items` and `/api/cuisines`
do not have gateway proxies; test them directly, not as gateway coverage.

For before evidence, use existing captured evidence or a separate baseline checkout
against a separate test database. Do not revert the merged working tree. Baseline
statuses above are source-derived expectations, not a claim of executed exploits.

Capture:

1. Before/after identical unauthenticated write: method, URL, No Auth and response.
2. Customer and non-owner 403 responses, plus database data unchanged.
3. Owner success and the resulting database change.
4. Spoofed `userId` request and verified author stored in the database.
5. Public catalogue still loading in a signed-out browser.
6. Test command and summary. Redact secrets and bearer credentials.

## Automated verification

Run `npm test` inside `Services/RestaurantService`.

Tests use actual Express routing, HTTP and JWT cryptography with isolated model
doubles, not a live MongoDB. The registration tests execute the real controller
with isolated User/bcrypt dependencies; they do not test bcrypt itself. Public
serialization is tested against actual Mongoose documents. Browser interaction,
real database persistence and deployed gateway behaviour require the manual
checks above. No external database or payment operations are performed by tests.

Recorded automated results for this change:

- RestaurantService `npm test`: **13 tests passed**, covering real HTTP requests
  across all eight protected mutation routes, role/ownership failures, successful
  owners, spoofed identities, public reads, serialization and registration roles.
- Main frontend production build: **passed**, with an existing large-bundle warning.
- Restaurant manager production build: **passed** with the compatible local
  TypeScript peer described below. Existing unused-variable/hook-dependency lint
  warnings remain; lint was not disabled. All 28 manager JS/JSX files also parsed.
- Modified service entry points and UserService controller: Node syntax checks passed.
- `git diff --check`: passed.

Actual service-process smoke check (2026-09-25): started `index.js` on port 5002,
sent HTTP requests, then stopped that temporary process. RestaurantService had
no `.env`, and neither `MONGO_URI` nor `JWT_SECRET` was set in the environment.
Anonymous POST `/api/restaurants` and DELETE `/api/restaurants/:id` returned 401.
GET `/api/restaurants` returned 500 (`Database connection error`). This confirms
startup and anonymous-write rejection only, not successful database connectivity
or authenticated end-to-end behaviour. Full runtime verification remains pending
test configuration. Existing startup checks can add missing `ratings` arrays to
menu documents, so use a disposable test database for that verification.

Dependency setup observations to carry into V08: the main frontend has no lockfile;
the restaurant client's existing lockfile disagrees with its package manifest, so
`npm ci` fails. Build verification installs used `--package-lock=false` for those
clients, without changing their manifests/lockfiles or using `--force`. Deprecated
CRA dependencies were reported during installation; this is not an npm audit.

The restaurant client's unconstrained installation also selected TypeScript 7,
outside CRA 5's declared `^3.2.1 || ^4` peer range. This caused ESLint's
`Environment key "jest/globals" is unknown` error (the underlying Jest plugin
failed while loading TypeScript type flags). For local build verification, install
the compatible peer without changing manifests/lockfiles, from the client directory:

```powershell
npm.cmd install --no-save --package-lock=false --ignore-scripts --no-audit --no-fund typescript@4.9.5
npm.cmd run build
```

V08 should resolve and lock this dependency setup permanently; this temporary
verification install is not a completed dependency-security remediation.

## Report-ready explanation

**Vulnerability:** V03, OWASP A01 Broken Access Control: unauthenticated downstream
restaurant mutations and missing restaurant-level authorization.

**Root cause:** Protection existed at the gateway, while directly reachable service
routes trusted callers, body-supplied identities and publicly selectable roles.

**Impact:** Unauthorized restaurant/menu creation, price changes, destructive
deletions, cross-restaurant administration and review impersonation.

**Fix:** Verify JWTs at the service boundary, enforce approved roles and parent
restaurant ownership, prevent ownership mass assignment, derive authors from the
verified token and disallow privileged public signup. Preserve public browsing.

**Verification:** Automated negative/positive HTTP authorization tests plus the
Postman/browser evidence matrix above. Record actual manual outcomes separately.

**Prevention:** Define an endpoint access matrix during design, make ownership
explicit in the data model, and require negative authorization tests in review/CI.

Suggested commit: `fix(security): enforce restaurant authentication and ownership checks`
