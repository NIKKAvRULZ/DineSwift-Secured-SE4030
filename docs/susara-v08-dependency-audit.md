# Susara — V08 dependency audit and remediation

## Scope and method

The audit covers packages changed for Susara's V03, V06 and V07 work:
UserService, ApiGateWay, RestaurantService, RestaurantService/client,
OrderService's authentication compatibility layer, and the main Frontend.

Audits were run on 2026-09-26 with the npm advisory database. Remediation used
normal semver-compatible installs and `npm audit fix`. `--force` was not used.
Lockfiles are committed so CI and reviewers resolve the same dependency graph.
The main Frontend's ignored lockfile was restored to version control.

## Results

| Package | Initial audit | Final audit | Decision |
| --- | ---: | ---: | --- |
| UserService | 10 (2 moderate, 7 high, 1 critical) | 0 | Removed unused native `bcrypt`; the code already uses `bcryptjs`. Updated the lockfile. |
| ApiGateWay | 7 (4 moderate, 3 high) | 0 | Updated patched Express/proxy transitive releases within declared ranges. |
| RestaurantService | 10 (4 moderate, 6 high) | 0 | Updated patched Express, Mongoose and transitive releases within declared ranges. |
| Main Frontend | Could not audit without a lockfile | 0 | Generated and committed a lockfile, then applied compatible fixes. |
| Restaurant manager | 63 (14 low, 16 moderate, 30 high, 3 critical) | 30 (9 low, 7 moderate, 14 high) | Updated direct Axios to 1.20.0 and applied compatible transitive fixes. |
| OrderService | 2 moderate | 2 moderate | Retained the existing `kafka-node` chain; npm proposes a breaking downgrade to `kafka-node@1.0.6`. |

The manager's 30 remaining findings are transitive dependencies of the deprecated
Create React App `react-scripts@5.0.1` toolchain. npm's proposed automatic fixes
include replacing it with the invalid/breaking `react-scripts@0.0.0` and major
React Router migration. Applying those changes with `--force` would risk breaking
the application and is outside a safe service-level patch. The direct runtime HTTP
client was updated. A future planned change should migrate this client from CRA to
the same maintained Vite toolchain used by the main Frontend, followed by another
audit and regression test.

OrderService's remaining advisory is in `kafka-node → uuid`. The affected UUID
buffer APIs are not called by Susara's authentication compatibility code. The
package is owned by the OrderService workstream, and the proposed automatic change
is breaking. Its owner should replace the unmaintained Kafka client under a
separate migration with integration tests.

## Verification

After dependency changes:

- UserService integration tests: **10 passed**.
- RestaurantService security tests: **22 passed**.
- Main Frontend production build: **passed**, with the existing large-chunk warning.
- Restaurant manager production build: **passed**, with existing lint warnings.
- UserService, ApiGateWay, RestaurantService and main Frontend audits: **0 findings**.
- `npm audit fix --force` was never run.

To reproduce the evidence, run `npm audit` in each directory listed in the results
table, then run `npm test` in UserService and RestaurantService and `npm run build`
in both frontend directories. Capture the command, package path, vulnerability
totals and successful test/build summaries. Do not include `.env` values, cookies,
tokens or registry credentials in screenshots.

## Report-ready explanation

**Vulnerability:** V08, OWASP A06 Vulnerable and Outdated Components.

**Root cause:** Stale and inconsistent lockfiles resolved known-vulnerable direct
and transitive packages. The main Frontend had no committed lockfile, preventing a
reproducible audit.

**Security impact:** Affected dependency chains included denial of service,
prototype pollution, request/proxy handling and archive-processing weaknesses.
Actual exploitability depends on whether the application exposes the affected API.

**Fix:** Commit reproducible lockfiles, remove the unused vulnerable native bcrypt
chain, update direct Axios, and resolve patched versions allowed by current semver
ranges. Record residual toolchain risks instead of forcing breaking replacements.

**Verification:** Compare before/after npm audit totals and run the service security
tests and both production builds against the updated dependency graph.

**Prevention:** Commit lockfiles, use `npm ci` in CI, audit each service regularly,
review direct and transitive paths, and schedule replacement of deprecated
toolchains rather than relying on forced automatic upgrades.

Suggested commit: `fix(deps): remediate vulnerabilities in Susara service scope`
