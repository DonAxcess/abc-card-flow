import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, CreditCard, Clock } from "lucide-react";
import BusinessCard from "@/components/BusinessCard";
import LogoUpload from "@/components/LogoUpload";

const CATEGORIES = ["General", "Food & Beverage", "Technology", "Health", "Education", "Fashion", "Construction", "Transport", "Finance", "Agriculture", "Beauty", "Real Estate", "Other"];

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<Tables<"business_cards">[]>([]);
  const [payments, setPayments] = useState<Tables<"payments">[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Tables<"business_cards"> | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    const [cardsRes, paymentsRes] = await Promise.all([
      supabase.from("business_cards").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("payments").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
    ]);
    setCards(cardsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setLoading(false);
  }

  function openEdit(card: Tables<"business_cards">) {
    setEditingCard(card);
    setBusinessName(card.business_name);
    setCategory(card.business_category);
    setDescription(card.description ?? "");
    setContactPhone(card.contact_phone ?? "");
    setContactEmail(card.contact_email ?? "");
    setContactWebsite(card.contact_website ?? "");
    setLocation(card.location ?? "");
    setLogoUrl(card.logo_url ?? "");
    setShowForm(true);
  }

  function resetForm() {
    setEditingCard(null);
    setBusinessName(""); setCategory("General"); setDescription("");
    setContactPhone(""); setContactEmail(""); setContactWebsite(""); setLocation("");
    setLogoUrl("");
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const data = {
      business_name: businessName,
      business_category: category,
      description,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      contact_website: contactWebsite,
      location,
      user_id: user.id,
    };

    if (editingCard) {
      const { error } = await supabase.from("business_cards").update(data).eq("id", editingCard.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Card updated!" });
    } else {
      const { error } = await supabase.from("business_cards").insert(data);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Card submitted!", description: "It will be auto-approved in 24 hours unless an admin reviews it first." });
    }
    resetForm();
    loadData();
  }

  async function handleMockPayment(cardId: string) {
    if (!user) return;
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      card_id: cardId,
      amount: 100,
      phone_number: "0712345678",
      status: "completed",
      mpesa_receipt: `MOCK${Date.now()}`,
      description: "Slot placement fee",
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Payment successful!", description: "Mock M-Pesa payment completed. Your card will be queued for a slot." });
    loadData();
  }

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-emerald-100 text-emerald-800";
    if (s === "pending") return "bg-amber-100 text-amber-800";
    if (s === "rejected") return "bg-red-100 text-red-800";
    return "bg-muted text-muted-foreground";
  };

  if (loading) return <div className="container py-12"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your business cards and payments</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="bg-gold text-accent-foreground hover:bg-gold-light">
            <Plus className="w-4 h-4 mr-1" /> New Card
          </Button>
        )}
      </div>

      {/* Card Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-8 space-y-4 animate-fade-in">
          <h2 className="font-display text-xl font-semibold">{editingCard ? "Edit Business Card" : "Submit New Business Card"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Business Name *</Label><Input value={businessName} onChange={e => setBusinessName(e.target.value)} required /></div>
            <div>
              <Label>Category</Label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Phone</Label><Input value={contactPhone} onChange={e => setContactPhone(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={contactWebsite} onChange={e => setContactWebsite(e.target.value)} /></div>
            <div><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div className="flex gap-3">
            <Button type="submit" className="bg-gold text-accent-foreground hover:bg-gold-light">{editingCard ? "Update Card" : "Submit Card"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {/* My Cards */}
      <h2 className="font-display text-xl font-semibold mb-4">My Business Cards</h2>
      {cards.length === 0 ? (
        <p className="text-muted-foreground mb-8">You haven't submitted any business cards yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {cards.map(card => (
            <div key={card.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold">{card.business_name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(card.status)}`}>{card.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{card.business_category} · {card.location || "No location"}</p>
              {card.status === "pending" && (
                <p className="text-xs text-amber-600 flex items-center gap-1 mb-3">
                  <Clock className="w-3.5 h-3.5" /> Auto-approves {new Date(card.auto_approve_at!).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(card)}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                {card.status === "approved" && (
                  <Button size="sm" onClick={() => handleMockPayment(card.id)} className="bg-gold text-accent-foreground hover:bg-gold-light">
                    <CreditCard className="w-3.5 h-3.5 mr-1" /> Pay for Slot (KES 100)
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payments */}
      <h2 className="font-display text-xl font-semibold mb-4">Payment History</h2>
      {payments.length === 0 ? (
        <p className="text-muted-foreground">No payments yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Receipt</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3">KES {p.amount}</td>
                  <td className="p-3 font-mono text-xs">{p.mpesa_receipt || "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(p.status)}`}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
