# Signup measurement

The existing GA4 property is `G-7P327WF7Y8`. Account creation now queues
`sign_up` plus either `candidate_signup` or `employer_signup`, with `method`
(`email` or `google`) and `account_type`. Events use beacon transport so the
request survives immediate post-signup navigation. Emails, names, passwords, tokens,
and internal account IDs are not included in these events.

Events fire after a successful creation response, never on form submission,
OTP sending/verification alone, or an existing user's login. Google login can
create an account even from the login page; the backend returns `isNewUser`
to distinguish this from a returning user. Missing creation confirmation
fails closed. Repeated responses for an account are suppressed in the tab.

## Deployment and Google Ads setup

1. Deploy `backend/server.js` to the API service first. Its registration and
   Google login responses now include `isNewUser`, `role`, and `userId`.
   Confirm this is the code used by the Railway API before deploying.
2. Build and deploy the frontend. This does not create Google Ads conversion
   actions or publish the Google Ads asset draft.
3. In the existing GA4 property, verify `candidate_signup` and
   `employer_signup` in Realtime/DebugView using designated test accounts.
   Mark these two events as key events; do not also import `sign_up`, which
   would count the same registrations again.
4. Link the correct Google Ads account to this GA4 property, import the two
   key events as separate signup conversions, choose One counting, and use
   the appropriate goal in candidate versus employer campaigns. Keep page
   views and YouTube activity out of signup campaign primary goals.
5. Verify receipt before changing spend. Browser-side collection can be
   blocked; account records remain the source of truth for registrations.

## Exclude owner testing

Before testing, open the signup page with `?ml_test=1`, for example
`/signup?ml_test=1` or `/employer/register?ml_test=1`. Successful registrations
in that tab will not send signup events. Exclusion persists through later
navigation in that tab. Use `?ml_test=0` to explicitly re-enable collection.
Local and preview hosts are excluded automatically. Storage/tag failures
cannot prevent registration and fail closed for analytics.

The existing 19 owner-created test accounts are historical data; this change
does not relabel or delete them. For a collection verification test, use a
dedicated test account in GA4 debug mode and exclude debug traffic from
production reports using GA4's developer-traffic filter. Do not use excluded
tests to validate Google Ads bidding conversions.

## Checks

`node --test tests/signupTracking.test.js`

`node --check backend/server.js`

`npm run build`
