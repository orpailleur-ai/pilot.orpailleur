"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader } from "lucide-react";
import { auditLogs, clearToken, type AuditLog } from "@/lib/api-client";

const ACTION_LABELS: Record<string, string> = {
  "tenant.create": "Création tenant",
  "tenant.update": "Modification tenant",
  "tenant.delete": "Suppression tenant",
};

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function AuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    try {
      const data = await auditLogs.list({ limit: 50 });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal d&apos;audit</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {total} action{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader size={24} className="animate-spin text-slate-500" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          Aucune action admin enregistrée
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-5 py-3 text-slate-400 font-medium">Action</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Détail</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList size={14} className="text-slate-500" />
                      <span className="font-medium text-white">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs font-mono max-w-xs truncate">
                    {JSON.stringify(log.metadata)}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {fmt.format(new Date(log.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
