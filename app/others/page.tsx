"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface OtherVoter {
  name: string | null;
  guardian_name: string | null;
  ward_number: string | null;
  booth_number: string | null;
  age: number | null;
  gender: string | null;
  sec_id: string | null;
}

export default function OthersPage() {
  const [data, setData] = useState<OtherVoter[]>([]);
  const [filtered, setFiltered] = useState<OtherVoter[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Load missing/other-gender voters
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get("/api/voters/others");
        setData(res.data.data || []);
        setFiltered(res.data.data || []);
      } catch (err) {
        console.error("Error loading others:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Search filter
  useEffect(() => {
    const s = search.toLowerCase();

    setFiltered(
      data.filter(
        (v) =>
          (v.name || "").toLowerCase().includes(s) ||
          (v.guardian_name || "").toLowerCase().includes(s) ||
          (v.sec_id || "").toLowerCase().includes(s)
      )
    );
  }, [search, data]);

  // Update gender using NEW API "/api/voters/update-gender"
  async function updateGender(sec_id: string | null, newGender: string) {
    if (!sec_id) return alert("Invalid SEC ID");

    try {
      await axios.post("/api/voters/update-gender", {
        sec_id,
        gender: newGender,
      });

      // Update UI instantly after change
      setData((prev) =>
        prev.map((v) =>
          v.sec_id === sec_id ? { ...v, gender: newGender } : v
        )
      );

      setFiltered((prev) =>
        prev.map((v) =>
          v.sec_id === sec_id ? { ...v, gender: newGender } : v
        )
      );

      alert("Gender updated successfully!");
    } catch (err) {
      console.error("Gender update error:", err);
      alert("Failed to update gender");
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="container mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Other / Missing Gender Voters</h1>

        <p className="text-muted-foreground mb-4">
          These voters have missing, invalid, or non-standard gender values.
        </p>

        <Input
          placeholder="Search by name, guardian name, or SEC ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-6"
        />

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((v, i) => (
              <Card key={i} className="p-4">
                <h2 className="font-bold text-lg">{v.name || "Unnamed"}</h2>

                <p className="text-sm text-muted-foreground">
                  SEC ID: {v.sec_id || "-"}
                </p>

                <p className="text-sm">Guardian: {v.guardian_name || "-"}</p>
                <p className="text-sm">Ward: {v.ward_number || "-"}</p>
                <p className="text-sm">Booth: {v.booth_number || "-"}</p>
                <p className="text-sm">Age: {v.age || "-"}</p>

                {/* Gender Selector */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm">Gender:</span>

                  <select
                    className="border p-1 rounded text-sm"
                    value={v.gender || ""}
                    onChange={(e) =>
                      updateGender(v.sec_id, e.target.value)
                    }
                  >
                    <option value="">(missing)</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                {/* Edit Button */}
                <button
                  className="mt-4 text-sm px-3 py-2 rounded border hover:bg-accent transition"
                  onClick={() =>
                    (window.location.href = `/edit-voter?sec_id=${v.sec_id}`)
                  }
                >
                  Edit Full Record
                </button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
