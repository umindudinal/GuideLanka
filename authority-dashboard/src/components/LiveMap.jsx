import { useEffect, useState } from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  Polygon,
  Tooltip,
  useMap
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const jeepDivIcon = new L.divIcon({
  html: `<div style="
    font-size: 24px;
    background: rgba(16, 185, 129, 0.2);
    border: 2px solid #10b981;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    line-height: 1;
  ">🚙</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
  className: 'custom-jeep-icon'
});

const animalIcons = {
  'Elephant': '🐘',
  'Leopard': '🐆',
  'Bear': '🐻',
  'Deer': '🦌',
  'Peacock': '🦚',
  'Other': '🐾'
};

const yalaCenter = [6.390, 81.380];

const yalaBlock5Coords = [
  [6.440, 81.430],
  [6.465, 81.430],
  [6.475, 81.460],
  [6.445, 81.465],
  [6.435, 81.445]
];

const yalaBlock6Coords = [
  [6.310, 81.210],
  [6.350, 81.200],
  [6.380, 81.240],
  [6.340, 81.270],
  [6.300, 81.250]
];


const routeCoords = {
  'route-1': [
    [6.370, 81.510],
    [6.372, 81.514],
    [6.375, 81.518],
    [6.378, 81.522],
  ],
  'route-2': [
    [6.378, 81.522],
    [6.381, 81.527],
    [6.385, 81.533],
    [6.390, 81.540],
  ],
  'route-3': [
    [6.370, 81.510],
    [6.368, 81.505],
    [6.362, 81.500],
    [6.358, 81.492],
  ],
  'route-4': [
    [6.375, 81.518],
    [6.380, 81.512],
    [6.386, 81.506],
    [6.392, 81.498],
  ]
};

const getCongestionColor = (congestion) => {
  switch (congestion?.toUpperCase()) {
    case 'HIGH': return '#ef4444';
    case 'MODERATE': return '#f59e0b';
    case 'LOW': return '#10b981';
    default: return '#64748b';
  }
};

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({ sightings, sosAlerts, drivers, routes, center, zoom, selectedPark = 'YALA', driverLocations = {} }) {

  const [isSatellite, setIsSatellite] = useState(false);

  const activeJeeps = drivers.map((driver, index) => {
    const profile = driver.driver_profile
      ? (Array.isArray(driver.driver_profile) ? driver.driver_profile[0] : driver.driver_profile)
      : null;

    const realLoc = driverLocations[driver.id];
    let lat, lng;
    let isRealLocation = false;

    if (realLoc) {
      lat = realLoc.lat;
      lng = realLoc.lng;
      isRealLocation = true;
    } else {
      const baseLat = 6.370;
      const baseLng = 81.510;
      lat = baseLat + (index * 0.0015) - 0.001;
      lng = baseLng + (index * 0.0018) + 0.001;
    }

    return {
      id: driver.id,
      name: driver.full_name,
      phone: driver.phone_number || 'N/A',
      vehicleNo: profile?.vehicle_id || `SV-${100 + index}`,
      position: [lat, lng],
      isRealLocation
    };
  });

  return (
    <MapContainer
      center={yalaCenter}
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <ChangeView center={center} zoom={zoom} />

      {isSatellite ? (
        <>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            attribution='&copy; Esri World Transportation'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
            opacity={0.7}
          />
          <TileLayer
            attribution='&copy; Esri World Boundaries and Places'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.9}
          />
        </>
      ) : (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
      )}

      <div className="leaflet-top leaflet-right" style={{ marginTop: '70px', marginRight: '10px', pointerEvents: 'auto' }}>
        <div className="leaflet-bar leaflet-control">
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className="w-10 h-10 bg-slate-900 border border-slate-800 text-slate-100 hover:text-emerald-400 hover:bg-slate-950 flex items-center justify-center rounded-lg shadow-lg cursor-pointer transition select-none"
            title={isSatellite ? "Switch to Normal Map View" : "Switch to Satellite Imagery View"}
            type="button"
          >
            {isSatellite ? '🗺️' : '🛰️'}
          </button>
        </div>
      </div>

      <Polygon
        positions={yalaBlock5Coords}
        pathOptions={{
          color: '#fbbf24',
          fillColor: '#fbbf24',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '6, 6'
        }}
      >
        <Tooltip sticky>
          <div className="font-sans font-bold text-xs text-amber-500">
            🚧 GEOFENCE ACTIVE: Yala Block 5 (Galge)
          </div>
        </Tooltip>
      </Polygon>

      <Polygon
        positions={yalaBlock6Coords}
        pathOptions={{
          color: '#38bdf8',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '6, 6'
        }}
      >
        <Tooltip sticky>
          <div className="font-sans font-bold text-xs text-sky-500">
            🚧 GEOFENCE ACTIVE: Yala Block 6 (Lunugamvehera)
          </div>
        </Tooltip>
      </Polygon>

      {routes.map((route) => {
        const coords = routeCoords[route.id] || [];
        if (coords.length === 0 || route.status === 'CLOSED') return null;

        return (
          <Polyline
            key={route.id}
            positions={coords}
            color={getCongestionColor(route.congestion)}
            weight={5}
            opacity={0.7}
            dashArray={route.congestion === 'HIGH' ? "5, 10" : undefined}
          >
            <Popup>
              <div className="p-1 font-sans">
                <h4 className="font-extrabold text-slate-800 text-xs">{route.name}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">{route.checkpoints}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${
                    route.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>{route.status}</span>
                  <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Congestion: {route.congestion}
                  </span>
                </div>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      {activeJeeps.map((jeep) => (
        <Marker key={jeep.id} position={jeep.position} icon={jeepDivIcon}>
          <Popup>
            <div className="p-1 font-sans">
              <h4 className="font-extrabold text-green-700 text-sm">{jeep.name}</h4>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Vehicle: {jeep.vehicleNo}</p>
              <p className="text-xs text-slate-500 mt-0.5">Contact: {jeep.phone}</p>

              <div className={`mt-2 text-[10px] font-black px-2 py-0.5 rounded-full inline-block border ${
                jeep.isRealLocation
                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-500/20'
                  : 'text-amber-500 bg-amber-950/60 border-amber-500/20'
              }`}>
                {jeep.isRealLocation ? '● ONLINE (LIVE GPS)' : '● ONLINE (MOCKED)'}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {sosAlerts
        .filter(alert => ['ACTIVE', 'PENDING', 'RANGER DISPATCHED'].includes(alert.status?.toUpperCase()))
        .map((alert) => {
          const pos = [
            Number(alert.latitude) || 6.375,
            Number(alert.longitude) || 81.515
          ];

          return (
            <div key={alert.id}>
              <CircleMarker
                center={pos}
                radius={24}
                pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.2, weight: 1.5 }}
                className="animate-ping"
              />
              <CircleMarker
                center={pos}
                radius={10}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.9, weight: 2 }}
              >
                <Popup className="rounded-xl">
                  <div className="p-2 text-center font-sans">
                    <h3 className="font-extrabold text-red-600 text-sm flex items-center justify-center gap-1">
                      ⚠️ EMERGENCY SOS
                    </h3>
                    <p className="text-xs font-bold text-slate-800 mt-1">Type: {alert.alert_type || 'General SOS'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Coordinates: {pos[0].toFixed(4)}, {pos[1].toFixed(4)}</p>
                    <div className="mt-2 text-[9px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-md">
                      HELP REQUIRED IMMEDIATELY
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}

      {sightings.map((sighting) => {
        const pos = [
          Number(sighting.location_lat) || 6.372,
          Number(sighting.location_lng) || 81.518
        ];
        const emoji = animalIcons[sighting.animal_type] || '🐾';

        const customDivIcon = new L.divIcon({
          html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">${emoji}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          className: 'custom-animal-icon'
        });

        return (
          <Marker key={sighting.id} position={pos} icon={customDivIcon}>
            <Popup>
              <div className="p-1 font-sans">
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>{emoji}</span> {sighting.animal_type} Spotted
                </h4>
                <p className="text-xs text-slate-600 mt-1">{sighting.description || 'Logged via map coordinate'}</p>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Log time: {new Date(sighting.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

    </MapContainer>
  );
}
