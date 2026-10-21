# GreenTrack Data Model and Design Rationale

The core data path preserves source rows and separates them from normalized activity records. An organization owns data sources. Each upload creates an ingestion run and raw records; accepted rows create emission/activity records. Review decisions capture analyst actions, while audit events record system and user activity.

```text
Organization
  ├── UserProfile / users
  └── DataSource
        └── IngestionRun
              └── RawRecord (source payload and parse errors)
                    └── EmissionRecord (normalized activity + scope/category)
                          └── ReviewDecision
Organization ── AuditEvent
```

## Core entities

- **Organization** — tenant/workspace, slug, timezone and fiscal-year start.
- **UserProfile** — links a Django user to an organization.
- **DataSource** — source type, human-readable name and source-specific JSON configuration.
- **IngestionRun** — upload status, trigger user, original file, row/error counts and timestamps.
- **RawRecord** — original source row as JSON, row reference and parsing error if any.
- **EmissionRecord** — activity value/unit, original value/unit, dates, facility, country, supplier, status, scope and category.
- **ReviewDecision** — action, analyst, note and decision time.
- **AuditEvent** — append-style action record with actor, target and payload.

## Scope/category mapping

- Scope 1: stationary and mobile fuel combustion.
- Scope 2: purchased electricity and purchased heat/steam.
- Scope 3: business travel, purchased goods/services and upstream freight.

Scope is assigned from the record category in the backend model. This makes UI scope labels consistent with the stored classification.

## Important boundary

The current backend stores and reviews activity quantities. It does not maintain versioned emission-factor tables or calculate verified CO₂-equivalent values. Carbon totals should only be added after documented factors, validity dates, geography, unit normalization, accounting boundary and calculation tests are implemented.
