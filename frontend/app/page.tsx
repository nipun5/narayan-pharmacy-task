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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

const emptyDrug = (): DrugRow => ({ name: "", dosage: "" });

const severityClass: Record<Severity, string> = {
  None: "border-slate-300 bg-slate-100 text-slate-700",
  Mild: "border-yellow-300 bg-yellow-50 text-yellow-900",
  Moderate: "border-orange-300 bg-orange-50 text-orange-900",
  Severe: "border-red-300 bg-red-50 text-red-800",
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

function interactionText(prescription: PrescriptionDetail) {
  return prescription.interaction_result ?? prescription.interaction_summary ?? "";
}

function cleanLine(line: string) {
  return line.replace(/^#{1,6}\s*/, "").replace(/^[-*]\s+/, "").replace(/\*\*/g, "").replace(/`/g, "").trim();
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
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? "Prescription could not be saved.");
      }

      const saved = await response.json();
      setResult(saved);
      setPatientName("");
      setDoctorName("");
      setDate(new Date().toISOString().slice(0, 10));
      setDrugs([emptyDrug()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prescription could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-700">Screen 1</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Prescription Entry Form</h1>
            <p className="text-sm text-slate-600">Save a prescription and check drug interactions.</p>
          </div>
          <Link href="/prescriptions" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50">
            View Prescriptions
          </Link>
        </header>

        {error && <div className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Prescription Details</h2>
            <span className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">{drugs.length} row{drugs.length === 1 ? "" : "s"}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1 text-sm font-semibold">Patient Name
                <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Asha Patel" />
              </label>
              <label className="space-y-1 text-sm font-semibold">Doctor Name
                <input className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Dr. Mehta" />
              </label>
              <label className="space-y-1 text-sm font-semibold">Date
                <input type="date" className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={date} onChange={(event) => setDate(event.target.value)} />
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">Drug List</h3>
                <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700" onClick={() => setDrugs((current) => [...current, emptyDrug()])}>Add Row</button>
              </div>

              {drugs.map((drug, index) => (
                <div key={index} className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input className="rounded border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={drug.name} onChange={(event) => updateDrug(index, "name", event.target.value)} placeholder="Drug Name, e.g. Warfarin" />
                  <input className="rounded border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100" value={drug.dosage} onChange={(event) => updateDrug(index, "dosage", event.target.value)} placeholder="Dosage, e.g. 5mg" />
                  <button type="button" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" disabled={drugs.length === 1} onClick={() => removeDrug(index)}>Remove</button>
                </div>
              ))}
            </div>

            <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-75">
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Checking interactions..." : "Save and Check Interactions"}
            </button>
          </form>
        </section>

        {result && (
          <section className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-teal-700">Interaction Result</p>
                <h2 className="text-lg font-bold">{result.patient_name}</h2>
                <p className="text-sm text-slate-600">Status: {result.interaction_status}</p>
              </div>
              <SeverityBadge severity={result.severity} />
            </div>
            {result.interaction_status === "Error" && (
              <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Interaction check could not complete. The prescription was saved for pharmacist review.</div>
            )}
            <InteractionText text={interactionText(result)} />
            <Link href="/prescriptions" className="mt-4 inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">Open History</Link>
          </section>
        )}
      </div>
    </main>
  );
}