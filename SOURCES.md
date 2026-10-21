# Data Source and Provenance Notes

The existing project parser formats are retained:

- **SAP flat-file TSV:** SAP FI-style ledger export. Column names may vary by system language and require mapping. A G/L-to-category map is configuration, not a universal accounting truth.
- **Utility CSV:** consumption (kWh), meter/site name and billing period. Billing windows may cross calendar months.
- **Corporate travel CSV:** flight, hotel and ground-transport categories. Where a supported pair of airport codes is present, the existing parser estimates great-circle distance; ground travel may use a supplied distance or a rough spend fallback. Such fallback values should be flagged for human review.

These parsers create activity quantities, not verified carbon figures. A responsible production implementation needs reviewed emission-factor sources, factor version dates, transparent calculation rules and independent test cases before producing regulatory-use CO₂e reports. Demo data is illustrative only.
