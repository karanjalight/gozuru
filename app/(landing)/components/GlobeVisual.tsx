"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useCallback, useRef, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { GlobeMethods } from "react-globe.gl";
import { WORLD_CITIES } from "@/lib/world-cities";
import { cn } from "@/lib/utils";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// Same as globe.gl world-cities example: https://github.com/vasturiano/globe.gl/tree/master/example/world-cities
const EARTH_NIGHT =
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-night.jpg";
const EARTH_DAY =
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.0/example/img/earth-day.jpg";
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

interface GlobeVisualProps {
  variant?: "hero" | "full";
  className?: string;
}

const AUTO_ROTATE_SPEED = 0.4; // rotations per minute

export function GlobeVisual({ variant = "full", className }: GlobeVisualProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [places, setPlaces] = useState<GeoFeature[]>([]);
  const isHero = variant === "hero";

  const enableAutoRotate = useCallback(() => {
    const controls = globeRef.current?.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = AUTO_ROTATE_SPEED;
    }
  }, []);

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

  // Hero: same as 404 world-cities (labels, atmosphere, night-sky when dark); light = day texture, no starfield
  const globeImageUrl = isHero && !isDark ? EARTH_DAY : EARTH_NIGHT;
  const backgroundImageUrl = isHero ? (isDark ? NIGHT_SKY : "") : NIGHT_SKY;
  const showAtmosphere = true;
  const atmosphereColor = isDark ? "rgba(100, 150, 255, 0.4)" : "rgba(100, 150, 255, 0.25)";
  const atmosphereAltitude = isHero ? 0.2 : 0.2;
  const labelColorFn = () => (isDark ? "rgba(255, 165, 0, 0.75)" : "rgba(180, 90, 0, 0.85)");

  return (
    <motion.div
      className={cn("absolute inset-0 overflow-hidden", className)}
      initial={isHero ? { opacity: 0 } : undefined}
      animate={
        isHero
          ? { opacity: 1, y: [0, -6, 0] }
          : { opacity: 1 }
      }
      transition={
        isHero
          ? {
              opacity: { duration: 1.2 },
              y: { duration: 8, repeat: Infinity, ease: "easeInOut" as const },
            }
          : { duration: 1.2 }
      }
    >
      <div
        className={cn(
          "h-full w-full",
          isHero && "opacity-100"
        )}
        style={{
          background: isHero ? "transparent" : isDark ? "var(--globe-bg, #0a0a0f)" : "transparent",
        }}
      >
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={globeImageUrl}
          backgroundImageUrl={backgroundImageUrl}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={showAtmosphere}
          atmosphereColor={atmosphereColor}
          atmosphereAltitude={atmosphereAltitude}
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
          labelColor={labelColorFn}
          labelResolution={2}
          enablePointerInteraction={!isHero}
          onGlobeReady={enableAutoRotate}
        />
      </div>
    </motion.div>
  );
}
