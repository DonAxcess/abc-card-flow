import { Tables } from "@/integrations/supabase/types";
import { MapPin, Phone, Mail, Globe } from "lucide-react";

interface Props {
  card: Tables<"business_cards">;
  slotLabel?: string;
}

export default function BusinessCard({ card, slotLabel }: Props) {
  return (
    <div className="group relative bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {slotLabel && (
        <span className="absolute top-2 right-2 text-xs font-mono bg-navy/80 text-primary-foreground px-2 py-0.5 rounded">
          {slotLabel}
        </span>
      )}

      {card.card_image_url ? (
        <div className="h-40 bg-muted overflow-hidden">
          <img src={card.card_image_url} alt={card.business_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      ) : (
        <div className="h-40 gradient-navy flex items-center justify-center">
          {card.logo_url ? (
            <img src={card.logo_url} alt={card.business_name} className="w-20 h-20 object-contain rounded-lg" />
          ) : (
            <span className="text-3xl font-display font-bold text-gold">{card.business_name.charAt(0)}</span>
          )}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-foreground text-lg leading-tight">{card.business_name}</h3>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
            {card.business_category}
          </span>
        </div>
        {card.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{card.description}</p>
        )}
        <div className="pt-2 space-y-1 text-sm text-muted-foreground">
          {card.location && (
            <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gold" />{card.location}</div>
          )}
          {card.contact_phone && (
            <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gold" />{card.contact_phone}</div>
          )}
          {card.contact_email && (
            <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gold" />{card.contact_email}</div>
          )}
          {card.contact_website && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-gold" />
              <a href={card.contact_website} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline truncate">{card.contact_website}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
