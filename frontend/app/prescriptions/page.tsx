"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Severity = "None" | "Mild" | "Moderate" | "Severe";
type InteractionStatus = "Skipped" | "Completed" | "Error";

type PrescriptionListItem = {
  id: number;
  patient_name: string;
  doctor_name: string;
  date: string;
  drug_count: number;
  severity: Severity;
  interaction_status: InteractionStatus;
  created_at: string;
};

type PrescriptionDetail = PrescriptionListItem & {
  drugs: Array<{ id: number; name: string; dosage: string }>;
  interaction_result?: string;
  interaction_summary?: string;
  api_error: string;
  used_cache: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://127.0.0.1:8000";

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

function statusClass(status: InteractionStatus) {
  if (status === "Error") {
    return "border-amber-300 bg-amber-50 text-amber-900";
  }
  if (status === "Completed") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  return "border-slate-300 bg-slate-50 text-slate-700";
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

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionListItem[]>([]);
  const [selected, setSelected] = useState<PrescriptionDetail | null>(null);
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
        throw new Error("Could not load prescriptions.");
      }
      setPrescriptions(await response.json());
    } catch {
      setPrescriptions([]);
    } finally {
      setIsLoadingList(false);
    }
  }

  async function openDetail(id: number) {
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
    if (!window.confirm("Delete this prescription? This cannot be undone.")) {
      return;
    }

    setDeletingId(id);
    setError("");
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

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-blue-700">Screen 2</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Prescriptions List</h1>
            <p className="text-sm text-slate-600">Review saved prescriptions and AI interaction warnings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50">New Prescription</Link>
            <button type="button" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50" onClick={loadPrescriptions}>Refresh</button>
          </div>
        </header>

        {error && <div className="mb-5 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</div>}

        <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3">Patient</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Drug Count</th>
                  <th className="px-3 py-3">Severity</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingList && (
                  <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>Loading prescriptions...</td></tr>
                )}
                {!isLoadingList && prescriptions.length === 0 && (
                  <tr><td className="px-3 py-6 text-slate-500" colSpan={6}>No saved prescriptions yet.</td></tr>
                )}
                {prescriptions.map((prescription) => (
                  <tr key={prescription.id} className="cursor-pointer border-t border-slate-200 transition hover:bg-blue-50" onClick={() => openDetail(prescription.id)}>
                    <td className="px-3 py-3 font-semibold">{prescription.patient_name}</td>
                    <td className="px-3 py-3">{prescription.date}</td>
                    <td className="px-3 py-3">{prescription.drug_count}</td>
                    <td className="px-3 py-3"><SeverityBadge severity={prescription.severity} /></td>
                    <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(prescription.interaction_status)}`}>{prescription.interaction_status}</span></td>
                    <td className="px-3 py-3 text-right">
                      <button type="button" className="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60" disabled={deletingId === prescription.id} onClick={(event) => { event.stopPropagation(); deletePrescription(prescription.id); }}>
                        {deletingId === prescription.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {isLoadingDetail && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4">
            <div className="rounded-lg bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-lg">Loading prescription detail...</div>
          </div>
        )}

        {selected && !isLoadingDetail && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-6 sm:items-center" role="dialog" aria-modal="true">
            <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-700">Prescription Detail</p>
                  <h2 className="text-xl font-bold">{selected.patient_name}</h2>
                  <p className="text-sm text-slate-600">{selected.date} | {selected.doctor_name} | {selected.drug_count} drug{selected.drug_count === 1 ? "" : "s"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                {selected.drugs.length === 0 && <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No drugs entered.</div>}
                {selected.drugs.map((drug) => (
                  <div key={drug.id} className="rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="font-semibold">{drug.name}</p>
                    <p className="text-sm text-slate-600">{drug.dosage}</p>
                  </div>
                ))}
              </div>

              <div className="rounded bg-slate-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold">AI Interaction Warning</h3>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(selected.interaction_status)}`}>{selected.interaction_status}</span>
                </div>
                {selected.interaction_status === "Error" && (
                  <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">Interaction check failed, but this prescription was saved. Please retry review before dispensing.</div>
                )}
                <InteractionText text={interactionText(selected)} />
                {selected.used_cache && <p className="mt-3 text-xs font-bold uppercase text-teal-700">Served from cached interaction result</p>}
              </div>

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <button type="button" className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60" disabled={deletingId === selected.id} onClick={() => deletePrescription(selected.id)}>
                  {deletingId === selected.id ? "Deleting..." : "Delete Prescription"}
                </button>
                <button type="button" className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700" onClick={() => setSelected(null)}>Done</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}