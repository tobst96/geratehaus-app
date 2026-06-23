import { useMemo, useRef, useState, type MutableRefObject } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import { divIcon, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

const STANDARD_ZENTRUM: [number, number] = [51.1657, 10.4515]; // geografische Mitte Deutschlands

// Eigenes Icon statt Leaflets Default-Marker-Bild, das beim Bundling häufig
// kaputte Pfade erzeugt – ein einfacher CSS-Kreis genügt für den Picker.
const MARKER_ICON = divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:var(--farbe-primaer,#CC0000);border:3px solid #fff;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface GeofencePickerProps {
  lat: number;
  lon: number;
  radiusMeter: number;
  onChange: (lat: number, lon: number) => void;
}

function KartenKlicks({ onKlick }: { onKlick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onKlick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function KartenRef({ kartenRef }: { kartenRef: MutableRefObject<LeafletMap | null> }) {
  kartenRef.current = useMap();
  return null;
}

export function GeofencePicker({ lat, lon, radiusMeter, onChange }: GeofencePickerProps) {
  const hatPosition = lat !== 0 || lon !== 0;
  const [zentrum] = useState<[number, number]>(hatPosition ? [lat, lon] : STANDARD_ZENTRUM);
  const position = useMemo<[number, number]>(() => [lat, lon], [lat, lon]);
  const kartenRef = useRef<LeafletMap | null>(null);

  function standortVerwenden() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      onChange(pos.coords.latitude, pos.coords.longitude);
      kartenRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 17);
    });
  }

  function kartenKlick(neuLat: number, neuLon: number) {
    onChange(neuLat, neuLon);
    if (!hatPosition) {
      kartenRef.current?.setView([neuLat, neuLon], 17);
    }
  }

  return (
    <div>
      <div style={{ height: 320, borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 8 }}>
        <MapContainer
          center={zentrum}
          zoom={hatPosition ? 17 : 6}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <KartenRef kartenRef={kartenRef} />
          <KartenKlicks onKlick={kartenKlick} />
          {hatPosition && (
            <>
              <Marker
                position={position}
                icon={MARKER_ICON}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat: neuLat, lng: neuLon } = e.target.getLatLng();
                    onChange(neuLat, neuLon);
                  },
                }}
              />
              <Circle center={position} radius={radiusMeter} pathOptions={{ color: "var(--farbe-primaer)" }} />
            </>
          )}
        </MapContainer>
      </div>
      <button type="button" className="sekundaer" onClick={standortVerwenden}>
        Aktuellen Standort verwenden
      </button>
      <p style={{ fontSize: "0.85rem", color: "#666" }}>
        Tippe auf die Karte oder ziehe den Marker, um die Position des Gerätehauses festzulegen.
      </p>
    </div>
  );
}
