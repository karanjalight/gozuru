"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { WORLD_CITIES } from "@/lib/world-cities";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// Same assets as globe.gl world-cities example
const EARTH_NIGHT =
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-night.jpg";
const NIGHT_SKY =
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/night-sky.png";
const GEOJSON_URL =
  "https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@master/example/datasets/ne_110m_populated_places_simple.geojson";

type GeoFeature = {
  type: string;
  properties: {
    latitude: number;
    longitude: number;
    name: string;
    pop_max: number;
  };
  geometry: { type: string; coordinates: number[] };
};

// Fallback when GeoJSON fetch fails (same shape as Natural Earth features)
const fallbackPlaces: GeoFeature[] = WORLD_CITIES.map((c) => ({
  type: "Feature",
  properties: {
    latitude: c.lat,
    longitude: c.lng,
    name: c.name,
    pop_max: 100000,
  },
  geometry: { type: "Point", coordinates: [c.lng, c.lat] },
}));

export function Globe404() {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [places, setPlaces] = useState<GeoFeature[]>([]);

  useEffect(() => {
    const updateSize = () =>
      setDimensions({
        width: typeof window !== "undefined" ? window.innerWidth : 800,
        height: typeof window !== "undefined" ? window.innerHeight : 600,
      });
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data: { features?: GeoFeature[] }) => {
        const features = data.features ?? [];
        if (features.length > 0) setPlaces(features);
        else setPlaces(fallbackPlaces);
      })
      .catch(() => setPlaces(fallbackPlaces));
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#000011]">
      <Globe
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl={EARTH_NIGHT}
        backgroundImageUrl={NIGHT_SKY}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor="rgba(100, 150, 255, 0.4)"
        atmosphereAltitude={0.2}
        labelsData={places}
        labelLat={(d) => (d as GeoFeature).properties.latitude}
        labelLng={(d) => (d as GeoFeature).properties.longitude}
        labelText={(d) => (d as GeoFeature).properties.name}
        labelSize={(d) =>
          Math.sqrt((d as GeoFeature).properties.pop_max) * 4e-4
        }
        labelDotRadius={(d) =>
          Math.sqrt((d as GeoFeature).properties.pop_max) * 4e-4
        }
        labelColor={() => "rgba(255, 165, 0, 0.75)"}
        labelResolution={2}
        enablePointerInteraction
      />
    </div>
  );
}
