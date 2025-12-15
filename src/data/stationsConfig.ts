// Zentrale Stations-Konfiguration
// Alle Koordinaten und Stationsdaten werden hier definiert und von allen Komponenten genutzt

export interface StationCoordinates {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

// Stations-Koordinaten - HIER BEARBEITEN für alle AR und Proximity Checks
// IDs müssen mit App.tsx Stationen übereinstimmen
// Nur Stationen mit tatsächlichem AR-Routing
export const STATIONS_COORDINATES: StationCoordinates[] = [
  { 
    id: 1, 
    name: 'Glockenspiel', 
    lat: 48.134599538155655, // Testweise: Dein Zuhause
    lng: 8.245808734754021 
  },
  { 
    id: 3, 
    name: 'Phonomuseum', 
    lat: 48.1245, 
    lng: 8.3345 
  },
  { 
    id: 5, 
    name: 'Klosterweiher', 
    lat: 48.1239, 
    lng: 8.3352 
  },
];

// AR-View zu Station-ID Mapping
// Diese werden für die direkten AR-URLs verwendet (/klosterweiher, /phonomuseum, /glockenspiel)
export const AR_VIEW_STATION_MAP: Record<string, number> = {
  'klosterweiher': 5, // Aussichtspunkt Hörnle -> Klosterweiher AR
  'phonomuseum': 3,   // Heimatmuseum -> Phonomuseum AR
  'glockenspiel': 1,  // Historisches Rathaus -> Glockenspiel AR
};

// Helper: Koordinaten nach Station-ID finden
export const getStationCoordinates = (stationId: number): StationCoordinates | undefined => {
  return STATIONS_COORDINATES.find(s => s.id === stationId);
};

// Helper: Alle Koordinaten als Array
export const getAllCoordinates = () => STATIONS_COORDINATES;
