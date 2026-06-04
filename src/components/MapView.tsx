"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { DiscoveredActivity } from "@/lib/useDiscoverActivities";

// OpenFreeMap — full OpenStreetMap detail, free, no API key
const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

type Props = {
  activities: DiscoveredActivity[];
  centerLat: number;
  centerLng: number;
  radiusKm: number;
};

export default function MapView({ activities, centerLat, centerLng, radiusKm }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [preview, setPreview] = useState<DiscoveredActivity | null>(null);

  // Track the last center/zoom we set so we can detect real changes
  const lastCenter = useRef({ lat: 0, lng: 0, radius: 0 });

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: TILE_STYLE,
      center: [centerLng, centerLat],
      zoom: getZoomForRadius(radiusKm),
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;
    lastCenter.current = { lat: centerLat, lng: centerLng, radius: radiusKm };

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center/zoom when location or radius changes
  useEffect(() => {
    if (!mapRef.current) return;
    const prev = lastCenter.current;
    if (prev.lat === centerLat && prev.lng === centerLng && prev.radius === radiusKm) return;
    lastCenter.current = { lat: centerLat, lng: centerLng, radius: radiusKm };

    mapRef.current.flyTo({
      center: [centerLng, centerLat],
      zoom: getZoomForRadius(radiusKm),
      duration: 800,
    });
  }, [centerLat, centerLng, radiusKm]);

  // Update markers when activities change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    activities.forEach((activity) => {
      if (activity.lat == null || activity.lng == null) return;

      const el = document.createElement("div");
      el.className = "mapview-pin";
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#000";
      el.style.border = "3px solid #fff";
      el.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        setPreview(activity);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([activity.lng, activity.lat])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [activities]);

  // Close preview when clicking the map
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handler = () => setPreview(null);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, []);

  function formatDate(iso: string) {
    const d = new Date(iso);
    return (
      d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[50vh] rounded-lg overflow-hidden" />

      {/* Activity preview card */}
      {preview && (
        <div className="absolute bottom-3 left-3 right-3">
          <Link
            href={`/activities/${preview.id}`}
            className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-lg hover:border-zinc-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{preview.title}</h3>
              {preview.difficulty && (
                <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 capitalize">
                  {preview.difficulty}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-col gap-0.5 text-sm text-zinc-500">
              <p>{formatDate(preview.start_time)}</p>
              {preview.run_subtype && (
                <p className="capitalize">{preview.run_subtype.replace(/_/g, " ")}</p>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-400">
                {preview.distance_km.toFixed(1)} km away
              </span>
              {preview.capacity != null && (
                <span className="text-zinc-400">
                  {preview.spots_left != null && preview.spots_left > 0
                    ? `${preview.spots_left} spot${preview.spots_left === 1 ? "" : "s"} left`
                    : "Full"}
                </span>
              )}
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// Map radius to a reasonable zoom level
function getZoomForRadius(km: number): number {
  if (km <= 5) return 13;
  if (km <= 10) return 12;
  if (km <= 25) return 11;
  return 10;
}
