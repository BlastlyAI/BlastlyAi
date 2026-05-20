import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Clock, DollarSign } from "lucide-react";

const COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

type Service = {
  id: number;
  workspaceId: number;
  name: string;
  durationMinutes: number;
  priceCents: number;
  description: string | null;
  color: string | null;
  isActive: boolean;
};

function ServiceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Service>;
  onSave: (data: { name: string; durationMinutes: number; priceCents: number; description?: string; color: string }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [price, setPrice]       = useState(initial?.priceCents ? (initial.priceCents / 100).toFixed(2) : "");
  const [desc, setDesc]         = useState(initial?.description ?? "");
  const [color, setColor]       = useState(initial?.color ?? "#6366f1");

  return (
    <div className="rounded-2xl border dark:border-gray-700 p-4 space-y-3 bg-white dark:bg-gray-900 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Service Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none"
            placeholder="e.g. Basic Haircut, Consultation, Plumbing Call-Out" />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Duration (min)</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border dark:bg-gray-800 dark:border-gray-700">
            <Clock className="w-4 h-4 text-gray-400" />
            <input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)}
              className="flex-1 bg-transparent text-sm dark:text-white outline-none" min={5} step={5} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Price ($)</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border dark:bg-gray-800 dark:border-gray-700">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="flex-1 bg-transparent text-sm dark:text-white outline-none" min={0} step={0.01} placeholder="0.00" />
          </div>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Description (optional)</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none"
            placeholder="Short description shown on booking portal…" />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Colour</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: color === c ? "#111" : "transparent", transform: color === c ? "scale(1.2)" : "scale(1)" }} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border dark:border-gray-700 dark:text-gray-300">
          Cancel
        </button>
        <button
          onClick={() => onSave({ name, durationMinutes: duration, priceCents: Math.round(parseFloat(price || "0") * 100), description: desc || undefined, color })}
          disabled={saving || !name}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "#3b82f6" }}>
          {saving ? "Saving…" : "Save Service"}
        </button>
      </div>
    </div>
  );
}

export default function ServiceMenuPage() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;
  const [showAdd, setShowAdd]   = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);

  const { data: services = [], refetch } = trpc.appointments.listServices.useQuery(
    { workspaceId: wsId ?? 0 },
    { enabled: !!wsId }
  );

  const createService = trpc.appointments.createService.useMutation({
    onSuccess: () => { toast.success("Service added!"); refetch(); setShowAdd(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateService = trpc.appointments.updateService.useMutation({
    onSuccess: () => { toast.success("Service updated!"); refetch(); setEditId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteService = trpc.appointments.deleteService.useMutation({
    onSuccess: () => { toast.success("Service removed"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold dark:text-white">Service Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">Services appear in the booking portal and when adding appointments.</p>
        </div>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: "#3b82f6" }}>
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        )}
      </div>

      {showAdd && wsId && (
        <ServiceForm
          onSave={d => createService.mutate({ workspaceId: wsId, ...d })}
          onCancel={() => setShowAdd(false)}
          saving={createService.isPending}
        />
      )}

      {services.length === 0 && !showAdd && (
        <div className="text-center py-12 rounded-2xl border-2 border-dashed dark:border-gray-700">
          <p className="text-gray-400 text-sm">No services yet.</p>
          <p className="text-gray-400 text-xs mt-1">Add your first service to enable the booking portal and smart scheduling.</p>
        </div>
      )}

      <div className="space-y-3">
        {services.map(s => (
          <div key={s.id}>
            {editId === s.id ? (
              <ServiceForm
                initial={s}
                onSave={d => updateService.mutate({ workspaceId: wsId ?? 0, serviceId: s.id, ...d })}
                onCancel={() => setEditId(null)}
                saving={updateService.isPending}
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ background: s.color ?? "#6366f1" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold dark:text-white truncate">{s.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.durationMinutes}min
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> ${(s.priceCents / 100).toFixed(2)}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.description}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setEditId(s.id)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteService.mutate({ workspaceId: wsId ?? 0, serviceId: s.id })}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
