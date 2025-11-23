"use client";

import Link from "next/link";
import {
  Users,
  Search,
  Map,
  Plus,
  LogOut,
  LogIn,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, signOut, signIn } from "next-auth/react";
import { useState } from "react";
import FavoritesPopup from "@/components/FavoritesPopup";

export function Navbar() {
  const { data: session } = useSession();

  const [favOpen, setFavOpen] = useState(false);

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="w-full max-w-6xl mx-auto px-4 py-4 flex items-center justify-between relative">
        <Link
          href="/"
          className="font-bold text-xl text-foreground hover:text-primary transition"
        >
          Voter Census
        </Link>

        {/* Desktop Nav */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" asChild className="gap-2">
            <Link href="/">
              <Users className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>

          <Button variant="ghost" asChild className="gap-2">
            <Link href="/search">
              <Search className="w-4 h-4" />
              Search
            </Link>
          </Button>

          <Button variant="ghost" asChild className="gap-2">
            <Link href="/map">
              <Map className="w-4 h-4" />
              Map
            </Link>
          </Button>

          <Button asChild className="gap-2">
            <Link href="/add-voter">
              <Plus className="w-4 h-4" />
              Add Voter
            </Link>
          </Button>

          {/* ❤️ Favorites Popup Trigger (ONLY when logged in) */}
          {session && (
            <>
              <Button
                variant="ghost"
                className="gap-2"
                onClick={() => setFavOpen(!favOpen)}
              >
                <Heart className="w-4 h-4 text-red-500" />
                Favorites
              </Button>

              {/* Popup Component */}
              <FavoritesPopup open={favOpen} onClose={() => setFavOpen(false)} />
            </>
          )}

          {/* 🔐 Login / Logout */}
          {session ? (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => signIn()}
            >
              <LogIn className="w-4 h-4" />
              Login
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navbar */}
      <div className="sm:hidden fixed bottom-0 left-0 w-full bg-background border-t border-border flex justify-around py-2 z-50">
        <Link
          href="/"
          className="flex flex-col items-center text-xs text-muted-foreground"
        >
          <Users className="w-5 h-5" />
          Dashboard
        </Link>

        <Link
          href="/search"
          className="flex flex-col items-center text-xs text-muted-foreground"
        >
          <Search className="w-5 h-5" />
          Search
        </Link>

        <Link
          href="/map"
          className="flex flex-col items-center text-xs text-muted-foreground"
        >
          <Map className="w-5 h-5" />
          Map
        </Link>

        <Link
          href="/add-voter"
          className="flex flex-col items-center text-xs text-muted-foreground"
        >
          <Plus className="w-5 h-5" />
          Add
        </Link>

        {/* ❤️ Favorite Popup Trigger (mobile) */}
        {session && (
          <button
            className="flex flex-col items-center text-xs text-muted-foreground"
            onClick={() => setFavOpen(!favOpen)}
          >
            <Heart className="w-5 h-5 text-red-500" />
            Fav
          </button>
        )}

        {/* 🔐 Mobile Logout/Login */}
        {session ? (
          <button
            className="flex flex-col items-center text-xs text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        ) : (
          <button
            className="flex flex-col items-center text-xs text-muted-foreground"
            onClick={() => signIn()}
          >
            <LogIn className="w-5 h-5" />
            Login
          </button>
        )}
      </div>
    </nav>
  );
}
