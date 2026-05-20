import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  UserPlus,
  Search,
  Trash2,
  Pencil,
  Upload,
  Users,
  Phone,
  Mail,
  Tag,
  ChevronLeft,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ContactForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  tags: string;
  notes: string;
}

const EMPTY_FORM: ContactForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  tags: "",
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function Contacts() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Workspace — use first workspace of the user (same pattern as other pages)
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, {
    enabled: !!user,
  });
  const workspaceId = workspaces?.[0]?.id ?? 0;

  // State
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [editContact, setEditContact] = useState<{ id: number } & ContactForm | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const fileRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: contacts = [], refetch } = trpc.contacts.list.useQuery(
    { workspaceId, search: search || undefined, tag: activeTag },
    { enabled: !!workspaceId }
  );
  const { data: allTags = [] } = trpc.contacts.listTags.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  );

  // Mutations
  const addMut    = trpc.contacts.add.useMutation({ onSuccess: () => { refetch(); setShowAdd(false); setForm(EMPTY_FORM); toast.success("Contact added"); } });
  const editMut   = trpc.contacts.edit.useMutation({ onSuccess: () => { refetch(); setEditContact(null); toast.success("Contact updated"); } });
  const deleteMut = trpc.contacts.delete.useMutation({ onSuccess: () => { refetch(); setDeleteId(null); toast.success("Contact deleted"); } });
  const importMut = trpc.contacts.bulkImport.useMutation({ onSuccess: (r) => { refetch(); toast.success(`Imported ${r.inserted} contacts`); } });

  // ── CSV import ──────────────────────────────────────────────────────────────
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
        const obj: Record<string, string> = {};
        header.forEach((h, i) => { obj[h] = cols[i] || ""; });
        return obj;
      });
      const parsed = rows
        .filter(r => r.firstname || r["first name"] || r.name)
        .map(r => ({
          firstName: r.firstname || r["first name"] || r.name || "",
          lastName:  r.lastname  || r["last name"]  || "",
          phone:     r.phone     || r.mobile        || r.cell || "",
          email:     r.email     || "",
          tags:      r.tags      || r.tag            || "",
          notes:     r.notes     || r.note           || "",
        }));
      if (parsed.length === 0) {
        toast.error("No valid rows found — CSV must have a 'firstname' or 'name' column");
        return;
      }
      importMut.mutate({ workspaceId, contacts: parsed });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Save contact ────────────────────────────────────────────────────────────
  function saveForm() {
    const tags = form.tags.split(",").map(t => t.trim()).filter(Boolean);
    if (editContact) {
      editMut.mutate({ workspaceId, id: editContact.id, ...form, tags });
    } else {
      addMut.mutate({ workspaceId, ...form, tags });
    }
  }

  function openEdit(c: typeof contacts[0]) {
    const f: ContactForm = {
      firstName: c.firstName,
      lastName:  c.lastName  || "",
      phone:     c.phone     || "",
      email:     c.email     || "",
      tags:      c.tags.join(", "),
      notes:     c.notes     || "",
    };
    setForm(f);
    setEditContact({ id: c.id, ...f });
    setShowAdd(true);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/command")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <Users className="w-5 h-5 text-blue-600" />
        <h1 className="font-semibold text-foreground text-lg">Contacts</h1>
        <span className="ml-1 text-sm text-gray-400">{contacts.length} total</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="gap-1.5 text-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => { setForm(EMPTY_FORM); setEditContact(null); setShowAdd(true); }}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Contact
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* Search + Tag filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search name, phone, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white border-border text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag(undefined)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !activeTag ? "bg-blue-600 text-white" : "bg-white border border-border text-muted-foreground hover:bg-gray-50"
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(activeTag === tag ? undefined : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeTag === tag ? "bg-blue-600 text-white" : "bg-white border border-border text-muted-foreground hover:bg-gray-50"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* CSV hint */}
        {contacts.length === 0 && !search && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800 mb-1">No contacts yet</p>
            <p className="text-xs text-blue-600 mb-3">
              Add contacts manually or import a CSV file.<br />
              CSV columns: <code className="bg-blue-100 px-1 rounded">firstname, lastname, phone, email, tags</code>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
          </div>
        )}

        {/* Contact list */}
        {contacts.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {contacts.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  i < contacts.length - 1 ? "border-b border-gray-100" : ""
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-semibold text-sm">
                    {c.firstName[0]}{c.lastName?.[0] || ""}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">
                    {c.firstName} {c.lastName}
                    {c.optedOut && (
                      <span className="ml-2 text-xs text-red-500 font-normal">opted out</span>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" />{c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />{c.email}
                      </span>
                    )}
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.tags.map(tag => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs px-1.5 py-0 h-4 bg-gray-100 text-muted-foreground"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(c.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={showAdd} onOpenChange={open => { if (!open) { setShowAdd(false); setEditContact(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">First name *</Label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jane"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Smith"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Phone className="w-3 h-3" />Phone
              </Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+61 400 000 000"
                className="text-sm"
                type="tel"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Mail className="w-3 h-3" />Email
              </Label>
              <Input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
                className="text-sm"
                type="email"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                <Tag className="w-3 h-3" />Tags <span className="font-normal text-gray-400">(comma-separated)</span>
              </Label>
              <Input
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="vip, regular, new"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes about this contact…"
                className="text-sm resize-none"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setEditContact(null); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!form.firstName || addMut.isPending || editMut.isPending}
              onClick={saveForm}
            >
              {editContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the contact and cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteId && deleteMut.mutate({ workspaceId, id: deleteId })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
