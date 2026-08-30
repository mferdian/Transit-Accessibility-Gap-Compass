'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import FilterPanel from '@/components/FilterPanel';
import RecommendationPanel from '@/components/RecommendationPanel';
import LayerTogglePanel from '@/components/LayerTogglePanel';
import FeatureDetailPanel from '@/components/FeatureDetailPanel';
import SimulationPanel from '@/components/SimulationPanel';
import HalteConditionPanel from '@/components/HalteConditionPanel';
import {
  SKAParameters,
  GeoJSONFeatureCollection,
  RecommendationPoint,
  MapidLayerKey,
  SelectedFeatureDetail,
  SimulationResult
} from '@/lib/types';
import { fetchGapMap, fetchLocalLayer, fetchMapidLayer, fetchRecommendations, runSimulation } from '@/lib/api';

const defaultLayerVisibility: Record<MapidLayerKey, boolean> = {
  area_gap: true,
  titik_rekomendasi: true,
  area_rekomendasi: false,
  demografi: false,
  halte_existing: true,
};

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
  const [showSkaArea, setShowSkaArea] = useState<boolean>(true);
  const [mapidLayers, setMapidLayers] = useState<Partial<Record<MapidLayerKey, GeoJSONFeatureCollection>>>({});
  const [visibleLayers, setVisibleLayers] = useState<Record<MapidLayerKey, boolean>>(defaultLayerVisibility);
  const [loadingLayers, setLoadingLayers] = useState<Partial<Record<MapidLayerKey, boolean>>>({});
  const [selectedFeature, setSelectedFeature] = useState<SelectedFeatureDetail | null>(null);
  const [halteConditionTarget, setHalteConditionTarget] = useState<{ id: string; name: string } | null>(null);
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulationLoading, setIsSimulationLoading] = useState<boolean>(false);

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

  const loadMapidLayer = async (layerKey: MapidLayerKey) => {
    setLoadingLayers((current) => ({ ...current, [layerKey]: true }));
    try {
      const data = layerKey === 'demografi' || layerKey === 'halte_existing'
        ? await fetchLocalLayer(layerKey)
        : await fetchMapidLayer(layerKey);
      setMapidLayers((current) => ({ ...current, [layerKey]: data }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Gagal memuat layer ${layerKey}.`);
    } finally {
      setLoadingLayers((current) => ({ ...current, [layerKey]: false }));
    }
  };

  // Initial load
  useEffect(() => {
    loadData(weights);
    loadMapidLayer('area_gap');
    loadMapidLayer('titik_rekomendasi');
    loadMapidLayer('halte_existing');
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

  const handleToggleMapidLayer = (layerKey: MapidLayerKey) => {
    const nextVisible = !visibleLayers[layerKey];
    setVisibleLayers((current) => ({ ...current, [layerKey]: nextVisible }));

    if (nextVisible && !mapidLayers[layerKey]) {
      loadMapidLayer(layerKey);
    }
  };

  const handleSimulationClick = async (lat: number, lon: number) => {
    setIsSimulationLoading(true);
    setError(null);
    try {
      const result = await runSimulation(lat, lon, 400);
      setSimulationResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menjalankan simulasi.');
    } finally {
      setIsSimulationLoading(false);
    }
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

      <LayerTogglePanel
        showSkaArea={showSkaArea}
        onToggleSkaArea={() => setShowSkaArea((current) => !current)}
        visibleLayers={visibleLayers}
        onToggleLayer={handleToggleMapidLayer}
        loadingLayers={loadingLayers}
      />

      <SimulationPanel
        result={simulationResult}
        isLoading={isSimulationLoading}
        isActive={simulationMode}
        onToggleMode={() => setSimulationMode((current) => !current)}
        onCloseResult={() => setSimulationResult(null)}
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

      <FeatureDetailPanel
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
        onAssessCondition={(id, name) => setHalteConditionTarget({ id, name })}
      />

      {halteConditionTarget && (
        <HalteConditionPanel
          halteId={halteConditionTarget.id}
          halteName={halteConditionTarget.name}
          onClose={() => setHalteConditionTarget(null)}
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
          geoData={showSkaArea ? geoData : null}
          gapAreaData={visibleLayers.area_gap ? mapidLayers.area_gap || null : null}
          recommendationPointData={visibleLayers.titik_rekomendasi ? mapidLayers.titik_rekomendasi || null : null}
          recommendationAreaData={visibleLayers.area_rekomendasi ? mapidLayers.area_rekomendasi || null : null}
          demographicData={visibleLayers.demografi ? mapidLayers.demografi || null : null}
          halteExistingData={visibleLayers.halte_existing ? mapidLayers.halte_existing || null : null}
          recommendationData={showRecommendations ? recommendations : undefined}
          onFeatureSelect={setSelectedFeature}
          onSimulationClick={handleSimulationClick}
          simulationMode={simulationMode}
          simulationPoint={simulationResult ? { lat: simulationResult.lat, lon: simulationResult.lon } : null}
        />
      </div>
    </div>
  );
}
