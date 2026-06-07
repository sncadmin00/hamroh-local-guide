import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type LatLng = { lat: number; lng: number } | null;

type Mode = "meeting" | "end";

function makeIcon(color: string, label: string) {
  return L.divIcon({
    className: "tour-map-pin",
    html: `<div style="
      background:${color};
      color:#fff;
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:12px;
      box-shadow:0 2px 6px rgba(0,0,0,.3);
      border:2px solid #fff;
    "><span style="transform:rotate(45deg)">${label}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  });
}

const meetingIcon = makeIcon("#16a34a", "A");
const endIcon = makeIcon("#dc2626", "B");

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center[0], center[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function TourMapPicker(props: {
  center: { lat: number; lng: number };
  meeting: LatLng;
  end: LatLng;
  endSameAsMeeting?: boolean;
  onChange: (next: { meeting: LatLng; end: LatLng }) => void;
  labels: {
    pickMeeting: string;
    pickEnd: string;
    meetingSet: string;
    endSet: string;
    clear: string;
    hint: string;
  };
}) {
  const { center, meeting, end, endSameAsMeeting, onChange, labels } = props;
  const [mode, setMode] = useState<Mode>("meeting");

  const initialCenter = useMemo<[number, number]>(() => {
    if (meeting) return [meeting.lat, meeting.lng];
    if (end) return [end.lat, end.lng];
    return [center.lat, center.lng];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (lat: number, lng: number) => {
    if (endSameAsMeeting) {
      onChange({ meeting: { lat, lng }, end: { lat, lng } });
      return;
    }
    if (mode === "meeting") {
      onChange({ meeting: { lat, lng }, end });
      setMode("end");
    } else {
      onChange({ meeting, end: { lat, lng } });
    }
  };

  const clear = (which: Mode) => {
    if (which === "meeting") onChange({ meeting: null, end });
    else onChange({ meeting, end: null });
    setMode(which);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode("meeting")}
          className={`h-8 px-3 rounded-full border ${mode === "meeting" ? "bg-foreground text-background border-foreground" : "bg-background border-input"}`}
        >
          <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1.5 align-middle" />
          {labels.pickMeeting}
        </button>
        {!endSameAsMeeting && (
          <button
            type="button"
            onClick={() => setMode("end")}
            className={`h-8 px-3 rounded-full border ${mode === "end" ? "bg-foreground text-background border-foreground" : "bg-background border-input"}`}
          >
            <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-1.5 align-middle" />
            {labels.pickEnd}
          </button>
        )}
        {meeting && (
          <button type="button" onClick={() => clear("meeting")} className="h-8 px-2 text-muted-foreground underline">
            A × {labels.clear}
          </button>
        )}
        {end && !endSameAsMeeting && (
          <button type="button" onClick={() => clear("end")} className="h-8 px-2 text-muted-foreground underline">
            B × {labels.clear}
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{labels.hint}</p>
      <div className="h-64 w-full rounded-xl overflow-hidden border border-input">
        <MapContainer
          center={initialCenter}
          zoom={13}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Recenter center={[center.lat, center.lng]} />
          <ClickHandler onClick={handleClick} />
          {meeting && <Marker position={[meeting.lat, meeting.lng]} icon={meetingIcon} />}
          {end && <Marker position={[end.lat, end.lng]} icon={endIcon} />}
        </MapContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-green-600 mr-1.5 align-middle" />
          {meeting ? `${meeting.lat.toFixed(5)}, ${meeting.lng.toFixed(5)}` : labels.meetingSet}
        </div>
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-1.5 align-middle" />
          {end ? `${end.lat.toFixed(5)}, ${end.lng.toFixed(5)}` : labels.endSet}
        </div>
      </div>
    </div>
  );
}
