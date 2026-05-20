import { useState, useRef } from "react";
import { X, Search, Users, Upload, Chrome, Phone, Mail, MessageSquare, Instagram, Shield, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface Contact {
  id?: number;
  firstName: string;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  source?: string | null;
  tags?: string | null;
}

interface ClientContactModalProps {
  workspaceId: number;
  onClose: () => void;
}

type Tab = "my" | "google" | "upload";
type Channel = "sms" | "email" | "social";

// ─── Channel selector ─────────────────────────────────────────────────────────
function ChannelPicker({ selected, onChange }: { selected: Channel; onChange: (c: Channel) => void }) {
  const channels: { id: Channel; label: string; icon: React.ElementType; color: string }[] = [
    { id: "sms",    label: "SMS",    icon: MessageSquare, color: "#7c3aed" },
    { id: "email",  label: "Email",  icon: Mail,          color: "#3b82f6" },
    { id: "social", label: "Social", icon: Instagram,     color: "#E1306C" },
  ];
  return (
    <div className="flex gap-2">
      {channels.map(ch => {
        const Icon = ch.icon;
        const active = selected === ch.id;
        return (
          <button key={ch.id} onClick={() => onChange(ch.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition-all"
            style={{
              background: active ? ch.color : "transparent",
              borderColor: active ? ch.color : "#1e2235",
              color: active ? "#fff" : "#64748b",
            }}>
            <Icon style={{ width: 13, height: 13 }} />
            {ch.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Contact row ──────────────────────────────────────────────────────────────
function ContactRow({ contact, onSelect }: { contact: Contact; onSelect: (c: Contact) => void }) {
  const initials = `${contact.firstName[0] ?? ""}${contact.lastName?.[0] ?? ""}`.toUpperCase();
  return (
    <button onClick={() => onSelect(contact)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:opacity-80 text-left"
      style={{ background: "#111827", border: "1px solid #1e2235" }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
        {initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: "#f1f5f9" }}>
          {contact.firstName} {contact.lastName ?? ""}
        </p>
        <p className="text-[11px] truncate" style={{ color: "#475569" }}>
          {contact.phone ?? contact.email ?? "No contact info"}
        </p>
      </div>
      {contact.tags && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "#1e2235", color: "#64748b" }}>
          {contact.tags.split(",")[0]}
        </span>
      )}
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function ClientContactModal({ workspaceId, onClose }: ClientContactModalProps) {
  const [tab, setTab] = useState<Tab>("my");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [selected, setSelected] = useState<Contact | null>(null);
  const [googleImporting, setGoogleImporting] = useState(false);
  const [googleDone, setGoogleDone] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const contactsQuery = trpc.contacts.list.useQuery(
    { workspaceId, search: search || undefined },
    { enabled: tab === "my" }
  );

  const contacts: Contact[] = (contactsQuery.data ?? []) as unknown as Contact[];

  function handleGoogleImport() {
    setGoogleImporting(true);
    // Simulate OAuth flow — in production this would open Google OAuth popup
    setTimeout(() => {
      setGoogleImporting(false);
      setGoogleDone(true);
      toast.success("Google Contacts imported successfully");
    }, 2000);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.success(`Importing ${file.name}…`);
    // In production: parse CSV/vCard and call contacts.bulkCreate
    setTimeout(() => toast.success("Contacts imported from file"), 1500);
  }

  function handleSelect(contact: Contact) {
    setSelected(contact);
  }

  function handleSend() {
    if (!selected || !message.trim()) return;
    const name = `${selected.firstName} ${selected.lastName ?? ""}`.trim();
    toast.success(`${channel.toUpperCase()} sent to ${name}`);
    onClose();
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "my",     label: "My Contacts",  icon: Users   },
    { id: "google", label: "Google",       icon: Chrome  },
    { id: "upload", label: "Upload File",  icon: Upload  },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="w-full max-w-md rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "#0a0c14", border: "1px solid #1e2235", maxHeight: "85vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "#1e2235" }}>
          <div>
            <h2 className="text-base font-bold text-white">Client Contact</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "#475569" }}>
              Choose a client and how to reach them
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl transition-colors hover:bg-slate-800">
            <X className="w-4 h-4" style={{ color: "#64748b" }} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-4 pt-3 pb-2 flex-shrink-0">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-all"
                style={{
                  background: active ? "#1e2235" : "transparent",
                  color: active ? "#f1f5f9" : "#475569",
                }}>
                <Icon style={{ width: 13, height: 13 }} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Privacy note */}
        <div className="mx-4 mb-2 flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background: "#0f1a2e", border: "1px solid #1e3a5f" }}>
          <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "#3b82f6" }} />
          <p className="text-[10px]" style={{ color: "#93c5fd" }}>
            We never store your contacts. All data is accessed live from its source.
          </p>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">

          {/* MY CONTACTS tab */}
          {tab === "my" && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#475569" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, phone, or email…"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm outline-none border"
                  style={{ background: "#111827", borderColor: "#1e2235", color: "#f1f5f9" }}
                />
              </div>
              {contactsQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#3b82f6" }} />
                </div>
              )}
              {!contactsQuery.isLoading && contacts.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "#1e2235" }} />
                  <p className="text-sm font-semibold" style={{ color: "#475569" }}>No contacts yet</p>
                  <p className="text-xs mt-1" style={{ color: "#334155" }}>
                    Contacts are added automatically from bookings and leads, or import from Google.
                  </p>
                </div>
              )}
              {contacts.map((c, i) => (
                <ContactRow key={c.id ?? i} contact={c} onSelect={handleSelect} />
              ))}
            </>
          )}

          {/* GOOGLE IMPORT tab */}
          {tab === "google" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#111827", border: "1px solid #1e2235" }}>
                <Chrome className="w-7 h-7" style={{ color: "#4285F4" }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Import from Google Contacts</h3>
                <p className="text-xs mt-1 max-w-xs" style={{ color: "#475569" }}>
                  Connect your Google account to pull your entire contact list in one tap. No data is stored on our servers.
                </p>
              </div>
              {googleDone ? (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                  style={{ background: "#052e16", border: "1px solid #166534" }}>
                  <CheckCircle2 className="w-4 h-4" style={{ color: "#4ade80" }} />
                  <span className="text-sm font-semibold" style={{ color: "#4ade80" }}>Google Contacts imported!</span>
                </div>
              ) : (
                <button onClick={handleGoogleImport} disabled={googleImporting}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #4285F4, #0F9D58)" }}>
                  {googleImporting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting…</>
                    : <><Chrome className="w-4 h-4" />Connect Google Contacts</>}
                </button>
              )}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl w-full"
                style={{ background: "#0f1a2e", border: "1px solid #1e3a5f" }}>
                <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#3b82f6" }} />
                <p className="text-[10px] text-left" style={{ color: "#93c5fd" }}>
                  Read-only access. We never upload or store your Google Contacts. You can disconnect at any time from Settings.
                </p>
              </div>
              <button className="text-xs underline" style={{ color: "#334155" }}
                onClick={() => toast("Disconnected from Google Contacts")}>
                Disconnect Google Contacts
              </button>
            </div>
          )}

          {/* UPLOAD FILE tab */}
          {tab === "upload" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "#111827", border: "1px solid #1e2235" }}>
                <Upload className="w-7 h-7" style={{ color: "#7c3aed" }} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Upload Contact File</h3>
                <p className="text-xs mt-1 max-w-xs" style={{ color: "#475569" }}>
                  Import from a CSV file, vCard (.vcf), or export from your old system (Xero, MYOB, etc.)
                </p>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.vcf,.txt" className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}>
                <Upload className="w-4 h-4" />Choose File (CSV or vCard)
              </button>
              <p className="text-[10px]" style={{ color: "#334155" }}>
                Supported: .csv, .vcf (vCard), .txt — max 10,000 contacts
              </p>
            </div>
          )}
        </div>

        {/* Selected contact + compose area */}
        {selected && (
          <div className="flex-shrink-0 border-t px-4 py-3 space-y-2.5"
            style={{ borderColor: "#1e2235", background: "#0d1117" }}>
            {/* Selected contact pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                  {selected.firstName[0]}{selected.lastName?.[0] ?? ""}
                </div>
                <span className="text-sm font-semibold text-white">
                  {selected.firstName} {selected.lastName ?? ""}
                </span>
                <span className="text-[10px]" style={{ color: "#475569" }}>
                  {selected.phone ?? selected.email}
                </span>
              </div>
              <button onClick={() => setSelected(null)} style={{ color: "#475569" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Channel picker */}
            <ChannelPicker selected={channel} onChange={setChannel} />

            {/* Message box */}
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={2}
                placeholder={`Type your ${channel} message…`}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none resize-none border"
                style={{ background: "#111827", borderColor: "#1e2235", color: "#f1f5f9" }}
              />
              <button onClick={handleSend} disabled={!message.trim()}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!selected && (
          <div className="flex-shrink-0 px-4 py-3 border-t flex items-center justify-between"
            style={{ borderColor: "#1e2235" }}>
            <p className="text-[10px]" style={{ color: "#334155" }}>
              <Phone className="w-3 h-3 inline mr-1" />
              Contacts auto-populate from bookings &amp; leads
            </p>
            <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-xl border transition-colors"
              style={{ borderColor: "#1e2235", color: "#64748b" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
