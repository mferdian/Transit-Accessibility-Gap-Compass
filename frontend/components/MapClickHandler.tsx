'use client';

import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  enabled: boolean;
  onClick?: (lat: number, lon: number) => void;
  centerTarget?: { lat: number; lon: number; zoom?: number } | null;
  onPanesReady?: () => void;
}

export default function MapClickHandler({ enabled, onClick, centerTarget, onPanesReady }: MapClickHandlerProps) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const map = useMapEvents({
    click(event) {
      if (!enabledRef.current) return;
      onClickRef.current?.(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    if (!map) return;

    const paneConfigs: Array<[string, number]> = [
      ['skaPane', 340],             // Base SKA regional choropleth
      ['demografiPane', 370],       // Kelurahan administrative boundaries
      ['areaRekomendasiPane', 410], // Recommendation coverage buffer
      ['areaGapPane', 460],         // Area GAP (critical priority polygons - above other areas)
      ['simulationPane', 550],      // Simulation What-If marker
      ['pointsPane', 650],          // Points & stops
      ['beaconPane', 670],          // Active stop radar beacon & focus
    ];

    paneConfigs.forEach(([name, zIndex]) => {
      if (!map.getPane(name)) {
        const pane = map.createPane(name);
        pane.style.zIndex = String(zIndex);
      }
    });

    onPanesReady?.();
  }, [map, onPanesReady]);

  useEffect(() => {
    if (centerTarget && map) {
      try {
        map.flyTo([centerTarget.lat, centerTarget.lon], centerTarget.zoom ?? 15, { duration: 1.2 });
      } catch {
        // ignore if map unmounted
      }
    }
  }, [centerTarget, map]);

  return null;
}

