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
    lat: 48.125809028190275, 
    lng: 8.333296868535312
  },
  {
    id: 2,
    name: 'Bahnhof',
    lat: 48.12442791310443,
    lng: 8.34141162291187
  },
  { 
    id: 3, 
    name: 'Phonomuseum', 
    lat: 48.12641591490427, 
    lng: 8.332870042354898 
  },
  { 
    id: 5, 
    name: 'Klosterweiher', 
    lat: 48.12106058037526, 
    lng: 8.331670499276125
  },
];

// AR-View zu Station-ID Mapping
// Diese werden für die direkten AR-URLs verwendet (/klosterweiher, /phonomuseum, /glockenspiel)
export const AR_VIEW_STATION_MAP: Record<string, number> = {
  'klosterweiher': 5, // Aussichtspunkt Hörnle -> Klosterweiher AR
  'phonomuseum': 3,   // Heimatmuseum -> Phonomuseum AR
  'glockenspiel': 1,  // Historisches Rathaus -> Glockenspiel AR
  'bahnhof': 2,       // Bahnhof -> Bahnhof AR
};

// Helper: Koordinaten nach Station-ID finden
export const getStationCoordinates = (stationId: number): StationCoordinates | undefined => {
  return STATIONS_COORDINATES.find(s => s.id === stationId);
};

// Helper: Alle Koordinaten als Array
export const getAllCoordinates = () => STATIONS_COORDINATES;
