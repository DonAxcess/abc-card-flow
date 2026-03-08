import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, LayoutDashboard, Shield } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 gradient-navy border-b border-navy-light/30">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center font-display font-bold text-accent-foreground text-sm">
            ABC
          </div>
          <span className="font-display text-lg font-semibold text-primary-foreground hidden sm:block">
            Axcess Business Community
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          <Link to="/" className="text-primary-foreground/80 hover:text-gold transition-colors text-sm font-medium">Directory</Link>
          {user && (
            <Link to="/dashboard" className="text-primary-foreground/80 hover:text-gold transition-colors text-sm font-medium flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="text-primary-foreground/80 hover:text-gold transition-colors text-sm font-medium flex items-center gap-1">
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut} className="border-gold/50 text-primary-foreground hover:bg-gold/20">
              <LogOut className="w-4 h-4 mr-1" /> Sign Out
            </Button>
          ) : (
            <Button size="sm" onClick={() => navigate("/auth")} className="bg-gold text-accent-foreground hover:bg-gold-light">
              Sign In
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-primary-foreground" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden gradient-navy border-t border-navy-light/30 pb-4 px-4 space-y-2">
          <Link to="/" onClick={() => setOpen(false)} className="block text-primary-foreground/80 py-2">Directory</Link>
          {user && <Link to="/dashboard" onClick={() => setOpen(false)} className="block text-primary-foreground/80 py-2">Dashboard</Link>}
          {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block text-primary-foreground/80 py-2">Admin</Link>}
          {user ? (
            <button onClick={() => { signOut(); setOpen(false); }} className="text-primary-foreground/80 py-2">Sign Out</button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="block text-gold py-2">Sign In</Link>
          )}
        </div>
      )}
    </nav>
  );
}
