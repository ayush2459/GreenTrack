
import json
import urllib.request
from collections import Counter
from datetime import date
from decimal import Decimal

from decouple import config
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import EmissionRecord, AuditEvent, IngestionRun


def _org_for(user):
    try:
        return user.profile.organization
    except Exception:
        return None


def _plain(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, date):
        return value.isoformat()
    return value


def _build_evidence(org):
    qs = (
        EmissionRecord.objects
        .filter(organization=org)
        .select_related("raw_record")
        .order_by("-period_start")
    )

    total = qs.count()
    statuses = Counter(qs.values_list("status", flat=True))
    scopes = Counter(qs.values_list("scope", flat=True))
    categories = Counter(qs.values_list("category", flat=True))
    units = Counter(qs.values_list("activity_unit", flat=True))

    records = []
    for r in qs[:500]:
        records.append({
            "id": str(r.id),
            "scope": r.scope,
            "category": r.get_category_display(),
            "activity_value": _plain(r.activity_value),
            "activity_unit": r.activity_unit,
            "period_start": _plain(r.period_start),
            "period_end": _plain(r.period_end),
            "facility": r.facility,
            "country_code": r.country_code,
            "supplier": r.supplier,
            "status": r.status,
            "flag_reason": r.flag_reason,
            "description": r.description,
            "manually_edited": r.is_manually_edited,
        })

    recent_audits = list(
        AuditEvent.objects
        .filter(organization=org)
        .order_by("-created_at")
        .values(
            "event_type",
            "target_type",
            "payload",
            "created_at",
        )[:50]
    )

    for item in recent_audits:
        item["created_at"] = (
            item["created_at"].isoformat()
            if item["created_at"]
            else None
        )

    runs_qs = IngestionRun.objects.filter(
        data_source__organization=org
    )

    runs = list(
        runs_qs.order_by("-started_at").values(
            "status",
            "row_count",
            "error_count",
            "notes",
            "started_at",
        )[:30]
    )

    for item in runs:
        item["started_at"] = (
            item["started_at"].isoformat()
            if item["started_at"]
            else None
        )

    return {
        "organization": org.name,
        "record_summary": {
            "total_records": total,
            "statuses": dict(statuses),
            "scopes_record_counts": {
                f"Scope {k}": v
                for k, v in sorted(scopes.items())
            },
            "categories_record_counts": dict(categories),
            "activity_units_record_counts": dict(units),
            "records_sent_to_model": len(records),
            "records_in_database": total,
        },
        "records": records,
        "recent_audit_events": recent_audits,
        "ingestion_summary": {
            "total_runs": runs_qs.count(),
            "status_counts": dict(
                Counter(runs_qs.values_list("status", flat=True))
            ),
            "total_rows_reported": sum(
                (r.row_count or 0) for r in runs_qs
            ),
            "total_errors_reported": sum(
                (r.error_count or 0) for r in runs_qs
            ),
            "recent_runs": runs,
        },
        "limitations": [
            "Activity values use different units and must not be added together.",
            "This dataset does not contain validated emission factors or calculated tCO2e values.",
            "Flags indicate review needs, not proof that a record is incorrect.",
            "Only the 500 most recent records are included in model context when the database has more; summary counts cover all records.",
        ],
    }


def _local_insights(evidence):
    summary = evidence["record_summary"]
    statuses = summary["statuses"]

    flagged = statuses.get("FLAGGED", 0)
    pending = statuses.get("PENDING", 0)
    rejected = statuses.get("REJECTED", 0)
    total = summary["total_records"]
    errors = evidence["ingestion_summary"]["total_errors_reported"]

    recommendations = []

    if flagged:
        recommendations.append({
            "priority": "High",
            "title": "Resolve flagged activity records",
            "evidence": f"{flagged} record(s) are flagged for follow-up.",
            "action": (
                "Review each flag reason and supporting source evidence, "
                "then document the decision in the audit trail."
            ),
        })

    if pending:
        recommendations.append({
            "priority": "High",
            "title": "Clear the pending review queue",
            "evidence": f"{pending} record(s) remain pending.",
            "action": (
                "Assign a reviewer and approve, reject, or flag each record "
                "based on source documentation."
            ),
        })

    if rejected:
        recommendations.append({
            "priority": "Medium",
            "title": "Check rejected records with data owners",
            "evidence": f"{rejected} record(s) are rejected.",
            "action": (
                "Confirm whether the source should be corrected and "
                "re-ingested; preserve the original decision trail."
            ),
        })

    if errors:
        recommendations.append({
            "priority": "Medium",
            "title": "Investigate ingestion errors",
            "evidence": (
                f"{errors} ingestion error(s) are reported "
                "across recorded runs."
            ),
            "action": (
                "Inspect ingestion-run notes and source rows, correct "
                "mappings or units, and rerun validation."
            ),
        })

    if not recommendations:
        recommendations.append({
            "priority": "Medium",
            "title": "Maintain evidence quality checks",
            "evidence": (
                f"{total} activity record(s) are currently available "
                "and no pending or flagged records were counted."
            ),
            "action": (
                "Continue periodic sampling of source files, units, "
                "reporting periods, and review decisions."
            ),
        })

    insights = [
        {
            "title": "Review status",
            "detail": (
                f"{statuses.get('APPROVED', 0) + statuses.get('LOCKED', 0)} "
                f"approved/locked, {pending} pending, {flagged} flagged, "
                f"and {rejected} rejected record(s)."
            ),
        },
        {
            "title": "Scope distribution",
            "detail": ", ".join(
                f"{k}: {v} record(s)"
                for k, v in summary["scopes_record_counts"].items()
            ) or "No scope records found.",
        },
        {
            "title": "Ingestion quality",
            "detail": (
                f"{evidence['ingestion_summary']['total_runs']} "
                f"ingestion run(s); "
                f"{evidence['ingestion_summary']['total_errors_reported']} "
                "reported row error(s)."
            ),
        },
    ]

    return {
        "summary": (
            "Rule-based baseline insights generated from the current "
            "organization workspace. Model-generated analysis is "
            "unavailable for this request."
        ),
        "insights": insights,
        "recommendations": recommendations,
        "data_quality_notes": evidence["limitations"],
        "provider": "local-rules",
        "generated_at": date.today().isoformat(),
    }


def _ask_groq(evidence):
    api_key = config("GROQ_API_KEY", default="").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured.")

    model = config(
        "GROQ_MODEL",
        default="openai/gpt-oss-20b",
    )

    body = {
        "model": model,
        "temperature": 0.2,
        "max_completion_tokens": 1200,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are GreenTrack ESG data quality analyst. Return "
                    "only valid JSON with keys summary (string), insights "
                    "(array of {title,detail}), recommendations "
                    "(array of {priority,title,evidence,action}), and "
                    "data_quality_notes (array of strings). Base every "
                    "claim on supplied data. Do not add activity values "
                    "across unlike units. Do not invent emissions, tCO2e, "
                    "factors, trends, targets, or compliance conclusions. "
                    "A FLAGGED record is not necessarily erroneous. "
                    "Recommend evidence-backed actions. Mention when "
                    "historical data is insufficient."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Analyze this organization workspace data across "
                    "activity records, ingestion, and audit trail. Produce "
                    "concise actionable insights. Evidence JSON:\n"
                    + json.dumps(evidence, default=str)[:90000]
                ),
            },
        ],
        "response_format": {"type": "json_object"},
    }

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=12) as response:
        data = json.loads(response.read().decode("utf-8"))

    content = data["choices"][0]["message"]["content"]
    if not content:
        raise RuntimeError("Groq returned an empty response.")

    parsed = json.loads(content)
    parsed["provider"] = f"groq:{model}"
    parsed["generated_at"] = date.today().isoformat()
    return parsed


def _ask_ollama(evidence):
    base = config(
        "OLLAMA_BASE_URL",
        default="http://localhost:11434",
    ).rstrip("/")

    model = config("OLLAMA_MODEL", default="llama3.2:3b")

    body = {
        "model": model,
        "stream": False,
        "format": "json",
        "options": {
            "num_predict": 700,
            "temperature": 0.2,
        },
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are GreenTrack ESG data quality analyst. Return "
                    "only JSON with keys summary, insights [{title,detail}], "
                    "recommendations [{priority,title,evidence,action}], "
                    "and data_quality_notes [string]. Ground every claim "
                    "in evidence. Do not invent emissions or tCO2e. Do not "
                    "add unlike units. Flags need review and are not proof "
                    "of error."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Analyze activity records, ingestion runs, and audit "
                    "events. Give clear, concise, actionable recommendations. "
                    "Evidence JSON:\n"
                    + json.dumps(evidence, default=str)[:90000]
                ),
            },
        ],
    }

    req = urllib.request.Request(
        base + "/api/chat",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=35) as response:
        data = json.loads(response.read().decode("utf-8"))

    content = data.get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("Ollama returned an empty response.")

    parsed = json.loads(content)
    parsed["provider"] = f"ollama:{model}"
    parsed["generated_at"] = date.today().isoformat()
    return parsed


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def recommendations(request):
    org = _org_for(request.user)
    if not org:
        return Response(
            {"error": "Your user account is not linked to an organization."},
            status=400,
        )

    provider = str(request.data.get("provider", "auto")).lower()

    if provider not in ("auto", "groq", "ollama"):
        return Response(
            {"error": "Provider must be auto, groq, or ollama."},
            status=400,
        )

    evidence = _build_evidence(org)
    errors = []

    candidates = (
        ["groq", "ollama"]
        if provider == "auto"
        else [provider]
    )

    for candidate in candidates:
        try:
            if candidate == "groq":
                result = _ask_groq(evidence)
            else:
                result = _ask_ollama(evidence)

            result["data_coverage"] = {
                "organization": org.name,
                "total_records": evidence["record_summary"]["total_records"],
                "records_in_model_context": (
                    evidence["record_summary"]["records_sent_to_model"]
                ),
                "audit_events_in_context": len(
                    evidence["recent_audit_events"]
                ),
                "ingestion_runs_in_context": len(
                    evidence["ingestion_summary"]["recent_runs"]
                ),
            }
            return Response(result)

        except Exception as exc:
            errors.append(f"{candidate}: {str(exc)[:240]}")

    result = _local_insights(evidence)
    result["provider_errors"] = errors
    result["data_coverage"] = {
        "organization": org.name,
        "total_records": evidence["record_summary"]["total_records"],
        "records_in_model_context": (
            evidence["record_summary"]["records_sent_to_model"]
        ),
        "audit_events_in_context": len(evidence["recent_audit_events"]),
        "ingestion_runs_in_context": len(
            evidence["ingestion_summary"]["recent_runs"]
        ),
    }

    return Response(result)
