'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import FilterPanel from '@/components/FilterPanel';
import { SKAParameters, GeoJSONFeatureCollection } from '@/lib/types';
import { fetchGapMap } from '@/lib/api';

export default function ClientDashboard() {
  const [weights, setWeights] = useState<SKAParameters>({
    w1: 0.3,
    w2: 0.3,
    w3: 0.25,
    w4: 0.15
  });
  
  const [geoData, setGeoData] = useState<GeoJSONFeatureCollection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (currentWeights: SKAParameters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGapMap(currentWeights);
      setGeoData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data peta.");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(weights);
  }, []);

  const handleApplyFilter = () => {
    loadData(weights);
  };

  return (
    <>
      <FilterPanel 
        weights={weights} 
        onWeightsChange={setWeights} 
        onApply={handleApplyFilter}
        isLoading={isLoading}
      />
      
      {error && (
        <div className="absolute top-6 right-6 z-[20] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="w-full h-full relative z-[10]">
        <MapView geoData={geoData} />
      </div>
    </>
  );
}
