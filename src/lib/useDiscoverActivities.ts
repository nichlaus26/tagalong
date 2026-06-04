"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

// Brussels center — fallback when geolocation is denied/unavailable
const BRUSSELS_LAT = 50.8503;
const BRUSSELS_LNG = 4.3517;
const GEOLOCATION_TIMEOUT = 5000;

export type DiscoveredActivity = {
  id: string;
  title: string;
  start_time: string;
  lat: number;
  lng: number;
  difficulty: string | null;
  run_subtype: string | null;
  capacity: number | null;
  approved_count: number;
  spots_left: number | null;
  distance_km: number;
  host_id: string;
};

export type DiscoveryFilters = {
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  activityType: string;
  runSubtype: string[] | null;
  difficulty: string[] | null;
  dateFrom: string; // ISO string
  dateTo: string | null;
  onlyOpen: boolean;
};

const DEFAULT_FILTERS: DiscoveryFilters = {
  centerLat: BRUSSELS_LAT,
  centerLng: BRUSSELS_LNG,
  radiusKm: 10,
  activityType: "run",
  runSubtype: null,
  difficulty: null,
  dateFrom: new Date().toISOString(),
  dateTo: null,
  onlyOpen: false,
};

export function useDiscoverActivities() {
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [activities, setActivities] = useState<DiscoveredActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationResolved, setLocationResolved] = useState(false);
  const locationCached = useRef(false);

  // Resolve user location — always try geolocation, use cache as initial value
  useEffect(() => {
    if (locationCached.current) return;

    // Use cached position as an immediate starting point (avoids blank map)
    const cached = sessionStorage.getItem("tagalong_center");
    if (cached) {
      const { lat, lng } = JSON.parse(cached);
      setFilters((f) => ({ ...f, centerLat: lat, centerLng: lng }));
    }

    if (!navigator.geolocation) {
      setLocationResolved(true);
      locationCached.current = true;
      return;
    }

    const timeoutId = setTimeout(() => {
      // Timeout — keep whatever we have (cached or Brussels default)
      setLocationResolved(true);
      locationCached.current = true;
    }, GEOLOCATION_TIMEOUT);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        sessionStorage.setItem("tagalong_center", JSON.stringify({ lat, lng }));
        setFilters((f) => ({ ...f, centerLat: lat, centerLng: lng }));
        setLocationResolved(true);
        locationCached.current = true;
      },
      () => {
        // Denied — keep whatever we have (cached or Brussels default)
        clearTimeout(timeoutId);
        setLocationResolved(true);
        locationCached.current = true;
      },
      { timeout: GEOLOCATION_TIMEOUT, maximumAge: 300000 }
    );
  }, []);

  // Fetch activities whenever filters change (and location is resolved)
  const fetchActivities = useCallback(async () => {
    if (!locationResolved) return;
    setLoading(true);

    const { data, error } = await supabase.rpc("discover_activities", {
      p_lat: filters.centerLat,
      p_lng: filters.centerLng,
      p_radius_km: filters.radiusKm,
      p_activity_type: filters.activityType,
      p_run_subtype: filters.runSubtype,
      p_difficulty: filters.difficulty,
      p_date_from: filters.dateFrom,
      p_date_to: filters.dateTo,
      p_only_open: filters.onlyOpen,
    });

    if (!error && data) {
      setActivities(data as DiscoveredActivity[]);
    }
    setLoading(false);
  }, [filters, locationResolved]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Individual filter setters
  function setRadius(km: number) {
    setFilters((f) => ({ ...f, radiusKm: km }));
  }

  function setRunSubtype(subtypes: string[] | null) {
    setFilters((f) => ({ ...f, runSubtype: subtypes }));
  }

  function setDifficulty(difficulties: string[] | null) {
    setFilters((f) => ({ ...f, difficulty: difficulties }));
  }

  function setDateRange(from: string, to: string | null) {
    setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
  }

  function setOnlyOpen(onlyOpen: boolean) {
    setFilters((f) => ({ ...f, onlyOpen }));
  }

  function setCenter(lat: number, lng: number) {
    sessionStorage.setItem("tagalong_center", JSON.stringify({ lat, lng }));
    setFilters((f) => ({ ...f, centerLat: lat, centerLng: lng }));
  }

  return {
    activities,
    loading,
    locationResolved,
    filters,
    setRadius,
    setRunSubtype,
    setDifficulty,
    setDateRange,
    setOnlyOpen,
    setCenter,
    refetch: fetchActivities,
  };
}
