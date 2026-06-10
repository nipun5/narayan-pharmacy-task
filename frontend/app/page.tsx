"use client";

import { FormEvent, useEffect, useState } from "react";

type Severity = "None" | "Mild" | "Moderate" | "Severe";

type DrugRow = {
  name: string;
  dosage: string;
};

type PrescriptionListItem = {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  drug_count: number;
  severity: Severity;
  created_at: string;
};

type PrescriptionDetail = PrescriptionListItem & {
  drugs: Array<{ id: number; name: string; dosage: string }>;
  interaction_result?: string;
  interaction_summary?: string;
  api_error: string;
  used_cache: boolean;
};

type InteractionLine = {
  kind: "heading" | "bullet" | "body";
  text: string;
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
    <span
      className={`inline-flex min-w-24 items-center justify-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${severityClass[severity]}`}
    >
      {severity}
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
  );
}

function getInteractionText(prescription: PrescriptionDetail | null) {
  if (!prescription) {
    return "";
  }
  return prescription.interaction_result ?? prescription.interaction_summary ?? "";
}

function cleanMarkdownLine(line: string) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .trim();
}

function formatInteraction(text: string): InteractionLine[] {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      const cleaned = cleanMarkdownLine(trimmed);
      if (!cleaned) {
        return null;
      }

      if (/^#{1,6}\s/.test(trimmed) || /^\*\*[^*]+:\*\*/.test(trimmed)) {
        return { kind: "heading", text: cleaned };
      }

      if (/^[-*]\s+/.test(trimmed) || /^\s{2,}[-*]\s+/.test(line)) {
        return { kind: "bullet", text: cleaned };
      }

      return { kind: "body", text: cleaned };
    })
    .filter((line): line is InteractionLine => Boolean(line));
}

function InteractionText({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-6 text-slate-800">
      {formatInteraction(text).map((line, index) => {
        if (line.kind === "heading") {
          return (
            <h5 key={index} className="pt-2 text-sm font-bold text-slate-950 first:pt-0">
              {line.text}
            </h5>
          );
        }

        if (line.kind === "bullet") {
          return (
            <p key={index} className="pl-4 text-slate-700 before:mr-2 before:content-['•']">
              {line.text}
            </p>
          );
        }

        return <p key={index}>{line.text}</p>;
      })}
    </div>
  );
}

export default function Home() {
  const [patientName, setPatientName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [drugs, setDrugs] = useState<DrugRow[]>([emptyDrug()]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [selected, setSelected] = useState<PrescriptionDetail | null>(null);
  const [inlineResult, setInlineResult] = useState<PrescriptionDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadPrescriptions() {
    setIsLoadingList(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/`);
      if (!response.ok) {
        throw new Error("Could not load saved prescriptions.");
      }
      setPrescriptions(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load prescriptions.");
    } finally {
      setIsLoadingList(false);
    }
  }

  async function loadDetail(id: number) {
    if (selected?.id === id) {
      setSelected(null);
      return;
    }

    setError("");
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/${id}/`);
      if (!response.ok) {
        throw new Error("Could not load prescription detail.");
      }
      setSelected(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load detail.");
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function deletePrescription(id: number) {
    const confirmed = window.confirm(
      "Delete this prescription? This will remove the saved drug items and interaction result.",
    );
    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/${id}/`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Prescription could not be deleted.");
      }

      if (selected?.id === id) {
        setSelected(null);
      }
      if (inlineResult?.id === id) {
        setInlineResult(null);
      }
      await loadPrescriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prescription could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadPrescriptions();
  }, []);

  function updateDrug(index: number, field: keyof DrugRow, value: string) {
    setDrugs((current) =>
      current.map((drug, drugIndex) =>
        drugIndex === index ? { ...drug, [field]: value } : drug,
      ),
    );
  }

  function removeDrug(index: number) {
    setDrugs((current) => current.filter((_, drugIndex) => drugIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setInlineResult(null);

    const cleanedDrugs = drugs.filter(
      (drug) => drug.name.trim() && drug.dosage.trim(),
    );

    if (!patientName.trim() || !doctorName.trim() || !date || !cleanedDrugs.length) {
      setError("Patient name, doctor name, date, and at least one drug are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/prescriptions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_name: patientName.trim(),
          doctor_name: doctorName.trim(),
          date,
          drugs: cleanedDrugs.map((drug) => ({
            name: drug.name.trim(),
            dosage: drug.dosage.trim(),
          })),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.detail ?? "Prescription could not be saved.");
      }

      const saved = await response.json();
      setInlineResult(saved);
      setSelected(saved);
      setPatientName("");
      setDoctorName("");
      setDate(new Date().toISOString().slice(0, 10));
      setDrugs([emptyDrug()]);
      await loadPrescriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prescription could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Narayan Pharmacy Task</h1>
            <p className="text-sm text-slate-600">
              Prescription entry and drug interaction checking
            </p>
          </div>
          <p className="text-xs font-semibold uppercase text-slate-500">
            Two screens only
          </p>
        </header>

        {error && (
          <div className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        <div className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="self-start rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-teal-700">Screen 1</p>
                <h2 className="mt-1 text-xl font-bold">Prescription Entry Form</h2>
              </div>
              <span className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                {drugs.length} row{drugs.length === 1 ? "" : "s"}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm font-semibold">
                  Patient Name
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    value={patientName}
                    onChange={(event) => setPatientName(event.target.value)}
                    placeholder="Asha Patel"
                  />
                </label>

                <label className="space-y-1 text-sm font-semibold">
                  Doctor Name
                  <input
                    className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    value={doctorName}
                    onChange={(event) => setDoctorName(event.target.value)}
                    placeholder="Dr. Mehta"
                  />
                </label>

                <label className="space-y-1 text-sm font-semibold">
                  Date
                  <input
                    type="date"
                    className="w-full rounded border border-slate-300 px-3 py-2 font-normal outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold">Drug List</h3>
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                    onClick={() => setDrugs((current) => [...current, emptyDrug()])}
                  >
                    Add Row
                  </button>
                </div>

                {drugs.map((drug, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      className="rounded border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                      value={drug.name}
                      onChange={(event) => updateDrug(index, "name", event.target.value)}
                      placeholder="Drug Name, e.g. Metformin"
                    />
                    <input
                      className="rounded border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                      value={drug.dosage}
                      onChange={(event) => updateDrug(index, "dosage", event.target.value)}
                      placeholder="Dosage, e.g. 500mg"
                    />
                    <button
                      type="button"
                      className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={drugs.length === 1}
                      onClick={() => removeDrug(index)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded bg-teal-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-75"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Checking interactions..." : "Save and Check Interactions"}
              </button>
            </form>

            {inlineResult && (
              <article className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-teal-700">
                      Interaction Result
                    </p>
                    <h3 className="text-lg font-bold">{inlineResult.patient_name}</h3>
                  </div>
                  <SeverityBadge severity={inlineResult.severity} />
                </div>

                <InteractionText text={getInteractionText(inlineResult)} />

                {inlineResult.api_error && (
                  <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                    {inlineResult.api_error}
                  </div>
                )}
              </article>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">Screen 2</p>
                <h2 className="mt-1 text-xl font-bold">Prescriptions List</h2>
              </div>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={loadPrescriptions}
              >
                Refresh
              </button>
            </div>

            <div className="overflow-hidden rounded border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Patient</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Drug Count</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingList && (
                    <tr>
                      <td className="px-3 py-5 text-slate-500" colSpan={5}>
                        Loading prescriptions...
                      </td>
                    </tr>
                  )}

                  {!isLoadingList && prescriptions.length === 0 && (
                    <tr>
                      <td className="px-3 py-5 text-slate-500" colSpan={5}>
                        No saved prescriptions yet.
                      </td>
                    </tr>
                  )}

                  {prescriptions.map((prescription) => (
                    <tr
                      key={prescription.id}
                      className={`cursor-pointer border-t border-slate-200 transition hover:bg-blue-50 ${
                        selected?.id === prescription.id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => loadDetail(prescription.id)}
                    >
                      <td className="px-3 py-3 font-semibold">
                        {prescription.patient_name}
                      </td>
                      <td className="px-3 py-3">{prescription.date}</td>
                      <td className="px-3 py-3">{prescription.drug_count}</td>
                      <td className="px-3 py-3">
                        <SeverityBadge severity={prescription.severity} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          type="button"
                          className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                          disabled={deletingId === prescription.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            deletePrescription(prescription.id);
                          }}
                        >
                          {deletingId === prescription.id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isLoadingDetail && (
              <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                Loading prescription detail...
              </div>
            )}

            {selected && !isLoadingDetail && (
              <article className="mt-5 rounded-lg border border-slate-200 p-4">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{selected.patient_name}</h3>
                    <p className="text-sm text-slate-600">
                      {selected.date} | {selected.doctor_name} | {selected.drug_count} drug
                      {selected.drug_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={selected.severity} />
                    <button
                      type="button"
                      className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60"
                      disabled={deletingId === selected.id}
                      onClick={() => deletePrescription(selected.id)}
                    >
                      {deletingId === selected.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid gap-2 md:grid-cols-2">
                  {selected.drugs.map((drug) => (
                    <div
                      key={drug.id}
                      className="rounded border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="font-semibold">{drug.name}</p>
                      <p className="text-sm text-slate-600">{drug.dosage}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded bg-slate-50 p-4">
                  <h4 className="mb-2 text-sm font-bold">AI Interaction Warning</h4>
                  <InteractionText text={getInteractionText(selected)} />

                  {selected.used_cache && (
                    <p className="mt-3 text-xs font-bold uppercase text-teal-700">
                      Served from cached interaction result
                    </p>
                  )}

                  {selected.api_error && (
                    <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                      {selected.api_error}
                    </div>
                  )}
                </div>
              </article>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
