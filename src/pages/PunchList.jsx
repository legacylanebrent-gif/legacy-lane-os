import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, ListChecks, Trash2, Loader2, Pencil,
} from "lucide-react";

const CATEGORY_LABELS = {
  public_experience: "Public Experience",
  consumer: "Consumer",
  operator: "Operator",
  vendor: "Vendor",
  reseller: "Reseller",
  agent: "Agent",
  admin: "Admin",
  seo_marketing: "SEO & Marketing",
  payments: "Payments",
  security: "Security",
  data: "Data",
  other: "Other",
};

const SEVERITY_STYLES = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_STYLES = {
  open: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
  wont_fix: "bg-slate-200 text-slate-500",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "other",
  severity: "medium",
  status: "open",
  is_launch_blocker: false,
  assigned_to: "",
};

export default function PunchList() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.PunchListItem.list("-created_date", 500);
      setItems(data || []);
    } catch (e) {
      console.error("Failed to load punch list:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "other",
      severity: item.severity || "medium",
      status: item.status || "open",
      is_launch_blocker: !!item.is_launch_blocker,
      assigned_to: item.assigned_to || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        severity: form.severity,
        status: form.status,
        is_launch_blocker: form.is_launch_blocker,
        assigned_to: form.assigned_to.trim() || null,
      };
      if (editingId) {
        await base44.entities.PunchListItem.update(editingId, payload);
        toast({ title: "Item updated" });
      } else {
        await base44.entities.PunchListItem.create(payload);
        toast({ title: "Item added to punch list" });
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadItems();
    } catch (e) {
      toast({ title: "Failed to save item", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (item) => {
    const order = ["open", "in_progress", "resolved", "blocked"];
    const next = order[(order.indexOf(item.status || "open") + 1) % order.length];
    try {
      await base44.entities.PunchListItem.update(item.id, { status: next });
      loadItems();
    } catch (e) {
      toast({ title: "Failed to update status", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.title}" from the punch list?`)) return;
    try {
      await base44.entities.PunchListItem.delete(item.id);
      toast({ title: "Item deleted" });
      loadItems();
    } catch (e) {
      toast({ title: "Failed to delete item", description: e.message, variant: "destructive" });
    }
  };

  const filtered = items.filter((i) =>
    (statusFilter === "all" || (i.status || "open") === statusFilter) &&
    (categoryFilter === "all" || (i.category || "other") === categoryFilter)
  );

  const counts = {
    open: items.filter((i) => (i.status || "open") === "open").length,
    in_progress: items.filter((i) => i.status === "in_progress").length,
    resolved: items.filter((i) => i.status === "resolved").length,
    blockers: items.filter((i) => i.is_launch_blocker && (i.status || "open") !== "resolved").length,
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              <ListChecks className="w-7 h-7 text-orange-600" /> Punch List
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Launch readiness punch list — track what still needs to be built or fixed
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Punch List Item" : "Add Punch List Item"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Short description of the item"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Details, context, acceptance criteria..."
                    className="min-h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Category</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                        <SelectItem value="wont_fix">Won't Fix</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assigned To</Label>
                    <Input
                      value={form.assigned_to}
                      onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                      placeholder="Name or team"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_launch_blocker}
                    onChange={(e) => setForm({ ...form, is_launch_blocker: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Launch blocker
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "Save Changes" : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">{counts.open}</div>
            <div className="text-xs text-slate-500">Open</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{counts.in_progress}</div>
            <div className="text-xs text-slate-500">In Progress</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{counts.resolved}</div>
            <div className="text-xs text-slate-500">Resolved</div>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{counts.blockers}</div>
            <div className="text-xs text-slate-500">Launch Blockers</div>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="wont_fix">Won't Fix</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500 ml-auto">{filtered.length} shown</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </CardContent></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-slate-500">
          No punch list items here. Click "Add Item" to create the first one.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Card key={item.id} className={item.is_launch_blocker && item.status !== "resolved" ? "border-red-300" : ""}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-semibold text-slate-900 ${item.status === "resolved" ? "line-through text-slate-400" : ""}`}>
                        {item.title}
                      </h3>
                      {item.is_launch_blocker && item.status !== "resolved" && (
                        <Badge variant="destructive" className="text-[10px]">LAUNCH BLOCKER</Badge>
                      )}
                      <Badge className={`text-[10px] border ${SEVERITY_STYLES[item.severity] || SEVERITY_STYLES.medium}`}>
                        {item.severity}
                      </Badge>
                      <Badge className={`text-[10px] ${STATUS_STYLES[item.status] || STATUS_STYLES.open}`}>
                        {(item.status || "open").replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {CATEGORY_LABELS[item.category] || "Other"}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.description}</p>
                    )}
                    {item.assigned_to && (
                      <p className="text-xs text-slate-400 mt-1">Assigned to: {item.assigned_to}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => cycleStatus(item)} title="Advance status">
                      Advance
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)} title="Edit">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} title="Delete">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}