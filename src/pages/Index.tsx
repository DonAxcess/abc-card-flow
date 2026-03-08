import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import BusinessCard from "@/components/BusinessCard";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type CardWithSlot = Tables<"business_cards"> & { slot_label?: string };

export default function Index() {
  const [cards, setCards] = useState<CardWithSlot[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    // Get current slot assignments with their cards
    const { data: assignments } = await supabase
      .from("slot_assignments")
      .select("slot_id, card_id, business_cards(*)")
      .eq("is_current", true);

    // Also get approved cards not in slots
    const { data: approvedCards } = await supabase
      .from("business_cards")
      .select("*")
      .eq("status", "approved");

    const slotCardIds = new Set(assignments?.map(a => a.card_id) ?? []);
    const slotCards: CardWithSlot[] = (assignments ?? [])
      .filter(a => a.business_cards)
      .map(a => ({ ...(a.business_cards as Tables<"business_cards">), slot_label: a.slot_id }));

    const otherCards: CardWithSlot[] = (approvedCards ?? [])
      .filter(c => !slotCardIds.has(c.id));

    setCards([...slotCards, ...otherCards]);
    setLoading(false);
  }

  const filtered = cards.filter(c =>
    c.business_name.toLowerCase().includes(search.toLowerCase()) ||
    c.business_category.toLowerCase().includes(search.toLowerCase()) ||
    (c.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="gradient-hero py-20 px-4">
        <div className="container text-center">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-primary-foreground mb-4 animate-fade-in">
            Axcess Business <span className="text-gradient-gold">Community</span>
          </h1>
          <p className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Discover and connect with trusted businesses from our church community. 
            Supporting each other, growing together.
          </p>
          <div className="max-w-md mx-auto relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search businesses by name, category, or location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 bg-card/95 border-gold/30 h-12 text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </section>

      {/* Directory Grid */}
      <section className="container py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border h-72 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              {search ? "No businesses match your search." : "No businesses listed yet. Be the first!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((card, i) => (
              <div key={card.id} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                <BusinessCard card={card} slotLabel={card.slot_label} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
