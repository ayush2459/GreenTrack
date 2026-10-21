# GreenTrack Tradeoffs and Current Non-Builds

The project intentionally retains the source repository's scope instead of fabricating functionality to make the interface look complete.

1. **Versioned emission factors and CO₂e calculations:** not implemented in the current backend. A future implementation needs a factor model with source, geography, unit, validity interval and version; reproducible calculation functions; test fixtures; and audit links to selected factor versions.
2. **Granular role-based access control:** current authenticated users use the same broad reviewer workflow. A production rollout should define business roles and enforce each permission in API views as well as the UI.
3. **Direct integrations:** SAP OData, corporate travel APIs and utility provider APIs are not implemented. File ingestion remains the current workflow.
4. **Regulatory report export:** the redesigned interface can export selected record/audit tables as CSV, but a formal signed BRSR report generator is not implemented.
5. **Production deployment hardening:** set production secret keys, `DEBUG=False`, explicit hosts, database credentials, CORS/CSRF origins, token lifecycle policy, HTTPS and appropriate backups/monitoring.

## Why this matters

A polished dashboard should not imply calculations or compliance assurance that the application has not implemented or tested. GreenTrack surfaces record scope, workflow status and traceability while leaving carbon accounting and compliance reporting as clearly defined future work.
