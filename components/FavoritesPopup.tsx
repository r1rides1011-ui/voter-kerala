"use client";

import { useEffect, useState } from "react";
import { Heart, X } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function FavoritesPopup({ open, onClose }: any) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load FAVORITES only once
  useEffect(() => {
    if (!loaded) loadFavorites();
  }, [loaded]);

  async function loadFavorites() {
    const res = await axios.get("/api/favorites/list");
    setFavorites(res.data || []);
    setLoaded(true);
  }

  async function remove(sec_id: string) {
    await axios.post("/api/favorites/toggle", { sec_id });

    // update local favorites without refetching
    setFavorites((prev) => prev.filter((v) => v.sec_id !== sec_id));
  }

  if (!open) return null;

  return (
    <div className="absolute right-4 top-16 w-96 bg-white shadow-xl rounded-xl p-4 border z-50">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-semibold text-lg">Your Favorites</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {favorites.length === 0 ? (
        <p className="text-sm text-gray-500">No favorites yet.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto pr-1 custom-scroll">
          {favorites.map((voter: any) => (
            <div
              key={voter.sec_id}
              className="flex items-center justify-between py-1.5 border-b last:border-b-0 hover:bg-gray-50 rounded px-1 transition"
            >
              <Link
                href={`/voter/${voter.sec_id}`}
                className="flex flex-col flex-1 cursor-pointer"
              >
                <span className="text-sm font-medium leading-tight truncate">
                  {voter.name}
                </span>
                <span className="text-[10px] text-gray-500 leading-tight">
                  {voter.sec_id}
                </span>
              </Link>

              <button onClick={() => remove(voter.sec_id)}>
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
