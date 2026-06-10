import os
import re
from pathlib import Path
from typing import Any

from anthropic import Anthropic
from dotenv import dotenv_values

from .models import DrugInteractionCache, InteractionSeverity


SINGLE_DRUG_ANALYSIS = (
    "No drug-drug interaction check was required because only one medication was "
    "entered. Continue routine clinical review for allergies, contraindications, "
    "renal/hepatic dose adjustment, pregnancy/lactation status, duplication of "
    "therapy, and patient-specific monitoring needs."
)


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
        normalized.append(f"{name} {dosage}".strip())
    return sorted(normalized)


def build_normalized_key(drugs: list[dict[str, str]]) -> str:
    return ", ".join(normalize_drug_combination(drugs))


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
You are a licensed clinical pharmacist performing a drug-drug interaction review
for a prescription entry workflow.

Medication regimen:
{drug_lines}

Analyze only drug-drug interactions between the listed medications. Use clinical
pharmacy terminology and return a concise, display-ready analysis with these
labeled sections:

Severity: choose exactly one of Mild, Moderate, or Severe.
Interacting pairs: list the relevant medication pairs, or state none identified.
Mechanism: describe the pharmacokinetic or pharmacodynamic mechanism, including
CYP/P-gp effects, additive toxicity, QT prolongation, bleeding risk, CNS
depression, glycemic effects, renal effects, or electrolyte effects when relevant.
Clinical significance: explain likely patient risk and whether therapy should be
continued, monitored, adjusted, or avoided.
Monitoring and counseling: give practical pharmacist monitoring parameters and
patient counseling notes.

Do not include raw JSON. Do not diagnose. Do not invent unrelated medications.
Keep the response understandable for a pharmacist reviewing the prescription.
""".strip()


def check_drug_interactions(drugs: list[dict[str, str]]) -> dict[str, Any]:
    if len(drugs) == 1:
        return {
            "interaction_data": SINGLE_DRUG_ANALYSIS,
            "severity": InteractionSeverity.NONE,
            "used_cache": False,
            "api_error": "",
        }

    normalized_key = build_normalized_key(drugs)
    cached = DrugInteractionCache.objects.filter(normalized_key=normalized_key).first()
    if cached:
        return {
            "interaction_data": cached.interaction_data,
            "severity": cached.severity,
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
            "used_cache": False,
            "api_error": "ANTHROPIC_API_KEY is missing.",
        }

    try:
        client = Anthropic(api_key=api_key)
        response = client.messages.create(
            model=get_anthropic_setting("ANTHROPIC_MODEL") or "claude-sonnet-4-5",
            max_tokens=1000,
            messages=[{"role": "user", "content": build_clinical_prompt(drugs)}],
        )
        interaction_data = "\n".join(
            block.text for block in response.content if getattr(block, "text", None)
        ).strip()
        severity = infer_severity(interaction_data)
        DrugInteractionCache.objects.create(
            normalized_key=normalized_key,
            interaction_data=interaction_data,
            severity=severity,
        )
        return {
            "interaction_data": interaction_data,
            "severity": severity,
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
            "used_cache": False,
            "api_error": str(exc),
        }
