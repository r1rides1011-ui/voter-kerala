"use client";

import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const markerIcon = L.icon({
  iconUrl: "/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Distance (meters)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveGPS({
  threshold = 25,
  onLock,
}: {
  threshold?: number;
  onLock: (lat: number, lng: number, acc: number) => void;
}) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  const readings = useRef<
    { lat: number; lng: number; acc: number; ts: number }[]
  >([]);
  const last = useRef<{ lat: number; lng: number; ts: number } | null>(null);

  useEffect(() => {
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const { latitude, longitude, accuracy } = p.coords;
        const ts = Date.now();

        // Ignore bad readings
        if (accuracy > 150) return;

        // Detect movement (must be standing still)
        if (last.current) {
          const d = haversine(last.current.lat, last.current.lng, latitude, longitude);
          const dt = (ts - last.current.ts) / 1000;
          const speed = d / dt;

          if (speed > 1.5) {
            console.log("Skipping reading — user moving");
            return;
          }
        }

        last.current = { lat: latitude, lng: longitude, ts };

        // Add sample
        readings.current.push({ lat: latitude, lng: longitude, acc: accuracy, ts });
        if (readings.current.length > 20) readings.current.shift();

        // Weighted average
        const weights = readings.current.map((r) => 1 / r.acc);
        const total = weights.reduce((a, b) => a + b, 0);

        const avgLat =
          readings.current.reduce((a, r, i) => a + r.lat * weights[i], 0) / total;
        const avgLng =
          readings.current.reduce((a, r, i) => a + r.lng * weights[i], 0) / total;

        const bestAcc = Math.min(...readings.current.map((r) => r.acc));

        setPos({ lat: avgLat, lng: avgLng });
        setAccuracy(bestAcc);

        console.log("📡 GPS AVG:", {
          avgLat,
          avgLng,
          bestAcc,
          samples: readings.current.length,
        });

        // Auto lock if accuracy meets threshold
        if (bestAcc <= threshold && !locked) {
          setLocked(true);
          navigator.geolocation.clearWatch(id);
          onLock(avgLat, avgLng, bestAcc);
        }
      },
      (err) => console.error("GPS Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [threshold, locked]);

  return (
    <div className="space-y-3 mt-8">
      <div className="p-4 border rounded-lg bg-white shadow">
        <p><strong>Status:</strong> {locked ? "Locked ✓" : "Calibrating…"}</p>
        <p><strong>Accuracy:</strong> {accuracy ? Math.round(accuracy) : "--"}m</p>
        <p><strong>Samples:</strong> {readings.current.length}</p>
      </div>

      {pos && (
        <MapContainer
          center={[pos.lat, pos.lng]}
          zoom={19}
          style={{ height: "300px", width: "100%", borderRadius: "12px" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[pos.lat, pos.lng]} icon={markerIcon} />
        </MapContainer>
      )}
    </div>
  );
}
