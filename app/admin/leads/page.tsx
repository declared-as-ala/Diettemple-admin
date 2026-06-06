"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Phone, Mail, Target, MessageSquare, Users, Smartphone, Globe, User } from "lucide-react";
import { format } from "date-fns";
import { fr as dateFr } from "date-fns/locale";

type LeadStatus = "new" | "contacted" | "converted" | "lost";

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  plan?: string;
  gender?: string;
  status: LeadStatus;
  notes: string;
  source: string;
  createdAt: string;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new:       "bg-blue-500/10 text-blue-400 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  converted: "bg-green-500/10 text-green-400 border-green-500/20",
  lost:      "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABELS: Record<LeadStatus, string> = {
  new:       "Nouveau",
  contacted: "Contacté",
  converted: "Converti",
  lost:      "Perdu",
};

const GOAL_LABELS: Record<string, string> = {
  "fat-loss":   "Perte de masse grasse",
  "muscle":     "Prise de muscle",
  "recomp":     "Recomposition corporelle",
  "performance":"Performance sportive",
  "wellness":   "Santé & longévité",
};


export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter !== "all") params.status = statusFilter;
      const data = await api.getLeads(params as Parameters<typeof api.getLeads>[0]);
      setLeads(data.leads as Lead[]);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (lead: Lead) => {
    setSelected(lead);
    setNotes(lead.notes || "");
    setDetailOpen(true);
  };

  const handleStatusUpdate = async (newStatus: LeadStatus) => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      await api.updateLeadStatus(selected._id, newStatus, notes);
      setSelected({ ...selected, status: newStatus, notes });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const counts = {
    new:       leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    converted: leads.filter((l) => l.status === "converted").length,
    lost:      leads.filter((l) => l.status === "lost").length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Demandes de Rendez-vous</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Demandes reçues via le site web et l&apos;application mobile DietTemple
          </p>
        </div>
        <Badge variant="outline" className="text-base px-4 py-1">
          <Users className="w-4 h-4 mr-2" />
          {total} leads
        </Badge>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["new", "contacted", "converted", "lost"] as LeadStatus[]).map((s) => (
          <Card key={s} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => { setStatusFilter(s); setPage(1); }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{STATUS_LABELS[s]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{counts[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="new">Nouveau</SelectItem>
            <SelectItem value="contacted">Contacté</SelectItem>
            <SelectItem value="converted">Converti</SelectItem>
            <SelectItem value="lost">Perdu</SelectItem>
          </SelectContent>
        </Select>
        {statusFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setPage(1); }}>
            Effacer le filtre
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">Chargement…</div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Users className="w-10 h-10 opacity-30" />
              <p>Aucun lead pour l&apos;instant</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nom</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Objectif</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Genre</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden xl:table-cell">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{lead.name}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{lead.phone}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground text-xs">{GOAL_LABELS[lead.goal] ?? lead.goal}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-xs">
                        {lead.gender ? (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <User className="w-3 h-3" />
                            {lead.gender === 'homme' ? 'Homme' : lead.gender === 'femme' ? 'Femme' : lead.gender}
                          </span>
                        ) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="py-3 px-4 hidden xl:table-cell text-xs">
                        {lead.source === 'mobile' ? (
                          <span className="flex items-center gap-1 text-blue-400"><Smartphone className="w-3 h-3" />Mobile</span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground"><Globe className="w-3 h-3" />Site web</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[lead.status as LeadStatus]}`}>
                          {STATUS_LABELS[lead.status as LeadStatus] ?? lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(lead.createdAt), "dd MMM yyyy · HH:mm", { locale: dateFr })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(lead)}>Gérer</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{selected.phone}</div>
                <div className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{selected.email}</div>
                <div className="flex items-center gap-2 text-muted-foreground col-span-2"><Target className="w-4 h-4" />{GOAL_LABELS[selected.goal] ?? selected.goal}</div>
                {selected.gender && (
                  <div className="flex items-center gap-2 text-muted-foreground"><User className="w-4 h-4" />{selected.gender === 'homme' ? 'Homme' : selected.gender === 'femme' ? 'Femme' : selected.gender}</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  {selected.source === 'mobile' ? <Smartphone className="w-4 h-4 text-blue-400" /> : <Globe className="w-4 h-4" />}
                  {selected.source === 'mobile' ? 'Application Mobile' : 'Site Web'}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</label>
                <Select
                  value={selected.status}
                  onValueChange={(v) => handleStatusUpdate(v as LeadStatus)}
                  disabled={updatingStatus}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nouveau</SelectItem>
                    <SelectItem value="contacted">Contacté</SelectItem>
                    <SelectItem value="converted">Converti</SelectItem>
                    <SelectItem value="lost">Perdu</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />Notes internes
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-border bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur ce lead…"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                Soumis le {format(new Date(selected.createdAt), "dd MMMM yyyy à HH:mm", { locale: dateFr })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Fermer</Button>
            <Button onClick={() => { if (selected) handleStatusUpdate(selected.status); }} disabled={updatingStatus}>
              {updatingStatus ? "Sauvegarde…" : "Sauvegarder les notes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
