import json
import os
import re
from pathlib import Path
from typing import Any

from anthropic import Anthropic
from dotenv import dotenv_values

from .models import DrugInteractionCache, InteractionSeverity, InteractionStatus


SENIOR_PHARMACIST_SYSTEM_PROMPT = """
You are a senior clinical pharmacist specializing in medication safety and
drug-drug interaction review. You must analyze only the drugs provided by the
pharmacy prescription entry system. Use conservative clinical judgment and
pharmacy terminology. Return deterministic structured JSON only.
""".strip()

SINGLE_DRUG_ANALYSIS = """
Severity: None
Clinical mechanisms: No drug-drug interaction assessment was required because
fewer than two medications were entered.
Recommended pharmacist actions: Continue routine review for allergies,
contraindications, renal/hepatic dose adjustment, duplication of therapy,
pregnancy/lactation status, and patient-specific monitoring needs.
""".strip()


def get_anthropic_setting(name: str) -> str:
    value = os.getenv(name, "").strip()
    if value:
        return value.lstrip("\ufeff")

    env_path = Path(__file__).resolve().parents[2] / ".env"
    env_values = dotenv_values(env_path)
    return (env_values.get(name) or env_values.get(f"\ufeff{name}") or "").strip()


def normalize_drug_combination(drugs: list[dict[str, str]]) -> list[str]:
    normalized = []
    for drug in drugs:
        name = " ".join(drug["name"].strip().lower().split())
        dosage = " ".join(drug["dosage"].strip().lower().split())
        normalized.append(f"{name}({dosage})")
    return sorted(normalized)


def build_normalized_key(drugs: list[dict[str, str]]) -> str:
    return "+".join(normalize_drug_combination(drugs))


def infer_severity(interaction_data: str) -> str:
    first_line = interaction_data.splitlines()[0] if interaction_data else ""
    source = f"{first_line} {interaction_data[:500]}".lower()
    if re.search(r"\bsevere\b|\bmajor\b|\bcontraindicated\b|\bavoid combination\b", source):
        return InteractionSeverity.SEVERE
    if re.search(r"\bmoderate\b|\bmonitor closely\b|\bdose adjustment\b|\bcaution\b", source):
        return InteractionSeverity.MODERATE
    if re.search(r"\bmild\b|\bminor\b|\blow clinical significance\b", source):
        return InteractionSeverity.MILD
    return InteractionSeverity.NONE


def build_clinical_prompt(drugs: list[dict[str, str]]) -> str:
    drug_lines = "\n".join(
        f"- {drug['name']} {drug['dosage']}".strip() for drug in drugs
    )
    return f"""
Review this prescription for drug-drug interactions.

Medication regimen, including dosage:
{drug_lines}

Return only valid JSON with exactly this schema:
{{
  "severity": "None | Mild | Moderate | Severe",
  "interacting_pairs": ["Drug A + Drug B"],
  "clinical_mechanisms": ["Specific pharmacokinetic or pharmacodynamic mechanism"],
  "clinical_risks": ["Patient safety risk and clinical significance"],
  "recommended_pharmacist_actions": ["Specific monitoring, counseling, dose adjustment, avoidance, or prescriber-contact action"]
}}

Rules:
- Severity must be exactly one of None, Mild, Moderate, or Severe.
- Mention dosage-sensitive risk when dosage changes clinical significance.
- Do not include markdown.
- Do not include prose outside JSON.
- Do not invent additional drugs or diagnoses.
""".strip()


def extract_json_payload(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        return json.loads(match.group(0))


def normalize_severity(value: str) -> str:
    severity = str(value).strip().title()
    if severity in InteractionSeverity.values:
        return severity
    return InteractionSeverity.NONE


def format_structured_interaction(data: dict[str, Any]) -> str:
    def lines_for(label: str, values: Any) -> list[str]:
        if not values:
            return [f"{label}: None identified."]
        if isinstance(values, str):
            values = [values]
        return [f"{label}:"] + [f"- {value}" for value in values]

    sections = [f"Severity: {normalize_severity(data.get('severity', 'None'))}"]
    sections.extend(lines_for("Interacting pairs", data.get("interacting_pairs")))
    sections.extend(lines_for("Clinical mechanisms", data.get("clinical_mechanisms")))
    sections.extend(lines_for("Clinical risks", data.get("clinical_risks")))
    sections.extend(
        lines_for(
            "Recommended pharmacist actions",
            data.get("recommended_pharmacist_actions"),
        )
    )
    return "\n".join(sections)


def check_drug_interactions(drugs: list[dict[str, str]]) -> dict[str, Any]:
    if len(drugs) <= 1:
        return {
            "interaction_data": SINGLE_DRUG_ANALYSIS,
            "severity": InteractionSeverity.NONE,
            "interaction_status": InteractionStatus.SKIPPED,
            "used_cache": False,
            "api_error": "",
        }

    normalized_key = build_normalized_key(drugs)
    cached = DrugInteractionCache.objects.filter(normalized_key=normalized_key).first()
    if cached:
        return {
            "interaction_data": cached.interaction_data,
            "severity": cached.severity,
            "interaction_status": InteractionStatus.COMPLETED,
            "used_cache": True,
            "api_error": "",
        }

    api_key = get_anthropic_setting("ANTHROPIC_API_KEY")
    if not api_key:
        return {
            "interaction_data": (
                "Interaction analysis could not be completed because the Claude API "
                "key is not configured. The prescription can still be saved, but a "
                "clinical interaction review should be repeated before dispensing."
            ),
            "severity": InteractionSeverity.NONE,
            "interaction_status": InteractionStatus.ERROR,
            "used_cache": False,
            "api_error": "ANTHROPIC_API_KEY is missing.",
        }

    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=get_anthropic_setting("ANTHROPIC_MODEL") or "claude-sonnet-4-5",
            max_tokens=1000,
            temperature=0.0,
            system=SENIOR_PHARMACIST_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_clinical_prompt(drugs)}],
        )
        raw_response = "\n".join(
            block.text for block in response.content if getattr(block, "text", None)
        ).strip()
        structured = extract_json_payload(raw_response)
        severity = normalize_severity(structured.get("severity", "None"))
        interaction_data = format_structured_interaction(structured)
        DrugInteractionCache.objects.create(
            normalized_key=normalized_key,
            interaction_data=interaction_data,
            severity=severity,
        )
        return {
            "interaction_data": interaction_data,
            "severity": severity,
            "interaction_status": InteractionStatus.COMPLETED,
            "used_cache": False,
            "api_error": "",
        }
    except Exception as exc:
        return {
            "interaction_data": (
                "Interaction analysis is temporarily unavailable. The prescription "
                "was saved, but a pharmacist should repeat the interaction check "
                "before dispensing."
            ),
            "severity": InteractionSeverity.NONE,
            "interaction_status": InteractionStatus.ERROR,
            "used_cache": False,
            "api_error": str(exc),
        }
