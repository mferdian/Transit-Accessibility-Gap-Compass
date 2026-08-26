'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import FilterPanel from '@/components/FilterPanel';
import RecommendationPanel from '@/components/RecommendationPanel';
import { SKAParameters, GeoJSONFeatureCollection, RecommendationPoint } from '@/lib/types';
import { fetchGapMap, fetchRecommendations } from '@/lib/api';

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

  // Recommendations state
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationPoint[]>([]);
  const [isRecLoading, setIsRecLoading] = useState<boolean>(false);

  const loadData = async (currentWeights: SKAParameters) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchGapMap(currentWeights);
      setGeoData(data);
      // If recommendations panel is open, refresh it with new weights
      if (showRecommendations) {
        await loadRecommendations(currentWeights);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat data peta.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendations = async (currentWeights: SKAParameters) => {
    setIsRecLoading(true);
    try {
      const data = await fetchRecommendations(currentWeights, 0.5, 400);
      setRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat rekomendasi halte.");
    } finally {
      setIsRecLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadData(weights);
  }, []);

  const handleApplyFilter = () => {
    loadData(weights);
  };

  const handleToggleRecommendations = () => {
    if (!showRecommendations) {
      loadRecommendations(weights);
    }
    setShowRecommendations(!showRecommendations);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      <FilterPanel 
        weights={weights} 
        onWeightsChange={setWeights} 
        onApply={handleApplyFilter}
        onToggleRecommendations={handleToggleRecommendations}
        isLoading={isLoading}
      />
      
      {showRecommendations && (
        <RecommendationPanel 
          recommendations={recommendations}
          isLoading={isRecLoading}
          onClose={() => setShowRecommendations(false)}
          onItemClick={(lat, lon) => {
             // In a real app we would flyTo this location on the map
             console.log(`Zoom to: ${lat}, ${lon}`);
          }}
        />
      )}

      {error && (
        <div className="absolute top-6 right-1/2 translate-x-1/2 z-[20] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="w-full h-full relative z-[10]">
        <MapView 
          geoData={geoData} 
          recommendationData={showRecommendations ? recommendations : undefined}
        />
      </div>
    </div>
  );
}
