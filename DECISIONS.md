# GreenTrack Decisions and Assumptions

## Ingestion mode

CSV/flat-file upload is retained for SAP FI-style TSV exports, electricity utility CSVs and corporate travel CSVs. Live SAP, travel-platform and utility API connectors require client credentials, network access and provider-specific setup; they are not claimed as implemented.

## Source normalization

Source-specific column mappings and lookup tables live in `DataSource.config`. Parsing preserves a raw copy and creates a normalized activity row, allowing the analyst to inspect and review records. Unreadable rows should be visible as parse errors rather than silently treated as valid emissions.

## Review semantics

`APPROVED` and `LOCKED` remain separate states: approval means a person reviewed a row; locking is the explicit read-only state for an audit boundary. Flagging is intended to signal review rather than prove a source record is wrong.

## Authentication and tenancy

Django token authentication is kept for the prototype. Queries are scoped through the user's profile organization. The API must enforce permissions; hiding controls in the UI alone is not sufficient. Production identity integration, invitations and role hierarchy are future work.

## Emission factors

Factor selection must be explicit, versioned and geographically appropriate. GreenTrack currently does not calculate tCO₂e. It intentionally avoids presenting activity units as carbon totals.

## UI design

The redesign uses a forest-green identity with a pale, high-contrast analytics workspace, clear action hierarchy, consistent status tags, visible empty/loading states and responsive navigation. The existing API endpoints remain the integration contract.
