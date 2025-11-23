"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Voter } from "@/lib/types";
import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function EditVoterPage() {
  const params = useParams();
  const router = useRouter();
  const sec_id = params.sec_id as string;

  const [voter, setVoter] = useState<Voter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // GPS States
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    axios
      .get(`/api/voters/${sec_id}`)
      .then((res) => setVoter(res.data.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [sec_id]);

  const handleSave = async () => {
    if (!voter) return;
    setSaving(true);

    try {
      await axios.put(`/api/voters/update/${sec_id}`, voter);
      router.push(`/voter/${sec_id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------
  // 🚀 MANUAL GPS WATCH FUNCTION (with full errors)
  // ---------------------------------------------
  const handleWatchGPS = () => {
    if (typeof window === "undefined") return;

    if (!navigator.geolocation) {
      alert("GPS not supported on this device");
      return;
    }

    setGpsLoading(true);
    setGpsAccuracy(null);

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        console.log("GPS:", lat, lng, "ACC:", acc);

        setGpsAccuracy(acc);

        // Auto-stop when accuracy <= 30m
        if (acc <= 30) {
          navigator.geolocation.clearWatch(id);
          setWatchId(null);
          setGpsLoading(false);

          setVoter((prev) => ({
            ...prev!,
            latitude: lat,
            longitude: lng,
          }));
        }
      },

      (err) => {
        console.error("GPS Error:", {
          code: err?.code,
          message: err?.message,
        });

        let msg = "GPS error occurred.";

        switch (err.code) {
          case 1:
            msg = "Permission denied. Please allow location access.";
            break;
          case 2:
            msg = "Location unavailable. Try turning on GPS or going outdoors.";
            break;
          case 3:
            msg = "GPS timeout. Please try again.";
            break;
          default:
            msg = "Unknown GPS error.";
        }

        alert(msg);
        setGpsLoading(false);
      },

      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );

    setWatchId(id);
  };

  // ---------------------------------------------
  // Accuracy Bar Calculation
  // ---------------------------------------------
  const accuracyPercentage =
    gpsAccuracy != null
      ? Math.min((100 - gpsAccuracy) / 100 * 100, 100)
      : 0;

  const accuracyColor =
    gpsAccuracy == null
      ? "bg-gray-300"
      : gpsAccuracy <= 30
      ? "bg-green-500"
      : gpsAccuracy <= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  if (loading)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );

  if (!voter)
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">Voter not found.</p>
        </main>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Voter</h1>

        <Card className="p-6">
          <div className="space-y-6">

            {/* INPUT FIELDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="text-sm font-medium">Phone</label>
                <Input
                  value={voter.phone || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Alternate Phone</label>
                <Input
                  value={voter.alternate_phone || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, alternate_phone: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">House Name</label>
                <Input
                  value={voter.house_name || ""}
                  onChange={(e) =>
                    setVoter({ ...voter, house_name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">House No</label>
                <Input
                  value={voter.house_no}
                  onChange={(e) =>
                    setVoter({ ...voter, house_no: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Latitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={voter.latitude || ""}
                  onChange={(e) =>
                    setVoter({
                      ...voter,
                      latitude: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input
                  type="number"
                  step="0.000001"
                  value={voter.longitude || ""}
                  onChange={(e) =>
                    setVoter({
                      ...voter,
                      longitude: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* 🎯 GPS LOCATE BUTTON */}
            <Button
              onClick={handleWatchGPS}
              disabled={gpsLoading}
              variant="outline"
              className="flex items-center gap-2 w-full"
            >
              {gpsLoading ? "Locating…" : "🎯 Get Accurate GPS (≤30m)"}
            </Button>

            {/* 📍 GPS ACCURACY PROGRESS BAR */}
            {gpsLoading && (
              <div className="w-full mt-2">
                <p className="text-sm text-muted-foreground mb-1">
                  Accuracy: {gpsAccuracy ? gpsAccuracy.toFixed(1) : "..."} meters
                </p>

                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${accuracyColor} transition-all duration-300`}
                    style={{ width: `${accuracyPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* SAVE BUTTONS */}
            <div className="flex gap-4 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>

              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
