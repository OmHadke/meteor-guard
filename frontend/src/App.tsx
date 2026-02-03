import {useEffect, useMemo, useRef, useState} from 'react';
import maplibregl, {type MapMouseEvent} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {DeckGL} from '@deck.gl/react';
import {GeoJsonLayer} from '@deck.gl/layers';
import {simulate, neoSearch} from './api';
import type {GeoJSON} from 'geojson';
import './App.css';

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json';

function circle(center: [number, number], radiusMeters: number, steps=128) {
  const [lon, lat] = center;
  const coords: [number, number][] = [];
  const R = 6378137;
  for (let i=0; i<steps; i++) {
    const theta = (i/steps) * 2*Math.PI;
    const dx = radiusMeters * Math.cos(theta);
    const dy = radiusMeters * Math.sin(theta);
    const dLon = dx / (R * Math.cos(lat * Math.PI/180)) * 180/Math.PI;
    const dLat = dy / R * 180/Math.PI;
    coords.push([lon + dLon, lat + dLat]);
  }
  coords.push(coords[0]);
  return { type:'Feature' as const, geometry:{ type:'Polygon' as const, coordinates:[coords] }, properties:{} };
}

type SimulationResult = {
  regime: string;
  e_kt: number;
  center: {lat: number; lon: number};
  overpressure_radii_m: {'1psi': number; '5psi': number};
};

type PhaResult = {
  des: string;
  name?: string;
  spkid: string;
  diameter?: number | null;
  albedo?: number | null;
  pha: string;
};

export default function App() {
  const [center, setCenter] = useState<[number, number]>([77.5946, 12.9716]);
  const [sim, setSim] = useState<SimulationResult | null>(null);
  const [simStatus, setSimStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [simError, setSimError] = useState<string | null>(null);
  const [phaStatus, setPhaStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [phaError, setPhaError] = useState<string | null>(null);
  const [phaResults, setPhaResults] = useState<PhaResult[]>([]);
  const [params, setParams] = useState({
    diameter_m: 140,
    density_kg_m3: 3000,
    velocity_kms: 19,
    angle_deg: 30,
    composition: 'stony',
  });
  const [viewState, setViewState] = useState({
    longitude: center[0],
    latitude: center[1],
    zoom: 8,
    bearing: 0,
    pitch: 0,
  });
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center,
      zoom: viewState.zoom,
    });
    mapRef.current = map;
    map.on('click', (e: MapMouseEvent) => {
      setCenter([e.lngLat.lng, e.lngLat.lat]);
    });
    map.on('move', () => {
      const current = map.getCenter();
      setViewState({
        longitude: current.lng,
        latitude: current.lat,
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      });
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({center});
  }, [center]);

  const layers = useMemo(() => {
    if (!sim) return [];
    const ctr: [number, number] = [sim.center.lon, sim.center.lat];
      const f1 = circle(ctr, sim.overpressure_radii_m['1psi']);
      const f5 = circle(ctr, sim.overpressure_radii_m['5psi']);
      const fc1: GeoJSON = { type: 'FeatureCollection', features: [f1] };
      const fc5: GeoJSON = { type: 'FeatureCollection', features: [f5] };
      return [
        new GeoJsonLayer({
          id: 'op-1psi',
          data: fc1 as GeoJSON,
          filled: true,
          stroked: true,
          getLineColor: [248, 113, 113, 200],
          getFillColor: [248, 113, 113, 80],
        }),
        new GeoJsonLayer({
          id: 'op-5psi',
          data: fc5 as GeoJSON,
          filled: true,
          stroked: true,
          getLineColor: [251, 146, 60, 200],
          getFillColor: [251, 146, 60, 80],
        }),
      ];
  }, [sim]);

  async function runSim() {
    setSimStatus('loading');
    setSimError(null);
    try {
      const data = await simulate({ ...params, lat: center[1], lon: center[0] });
      setSim(data);
      setSimStatus('idle');
    } catch (error) {
      setSimStatus('error');
      setSimError(error instanceof Error ? error.message : 'Simulation failed.');
    }
  }

  return (
    <div className="app">
      <aside className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Planetary defense console</p>
            <h1>MeteorGuard</h1>
            <p className="subtitle">
              Visualize atmospheric entry risks, blast radii, and potentially hazardous objects in seconds.
            </p>
          </div>
          <div className="status-pill">Live</div>
        </div>

        <section className="card">
          <h2>Simulation inputs</h2>
          <div className="form-grid">
            <label>
              Diameter (m)
              <input
                type="number"
                min={2}
                value={params.diameter_m}
                onChange={(e) =>
                  setParams((p) => ({...p, diameter_m: Number(e.target.value)}))
                }
              />
            </label>
            <label>
              Velocity (km/s)
              <input
                type="number"
                min={1}
                value={params.velocity_kms}
                onChange={(e) =>
                  setParams((p) => ({...p, velocity_kms: Number(e.target.value)}))
                }
              />
            </label>
            <label>
              Entry angle (deg)
              <input
                type="number"
                min={5}
                max={89}
                value={params.angle_deg}
                onChange={(e) =>
                  setParams((p) => ({...p, angle_deg: Number(e.target.value)}))
                }
              />
            </label>
            <label>
              Density (kg/m³)
              <input
                type="number"
                min={100}
                value={params.density_kg_m3}
                onChange={(e) =>
                  setParams((p) => ({...p, density_kg_m3: Number(e.target.value)}))
                }
              />
            </label>
            <label>
              Composition
              <select
                value={params.composition}
                onChange={(e) => setParams((p) => ({...p, composition: e.target.value}))}
              >
                <option value="stony">Stony</option>
                <option value="iron">Iron</option>
                <option value="cometary">Cometary</option>
              </select>
            </label>
            <label>
              Target location
              <input value={`${center[1].toFixed(4)}, ${center[0].toFixed(4)}`} readOnly />
            </label>
          </div>
          <button className="primary" onClick={runSim} disabled={simStatus === 'loading'}>
            {simStatus === 'loading' ? 'Running simulation...' : 'Run simulation'}
          </button>
          {simStatus === 'error' && <p className="error">{simError}</p>}
          <p className="hint">Tip: click anywhere on the map to update the entry location.</p>
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Simulation highlights</h2>
            <span className="badge">{sim ? 'Updated' : 'Awaiting run'}</span>
          </div>
          {sim ? (
            <div className="stats">
              <div>
                <p>Atmospheric regime</p>
                <strong>{sim.regime}</strong>
              </div>
              <div>
                <p>Energy yield</p>
                <strong>{sim.e_kt.toFixed(1)} kt TNT</strong>
              </div>
              <div>
                <p>1 psi radius</p>
                <strong>{Math.round(sim.overpressure_radii_m['1psi'] / 1000)} km</strong>
              </div>
              <div>
                <p>5 psi radius</p>
                <strong>{Math.round(sim.overpressure_radii_m['5psi'] / 1000)} km</strong>
              </div>
            </div>
          ) : (
            <p className="empty">Run a scenario to see energy and blast metrics.</p>
          )}
        </section>

        <section className="card">
          <div className="card__header">
            <h2>Potentially hazardous asteroids</h2>
            <button
              className="ghost"
              onClick={async () => {
                setPhaStatus('loading');
                setPhaError(null);
                try {
                  const rows = await neoSearch(true, 6);
                  setPhaResults(rows);
                  setPhaStatus('idle');
                } catch (error) {
                  setPhaStatus('error');
                  setPhaError(error instanceof Error ? error.message : 'Search failed.');
                }
              }}
              disabled={phaStatus === 'loading'}
            >
              {phaStatus === 'loading' ? 'Fetching...' : 'Refresh list'}
            </button>
          </div>
          {phaStatus === 'error' && <p className="error">{phaError}</p>}
          {phaResults.length > 0 ? (
            <ul className="pha-list">
              {phaResults.map((row) => (
                <li key={row.spkid}>
                  <div>
                    <strong>{row.des}</strong>
                    <p>{row.name || 'Uncatalogued short name'}</p>
                  </div>
                  <div className="pha-meta">
                    <span>Ø {row.diameter ? row.diameter.toFixed(2) : '—'} km</span>
                    <span>PHA {row.pha}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Load the latest PHA candidates from JPL SBDB.</p>
          )}
        </section>
      </aside>

      <main className="map-shell">
        <div className="map-frame">
          <div ref={mapContainerRef} className="map-container" />
          <DeckGL
            layers={layers}
            controller={false}
            viewState={viewState}
            style={{pointerEvents: 'none'}}
          />
          <div className="map-overlay">
            <div>
              <p className="map-label">Entry coordinate</p>
              <strong>
                {center[1].toFixed(3)}°, {center[0].toFixed(3)}°
              </strong>
            </div>
            <div>
              <p className="map-label">Zoom</p>
              <strong>{viewState.zoom.toFixed(2)}x</strong>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
