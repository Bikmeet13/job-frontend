# MarketLence business calling

Phase 1 extends the existing People CRM and `marketlence_employees`. It does
not create a separate CRM. Calling is disabled by default and never reports a
successful call unless the provider accepts it.

## Provider onboarding

1. Obtain a licensed Exotel account, approved ExoPhone, API credentials and
   the correct regional API subdomain.
2. Set the variables in `backend/.env.example` in the server secret store.
   `TELEPHONY_DATA_KEY` must be a long random secret and must remain stable;
   rotating it requires a controlled re-encryption migration.
3. Configure the provider callback URL shown by the adapter and keep
   `TELEPHONY_WEBHOOK_SECRET` private. The endpoint rejects missing or invalid
   tokens and deduplicates provider event IDs.
4. Obtain compliance approval for calling hours, contact-consent wording,
   recording notice and retention. The technical controls do not themselves
   guarantee TRAI, DPDP, SEBI or other regulatory compliance.
5. Leave `TELEPHONY_RECORDING_ENABLED=false` until recording notice and
   consent procedures are approved. A recording is requested only when both
   server and CRM settings enable it and the client has recorded consent.
6. Link the administrator's platform email to the matching People CRM work
   email. The schema links existing admin/superadmin accounts automatically.
7. Test configuration from People CRM → Business calling, then enable calling
   in both the server environment and administrator settings.

Recordings use Exotel's short-lived pre-signed playback URL and are never
stored as permanent public URLs. Access requires a capability and is audited.
Downloads are disabled in the application.

## Deliberately out of scope

Incoming IVR, queues, transfers, quality scoring, campaigns, additional
providers, predictive calling, bulk auto-dialling and AI voice agents require
separate Phase 2 approval.
