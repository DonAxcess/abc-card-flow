import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, CreditCard, LayoutGrid } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"cards" | "slots" | "payments">("cards");
  const [cards, setCards] = useState<Tables<"business_cards">[]>([]);
  const [slots, setSlots] = useState<Tables<"slots">[]>([]);
  const [assignments, setAssignments] = useState<(Tables<"slot_assignments"> & { business_cards: Tables<"business_cards"> | null })[]>([]);
  const [payments, setPayments] = useState<Tables<"payments">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin]);

  async function loadAll() {
    const [cardsRes, slotsRes, assignRes, payRes] = await Promise.all([
      supabase.from("business_cards").select("*").order("submitted_at", { ascending: false }),
      supabase.from("slots").select("*").order("id"),
      supabase.from("slot_assignments").select("*, business_cards(*)").order("slot_id"),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ]);
    setCards(cardsRes.data ?? []);
    setSlots(slotsRes.data ?? []);
    setAssignments((assignRes.data as any) ?? []);
    setPayments(payRes.data ?? []);
    setLoading(false);
  }

  async function approveCard(id: string) {
    await supabase.from("business_cards").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Card approved!" });
    loadAll();
  }

  async function rejectCard(id: string) {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    await supabase.from("business_cards").update({ status: "rejected", rejected_at: new Date().toISOString(), rejection_reason: reason }).eq("id", id);
    toast({ title: "Card rejected" });
    loadAll();
  }

  async function assignCardToSlot(cardId: string, slotId: string) {
    // Set all current assignments for this slot to not current
    await supabase.from("slot_assignments").update({ is_current: false }).eq("slot_id", slotId).eq("is_current", true);
    // Create new assignment
    await supabase.from("slot_assignments").insert({
      slot_id: slotId,
      card_id: cardId,
      is_current: true,
      rotation_start: new Date().toISOString(),
      rotation_end: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
      position_in_queue: 0,
    });
    toast({ title: "Card assigned to slot " + slotId });
    loadAll();
  }

  if (authLoading) return <div className="container py-12"><p>Loading...</p></div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) return <div className="container py-12"><p>Loading admin data...</p></div>;

  const pendingCards = cards.filter(c => c.status === "pending");
  const approvedCards = cards.filter(c => c.status === "approved");

  return (
    <div className="container py-8 max-w-6xl">
      <h1 className="font-display text-3xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-muted-foreground mb-6">Manage business cards, slots, and payments</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pending", value: pendingCards.length, icon: Clock, color: "text-amber-500" },
          { label: "Approved", value: approvedCards.length, icon: Check, color: "text-emerald-500" },
          { label: "Slots", value: slots.length, icon: LayoutGrid, color: "text-gold" },
          { label: "Payments", value: payments.length, icon: CreditCard, color: "text-navy" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-1`} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["cards", "slots", "payments"] as const).map(t => (
          <Button key={t} variant={tab === t ? "default" : "outline"} size="sm" onClick={() => setTab(t)}
            className={tab === t ? "bg-navy text-primary-foreground" : ""}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Cards Tab */}
      {tab === "cards" && (
        <div className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Pending Approval ({pendingCards.length})</h2>
          {pendingCards.length === 0 && <p className="text-muted-foreground">No pending cards.</p>}
          {pendingCards.map(card => (
            <div key={card.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{card.business_name}</h3>
                <p className="text-sm text-muted-foreground">{card.business_category} · Submitted {new Date(card.submitted_at).toLocaleDateString()}</p>
                <p className="text-xs text-amber-600 mt-1">Auto-approves: {new Date(card.auto_approve_at!).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveCard(card.id)} className="bg-emerald-600 hover:bg-emerald-700 text-primary-foreground">
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="destructive" onClick={() => rejectCard(card.id)}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          ))}

          <h2 className="font-display text-xl font-semibold mt-8">All Cards ({cards.length})</h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>
                <th className="text-left p-3">Business</th><th className="text-left p-3">Category</th><th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
              </tr></thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="p-3 font-medium">{c.business_name}</td>
                    <td className="p-3">{c.business_category}</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "approved" ? "bg-emerald-100 text-emerald-800" : c.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{c.status}</span></td>
                    <td className="p-3">
                      {c.status === "approved" && (
                        <select onChange={e => { if (e.target.value) assignCardToSlot(c.id, e.target.value); e.target.value = ""; }}
                          className="text-xs border rounded px-2 py-1 bg-background">
                          <option value="">Assign to slot...</option>
                          {slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slots Tab */}
      {tab === "slots" && (
        <div>
          <h2 className="font-display text-xl font-semibold mb-4">Slot Grid (A1-K2)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {slots.map(slot => {
              const current = assignments.find(a => a.slot_id === slot.id && a.is_current);
              return (
                <div key={slot.id} className={`border rounded-lg p-3 ${current ? "border-gold bg-gold/5" : "border-border bg-card"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-sm">{slot.label}</span>
                    <span className={`w-2 h-2 rounded-full ${current ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  </div>
                  {current?.business_cards ? (
                    <p className="text-xs text-foreground truncate">{current.business_cards.business_name}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Empty</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {tab === "payments" && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted"><tr>
              <th className="text-left p-3">Date</th><th className="text-left p-3">Amount</th><th className="text-left p-3">Phone</th><th className="text-left p-3">Receipt</th><th className="text-left p-3">Status</th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3">KES {p.amount}</td>
                  <td className="p-3">{p.phone_number}</td>
                  <td className="p-3 font-mono text-xs">{p.mpesa_receipt || "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
