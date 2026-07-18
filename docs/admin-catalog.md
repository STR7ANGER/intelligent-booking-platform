# Organization catalog and RBAC

Organizations are tenant boundaries. Resources and providers may reference only locations within their organization; repository checks and compound indexes enforce isolation. Location time zones must be valid IANA identifiers.

The bootstrap admin surface requires a separate 32-character API key compared in constant time. Unauthorized requests are rejected before body parsing. Production should place this internal surface behind an identity-aware gateway and rotate the key. Telemetry excludes the credential, address, and provider email.
