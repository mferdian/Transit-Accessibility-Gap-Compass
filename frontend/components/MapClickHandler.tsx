'use client';

import { useMapEvents } from 'react-leaflet';

interface MapClickHandlerProps {
  enabled: boolean;
  onClick?: (lat: number, lon: number) => void;
}

export default function MapClickHandler({ enabled, onClick }: MapClickHandlerProps) {
  useMapEvents({
    click(event) {
      if (!enabled) return;
      onClick?.(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}
