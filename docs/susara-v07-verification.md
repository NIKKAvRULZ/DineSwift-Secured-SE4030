# Susara — V07 RestaurantService payload validation

Branch: `fix/susara-security-updates`. Baseline: `dedc989` (V03 restored on
Susara's branch). This change is not committed or pushed automatically.

## Finding and impact

After V03, restaurant writes already used a top-level field allow-list and owner
checks. However, nested location/address/hours data lacked explicit validation;
Mongoose could coerce values and errors could leak internal details through 500
responses. Menu creation/update destructured fields but lacked consistent numeric,
boolean and image validation. Image checks were inconsistent between create and
update. Unexpected fields were silently ignored instead of rejected.

An authorized caller could submit malformed geographic data, negative prices,
invalid percentage discounts or unsafe image schemes, causing data corruption,
inconsistent business behaviour and internal-error disclosure. Authentication
does not replace input validation. Classification: OWASP A03:2021 Injection/input
validation; mass assignment also relates to A01 Broken Access Control. Do not
claim that every malformed input was a demonstrated database injection exploit.

## Implemented fix

`middleware/validatePayload.js` implements strict JSON types and explicit nested
allow-lists without adding a dependency (RestaurantService has no validation
library). Routes invoke it after V03 authentication/authorization. Only validated
fields reach the create/update handlers. Unknown fields, including MongoDB
operators and ownership/relationship fields, receive a safe 400 response.

Affected endpoints (prefix `/api`):

- POST `/restaurants`
- PUT `/restaurants/:id`
- POST `/restaurants/:restaurantId/menu-items`
- PUT `/menu-items/:id`

| Input | Contract |
| --- | --- |
| Restaurant create | Requires name, cuisine, image, deliveryTime, minOrder, location |
| Restaurant update | Nonempty partial payload; omitted rating is preserved |
| Menu create/update | Requires name, category, price, preserving existing update contract |
| Name/cuisine/category | Nonempty trimmed strings, max 200 characters |
| Description | String, max 2,000 characters; empty allowed |
| Prices/minimum order/delivery time | Finite JSON numbers, 0 through Number.MAX_SAFE_INTEGER |
| Restaurant rating | Number from 0 to 5; retained because existing manager edits it |
| Menu discount | Number from 0 to 100 |
| isOpen/isSpicy | JSON booleans; strings are rejected |
| Image | HTTP/HTTPS URL, max 2,048 characters, no embedded credentials |
| Menu images | 1–5 valid URLs; creation needs image or images; update may omit images to retain existing ones |
| Primary menu image | If both image and images are supplied, image matches images[0] |
| Location | Exactly type=Point and coordinates=[longitude, latitude]; ranges ±180 and ±90 |
| Address | Only street/city/state/zipCode; strings up to 300 characters, empty allowed |
| Hours | Weekday keys only; open/close HH:mm pairs, or both empty for a closed day; overnight hours allowed |

Nested objects supplied on restaurant update replace that supplied object; send
all fields you want to retain within it. Unknown or incomplete location objects
are rejected. Full field validation for review submissions and catalogue query
parameters is outside this create/update change.

The manager forms now serialize numeric fields as JSON numbers. Restaurant owner,
menu parent IDs, menu ratings/counts/comments and MongoDB operators cannot be
assigned using management payloads. Mongoose validation/cast failures map to a
generic 400; unexpected create/update failures return a generic 500. Malformed
JSON returns 400 and oversized JSON returns 413 without parser internals.

## Verification and evidence

Recorded results on 2026-09-26: **22/22 automated tests passed**; restaurant
manager production build passed with the pre-existing unused-variable and hook
dependency warnings. The local TypeScript peer setup from V03 was retained.

Run `npm test` in `Services/RestaurantService`. Tests use real HTTP routing/JWTs,
isolated database doubles, direct validator cases and error-response checks. V03
negative cases still run. Valid resource writes still pass. Earlier V03 tests that
expected unknown fields to be ignored now require 400 with zero writes instead.

Run `npm run build` in `Services/RestaurantService/client`. If a fresh dependency
installation selects incompatible TypeScript, see the V03 verification guide's
temporary compatible-peer installation command; permanent lockfile remediation
belongs to V08. No security/lint checks are disabled.

Runtime smoke checks on 2026-09-26 after restarting the updated service:

- MongoDB connection succeeded with the previously verified process-local DNS workaround.
- GET `/api/health`: 200, connected.
- GET `/api/restaurants`: 200, empty list in the configured database.
- Anonymous POST `/api/restaurants` with `{}`: 401.
- POST `/api/restaurants` with malformed JSON: 400, `Invalid JSON body`.
- Existing startup checks reported no menu records needed updating.

These live checks do not prove authenticated database persistence. No authenticated
test data was written to the configured database. Complete the following in a
disposable test database using an approved owner account and its valid JWT.

Start with the valid restaurant/menu payloads from `susara-v03-verification.md`.
For each malformed case, change one field, preserve the rest of the valid payload,
and test both relevant POST and PUT endpoints:

| Change | Before V07 | After V07 |
| --- | --- | --- |
| deliveryTime="30" or price="750" | Could be coerced | 400 |
| Menu price=-10 or discount=150 | No explicit range protection | 400 |
| isOpen="false" | Could be coerced | 400 |
| name={"$ne":null} | ODM/internal-error handling | 400, no internals |
| location coordinates=[181,91] or [80] | No complete request validation | 400 |
| image="javascript:alert(1)" | No protocol allow-list | 400 |
| images contains six URLs | Silently truncated | 400 |
| address contains unexpected owner field | No nested request allow-list | 400 |
| operatingHours.monday.open="25:00" | No time-format validation | 400 |
| owner, _id, menuItems, $set in restaurant payload | V03 ignored these fields | 400 |
| rating, restaurantId, comments in menu payload | Ignored by field destructuring | 400 |
| Update restaurant with only name | Could reset omitted rating to 0 | Existing rating preserved |
| Valid manager-form payload | Accepted | 200/201; values saved correctly |

Before outcomes are source-derived expectations; do not present them as recorded
exploits. Use existing evidence or a separate baseline checkout/test database for
actual before screenshots. Do not undo team fixes on the current branch.

Capture Postman method, URL, payload, response status and safe message (redact
JWTs), plus database state unchanged after rejected writes. Include a valid
create/update and before/after rating-preservation example. Capture the automated
test summary and manager build output. Repeat missing-token and non-owner tests
to show V03 protection remains intact.

## Report-ready explanation

**Vulnerability:** Missing/inconsistent server-side payload validation in restaurant
and menu management operations.

**Root cause:** Reliance on client forms, implicit database casting and incomplete
checks rather than a strict request contract.

**Impact:** Invalid business data, malformed geographic/time values, unexpected
field acceptance and internal-error disclosure to authorized callers.

**Fix:** Strict types, nested allow-lists, required fields, format/range limits,
safe errors and numeric serialization in existing manager forms; preserve V03
authorization and reject assignment of server-controlled fields.

**Verification:** Automated valid/invalid HTTP cases, V03 regression coverage,
validator boundary tests, manager build and runtime smoke checks. Authenticated
live persistence evidence remains a separate manual step.

**Prevention:** Agree API payload contracts during design, validate on the server,
keep persistence fields separate from user-editable fields, and test malformed
inputs and authorization failures in CI.

Suggested commit: `fix(security): validate restaurant request payloads`
