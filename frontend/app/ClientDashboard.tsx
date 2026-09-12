'use client';

/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import LeftControlPanel, { LeftPanelTab } from '@/components/LeftControlPanel';
import RightInspectorPanel from '@/components/RightInspectorPanel';
import MapLegend from '@/components/MapLegend';
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
  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('filter');
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lon: number; zoom?: number } | null>(null);

  // Recommendations state
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<RecommendationPoint[]>([]);
  const [activeRecommendation, setActiveRecommendation] = useState<RecommendationPoint | null>(null);
  const [isRecLoading, setIsRecLoading] = useState<boolean>(false);
  const [activeRightTab, setActiveRightTab] = useState<'detail' | 'recommendations'>('detail');

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
      setActiveRightTab('recommendations');
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

  const handleLeftTabChange = (tab: LeftPanelTab) => {
    setActiveLeftTab(tab);
    if (tab === 'simulation') {
      setSimulationMode(true);
    } else {
      setSimulationMode(false);
    }
  };

  const handleToggleSimulationMode = () => {
    const nextMode = !simulationMode;
    setSimulationMode(nextMode);
    if (nextMode) {
      setActiveLeftTab('simulation');
    }
  };

  const handleSimulationClick = async (lat: number, lon: number) => {
    setActiveLeftTab('simulation');
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
    <div className="relative h-dvh min-h-[100svh] w-full overflow-hidden bg-slate-900">
      {/* Floating Simulation Mode Indicator Banner */}
      {simulationMode && (
        <div className="absolute left-3 right-3 top-3 z-[30] flex max-h-[22svh] items-start gap-2 overflow-y-auto rounded-xl border border-emerald-500/50 bg-slate-900/95 px-3 py-2.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 sm:left-1/2 sm:right-auto sm:top-5 sm:max-h-none sm:w-auto sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:items-center sm:gap-3 sm:px-4">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="min-w-0 text-xs leading-snug">
            <strong className="text-emerald-400">Mode Simulasi What-If Aktif:</strong>{' '}
            <span className="text-slate-200">Klik titik manapun di peta untuk menganalisis dampak penambahan halte</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSimulationMode(false);
              setActiveLeftTab('filter');
            }}
            className="ml-auto min-h-8 shrink-0 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-white/20 sm:ml-2 sm:min-h-0"
          >
            ✕ Tutup
          </button>
        </div>
      )}

      {/* Floating Simulation Loading Indicator */}
      {isSimulationLoading && (
        <div className="absolute left-3 right-3 top-20 z-[30] flex items-center gap-2.5 rounded-lg border border-emerald-500/60 bg-slate-950/90 px-3 py-2 text-white shadow-xl backdrop-blur-md sm:left-1/2 sm:right-auto sm:w-auto sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:px-4">
          <svg className="animate-spin h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="min-w-0 text-xs font-medium leading-snug">Menganalisis jangkauan dan dampak dekarbonisasi halte baru...</span>
        </div>
      )}

      <LeftControlPanel
        weights={weights}
        onWeightsChange={setWeights}
        onApply={handleApplyFilter}
        onToggleRecommendations={handleToggleRecommendations}
        isLoading={isLoading}
        showSkaArea={showSkaArea}
        onToggleSkaArea={() => setShowSkaArea((current) => !current)}
        visibleLayers={visibleLayers}
        onToggleLayer={handleToggleMapidLayer}
        loadingLayers={loadingLayers}
        simulationMode={simulationMode}
        onToggleSimulationMode={handleToggleSimulationMode}
        simulationResult={simulationResult}
        isSimulationLoading={isSimulationLoading}
        onCloseSimulationResult={() => setSimulationResult(null)}
        activeTab={activeLeftTab}
        onTabChange={handleLeftTabChange}
        onOpenHalteAudit={() => setHalteConditionTarget({ id: 'sample-01', name: 'Halte Pemuda Surabaya' })}
        onSampleSimulation={() => handleSimulationClick(-7.2575, 112.7521)}
      />
      
      {/* Right Column Stack: Inspector Panel and Map Legend in a coordinated flex column that never overlaps */}
      <div className="absolute bottom-3 left-3 right-3 top-auto z-[25] flex max-h-[42svh] flex-col items-stretch gap-2 overflow-hidden pointer-events-none sm:left-auto sm:bottom-4 sm:right-4 sm:max-h-[58svh] sm:items-end md:bottom-6 md:right-6 md:top-6 md:max-h-none md:gap-3">
        <RightInspectorPanel
          selectedFeature={selectedFeature}
          onCloseFeature={() => setSelectedFeature(null)}
          onAssessCondition={(id, name) => setHalteConditionTarget({ id, name })}
          recommendations={recommendations}
          isRecLoading={isRecLoading}
          showRecommendations={showRecommendations}
          onCloseRecommendations={() => {
            setShowRecommendations(false);
            setActiveRecommendation(null);
          }}
          onRecommendationClick={(lat, lon, rec) => {
            if (
              activeRecommendation &&
              (activeRecommendation.rank === rec?.rank ||
                (rec &&
                  Math.abs(activeRecommendation.lat - rec.lat) < 0.0001 &&
                  Math.abs(activeRecommendation.lon - rec.lon) < 0.0001))
            ) {
              setActiveRecommendation(null);
            } else {
              setMapCenterTarget({ lat, lon, zoom: 16 });
              setActiveRecommendation(rec || null);
            }
          }}
          activeRecommendation={activeRecommendation}
          onClearActiveRecommendation={() => setActiveRecommendation(null)}
          activeTab={activeRightTab}
          onTabChange={setActiveRightTab}
        />

        <div className="mt-auto min-h-0 pointer-events-auto">
          <MapLegend
            visibleLayers={visibleLayers}
            showSkaArea={showSkaArea}
            showRecommendations={showRecommendations}
          />
        </div>
      </div>

      {halteConditionTarget && (
        <HalteConditionPanel
          halteId={halteConditionTarget.id}
          halteName={halteConditionTarget.name}
          onClose={() => setHalteConditionTarget(null)}
        />
      )}

      {error && (
        <div className="absolute left-3 right-3 top-3 z-[35] max-h-[40svh] overflow-y-auto rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700 sm:left-1/2 sm:right-auto sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2">
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
          centerTarget={mapCenterTarget}
          activeRecommendation={activeRecommendation}
          onClearActiveRecommendation={() => setActiveRecommendation(null)}
          onFeatureSelect={(feature) => {
            setSelectedFeature(feature);
            if (feature) setActiveRightTab('detail');
          }}
          onSimulationClick={handleSimulationClick}
          simulationMode={simulationMode}
          simulationPoint={simulationResult ? { lat: simulationResult.lat, lon: simulationResult.lon } : null}
          simulationResult={simulationResult}
          isSimulationLoading={isSimulationLoading}
          onClearSimulation={() => setSimulationResult(null)}
        />
      </div>
    </div>
  );
}
