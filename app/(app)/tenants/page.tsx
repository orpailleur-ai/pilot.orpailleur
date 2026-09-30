"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Building2,
  Search,
  Loader,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  adminTenants,
  clearToken,
  type Tenant,
  type CreateTenantDto,
} from "@/lib/api-client";

const fmt = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  scale: "Scale",
};

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state
  const [form, setForm] = useState<CreateTenantDto>({
    nom: "",
    email: "",
    siret: "",
    ville: "",
    plan: "starter",
    nb_sites_max: 1,
    nb_users_max: 5,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    try {
      const data = await adminTenants.list();
      setTenants(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        clearToken();
        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      await adminTenants.create(form);
      setShowCreate(false);
      setForm({ nom: "", email: "", siret: "", ville: "", plan: "starter", nb_sites_max: 1, nb_users_max: 5 });
      fetchTenants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, nom: string) {
    if (!confirm(`Supprimer définitivement le tenant "${nom}" ?`)) return;
    setDeleting(id);
    try {
      await adminTenants.delete(id);
      fetchTenants();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.nom.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {tenants.length} boulangerie{tenants.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: "#C9A84C" }}
        >
          <Plus size={16} />
          Nouveau tenant
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader size={24} className="animate-spin text-slate-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          {search ? "Aucun résultat" : "Aucun tenant — créez le premier"}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="px-5 py-3 text-slate-400 font-medium">Nom</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Contact</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Plan</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Sites / Users</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Statut</th>
                <th className="px-5 py-3 text-slate-400 font-medium">Créé le</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-500" />
                      <span className="font-medium text-white">{t.nom}</span>
                    </div>
                    {t.siret && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        SIRET {t.siret}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {t.email ?? "—"}
                    {t.ville && (
                      <p className="text-xs text-slate-500 mt-0.5">{t.ville}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {PLAN_LABELS[t.plan] ?? t.plan}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {t.nb_sites_max} sites · {t.nb_users_max} users
                  </td>
                  <td className="px-5 py-4">
                    {t.actif ? (
                      <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                        <CheckCircle size={12} />
                        Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-400 text-xs">
                        <XCircle size={12} />
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id, t.nom)}
                      disabled={deleting === t.id}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg p-8 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Nouvelle boulangerie</h3>
              <button onClick={() => setShowCreate(false)}>
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Nom de la boulangerie *
                  </label>
                  <input
                    required
                    value={form.nom}
                    onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="La Mie Câline — Toulouse"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="contact@lamiecacaline.fr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Ville</label>
                  <input
                    value={form.ville ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, ville: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="Toulouse"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">SIRET</label>
                  <input
                    value={form.siret ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    placeholder="123 456 789 00012"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Plan</label>
                  <select
                    value={form.plan ?? "starter"}
                    onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="scale">Scale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Sites max</label>
                  <input
                    type="number"
                    min={1}
                    value={form.nb_sites_max ?? 1}
                    onChange={(e) => setForm((f) => ({ ...f, nb_sites_max: parseInt(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Users max</label>
                  <input
                    type="number"
                    min={1}
                    value={form.nb_users_max ?? 5}
                    onChange={(e) => setForm((f) => ({ ...f, nb_users_max: parseInt(e.target.value) }))}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 border border-slate-600 rounded-lg text-sm text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60"
                  style={{ backgroundColor: "#C9A84C" }}
                >
                  {saving ? "Création…" : "Créer le tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
