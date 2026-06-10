"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Severity = "None" | "Mild" | "Moderate" | "Severe";
type InteractionStatus = "Skipped" | "Completed" | "Error";

type DrugRow = {
  name: string;
  dosage: string;
};

type PrescriptionDetail = {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  drugs: Array<{ id: number; name: string; dosage: string }>;
  drug_count: number;
  interaction_result?: string;
  interaction_summary?: string;
  severity: Severity;
  interaction_status: InteractionStatus;
  api_error: string;
  used_cache: boolean;
};

type ParsedInteraction = {
  severity: string;
  pairs: string[];
  mechanisms: string[];
  risks: string[];
  actions: string[];
};

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const emptyDrug = (): DrugRow => ({ name: "", dosage: "" });

const severityClass: Record<Severity, string> = {
  None: "border-slate-300 bg-slate-100 text-slate-700",
  Mild: "border-yellow-300 bg-yellow-50 text-yellow-900",
  Moderate: "border-orange-300 bg-orange-50 text-orange-900",
  Severe: "border-red-300 bg-red-50 text-red-800",
};

const severityPanelClass: Record<Severity, string> = {
  None: "border-l-slate-400 bg-slate-50/70",
  Mild: "border-l-yellow-400 bg-yellow-50/60",
  Moderate: "border-l-orange-500 bg-orange-50/60",
  Severe: "border-l-red-600 bg-red-50/60",
};

const recommendationClass: Record<Severity, string> = {
  None: "border-slate-200 bg-slate-50 text-slate-900",
  Mild: "border-yellow-300 bg-yellow-50 text-yellow-950",
  Moderate: "border-orange-300 bg-orange-50 text-orange-950",
  Severe: "border-red-300 bg-red-50 text-red-950",
};

function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex min-w-24 items-center justify-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${severityClass[severity]}`}>
      {severity}
    </span>
  );
}

function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />;
}

function PageSwitch() {
  return (
    <nav className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center" aria-label="Prescription workflow">
      <span className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-center text-sm font-bold text-teal-800">
        New Prescription
      </span>
      <Link href="/prescriptions" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
        Prescription History
      </Link>
    </nav>
  );
}

function interactionText(prescription: PrescriptionDetail) {
  return prescription.interaction_result ?? prescription.interaction_summary ?? "";
}

function cleanLine(line: string) {
  return line.replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function parseInteraction(text: string, fallbackSeverity: Severity): ParsedInteraction {
  const parsed: ParsedInteraction = {
    severity: fallbackSeverity,
    pairs: [],
    mechanisms: [],
    risks: [],
    actions: [],
  };
  let section: "pairs" | "mechanisms" | "risks" | "actions" | null = null;

  text.split("\n").map(cleanLine).filter(Boolean).forEach((line) => {
    const [label, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    const key = label.toLowerCase();

    if (key === "severity") {
      parsed.severity = value || fallbackSeverity;
      section = null;
      return;
    }
    if (key === "interacting pairs") {
      section = "pairs";
      if (value && value !== "None identified.") parsed.pairs.push(value);
      return;
    }
    if (key === "clinical mechanisms") {
      section = "mechanisms";
      if (value && value !== "None identified.") parsed.mechanisms.push(value);
      return;
    }
    if (key === "clinical risks") {
      section = "risks";
      if (value && value !== "None identified.") parsed.risks.push(value);
      return;
    }
    if (key === "recommended pharmacist actions") {
      section = "actions";
      if (value && value !== "None identified.") parsed.actions.push(value);
      return;
    }
    if (section) {
      parsed[section].push(line);
    } else {
      parsed.risks.push(line);
    }
  });

  return parsed;
}

async function getApiErrorMessage(response: Response) {
  const fallback = `Request failed with ${response.status} ${response.statusText}.`;
  const text = await response.text().catch(() => "");
  if (!text) {
    return fallback;
  }

  try {
    const payload = JSON.parse(text);
    if (payload.detail) {
      return payload.detail;
    }
    if (payload.api_error) {
      return payload.api_error;
    }
    return Object.entries(payload)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" | ");
  } catch {
    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  }
}

function InteractionText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-slate-800">
      {text.split("\n").map(cleanLine).filter(Boolean).map((line, index) => {
        const isHeading = line.endsWith(":") || /^(Severity|Interacting pairs|Clinical mechanisms|Clinical risks|Recommended pharmacist actions):/.test(line);
        if (isHeading) {
          return <p key={index} className="font-bold text-slate-950">{line}</p>;
        }
        return <p key={index} className="pl-4 before:mr-2 before:content-['•']">{line}</p>;
      })}
    </div>
  );
}

function InteractionAnalysisCard({ prescription }: { prescription: PrescriptionDetail }) {
  const text = interactionText(prescription);
  const parsed = parseInteraction(text, prescription.severity);
  const primaryPair =
    parsed.pairs[0] ||
    prescription.drugs.map((drug) => drug.name).join(" + ") ||
    "No interaction pair";
  const summary =
    parsed.risks[0] ||
    parsed.mechanisms[0] ||
    text.split("\n").map(cleanLine).find(Boolean) ||
    "No interaction narrative available.";
  const mechanism = parsed.mechanisms.join(" ") || "No specific drug-drug mechanism identified.";
  const action = parsed.actions.join(" ") || "Continue routine pharmacist review before dispensing.";

  return (
    <article className={`rounded-2xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm sm:p-6 ${severityPanelClass[prescription.severity]}`}>
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Interaction Analysis Result</h2>
          <p className="text-sm text-slate-600">
            Patient: <span className="font-bold">{prescription.patient_name}</span> | Doctor: <span className="font-bold">{prescription.doctor_name}</span>
          </p>
        </div>
        <SeverityBadge severity={prescription.severity} />
      </div>

      {prescription.interaction_status === "Error" && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          Interaction check failed, but this prescription was saved. Please retry review before dispensing.
        </div>
      )}

      <p className="mb-5 text-base leading-7 text-slate-900 sm:text-lg">{summary}</p>

      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
        Interactions Identified ({parsed.pairs.length || (prescription.severity === "None" ? 0 : 1)})
      </div>

      <section className="rounded-xl bg-white/70 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span aria-hidden="true">⚠</span>
          <h3 className="text-base font-bold text-slate-950">{primaryPair}</h3>
          <SeverityBadge severity={prescription.severity} />
        </div>
        <p className="text-sm leading-6 text-slate-700">
          <span className="font-bold text-slate-800">Mechanism:</span> {mechanism}
        </p>
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm leading-6 shadow-sm ${recommendationClass[prescription.severity]}`}>
          <span className="font-bold">Recommended Action:</span> {action}
        </div>
        {prescription.used_cache && (
          <p className="mt-3 text-xs font-bold uppercase text-teal-700">Served from cached interaction result</p>
        )}
      </section>
    </article>
  );
}

export default function PrescriptionEntryPage() {
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [drugs, setDrugs] = useState<DrugRow[]>([emptyDrug()]);
  const [result, setResult] = useState<PrescriptionDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateDrug(index: number, field: keyof DrugRow, value: string) {
    setDrugs((current) => current.map((drug, drugIndex) => drugIndex === index ? { ...drug, [field]: value } : drug));
  }

  function removeDrug(index: number) {
    setDrugs((current) => current.filter((_, drugIndex) => drugIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!patientName.trim() || !doctorName.trim() || !date) {
      setError("Patient name, doctor name, and date are required.");
      return;
    }

    const cleanedDrugs = drugs
      .filter((drug) => drug.name.trim() && drug.dosage.trim())
      .map((drug) => ({ name: drug.name.trim(), dosage: drug.dosage.trim() }));

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          doctor_name: doctorName.trim(),
          date,
          drugs: cleanedDrugs,
        }),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response));
      }

      const saved = await response.json();
      setResult(saved);
      setPatientName("");
      setDoctorName("");
      setDate(new Date().toISOString().slice(0, 10));
      setDrugs([emptyDrug()]);
    } catch (err) {
      setError(
        err instanceof TypeError
          ? `Cannot reach backend API at ${API_BASE_URL}. Check NEXT_PUBLIC_API_URL in Vercel and confirm the Render service is live.`
          : err instanceof Error
            ? err.message
            : "Prescription could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Prescription Entry Form</h1>
            <p className="text-sm text-slate-600">Save a prescription and check drug interactions.</p>
          </div>
          <PageSwitch />
        </header>

        {error && <div className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-slate-900">Prescription Details Form</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid gap-5 lg:grid-cols-3">
              <label className="space-y-2 text-xs font-bold uppercase tracking-wide text-slate-500">Patient Name
                <input className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="e.g. John Doe" />
              </label>
              <label className="space-y-2 text-xs font-bold uppercase tracking-wide text-slate-500">Prescribing Doctor
                <input className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal normal-case tracking-normal text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="e.g. Dr. Robert Chen" />
              </label>
              <label className="space-y-2 text-xs font-bold uppercase tracking-wide text-slate-500">Date
                <input type="date" className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base font-normal normal-case tracking-normal text-slate-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Prescribed Medications</h3>

              <div className="hidden grid-cols-[1fr_1fr_112px] gap-5 border-b border-slate-200 px-4 pb-3 text-xs font-bold uppercase tracking-wide text-slate-500 sm:grid">
                <span>Drug Name</span>
                <span>Dosage / Directions</span>
                <span className="text-center">Action</span>
              </div>

              {drugs.map((drug, index) => (
                <div key={index} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_112px] sm:gap-5">
                  <input className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={drug.name} onChange={(event) => updateDrug(index, "name", event.target.value)} placeholder="Drug Name, e.g. Warfarin" />
                  <input className="rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={drug.dosage} onChange={(event) => updateDrug(index, "dosage", event.target.value)} placeholder="Dosage / Directions, e.g. 5mg daily" />
                  <button type="button" className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" disabled={drugs.length === 1} onClick={() => removeDrug(index)}>Remove</button>
                </div>
              ))}

              <button type="button" className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50" onClick={() => setDrugs((current) => [...current, emptyDrug()])}>
                + Add Medication
              </button>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-6">
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-75 sm:w-auto sm:min-w-64">
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Checking interactions..." : "Save & Run Check"}
              </button>
            </div>
          </form>
        </section>

        {result && (
          <section className="mt-5">
            <InteractionAnalysisCard prescription={result} />
            <Link href="/prescriptions" className="mt-4 inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">Open History</Link>
          </section>
        )}
      </div>
    </main>
  );
}
