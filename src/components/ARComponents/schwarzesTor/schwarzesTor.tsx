import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getSchwarzesTorTexts } from '../../../i18n/stations/schwarzesTor';
import { MobileOnlyNotice } from '../MobileOnlyNotice';
import { ZeitreiseView } from './ZeitreiseView';
import { PanoramaView } from './PanoramaView';

type Room = { id: string; label: string; image: string };

const SCHWARZES_TOR_STATION_ID = 4;
const TOTAL_ROOMS = 4;

interface SchwarzesTorViewProps {
  onNavigateHome?: () => void;
  username?: string | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onNavigateProfile?: () => void;
  onRegister?: () => void;
  completedStations?: number;
  totalStations?: number;
  totalPoints?: number;
  currentStationPoints?: number;
  onCompleteStation?: (stationId: number) => void;
  isCurrentStationCompleted?: boolean;
  isGuestMode?: boolean;
}

export const SchwarzesTorView = ({
  onNavigateHome,
  username,
  onLogin,
  onLogout,
  onNavigateProfile,
  onRegister,
  completedStations,
  totalStations,
  totalPoints,
  currentStationPoints = 0,
  onCompleteStation,
  isCurrentStationCompleted = false,
  isGuestMode = false,
}: SchwarzesTorViewProps) => {
  const { language } = useLanguage();
  const texts = getSchwarzesTorTexts(language);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isNotMobile = !isIOS && !isAndroid;

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [visitedRooms, setVisitedRooms] = useState<Set<string>>(new Set());

  if (isNotMobile) return <MobileOnlyNotice />;

  const allRoomsVisited = visitedRooms.size >= TOTAL_ROOMS;

  const handleSelectRoom = (room: Room) => {
    setVisitedRooms((prev) => {
      if (prev.has(room.id)) return prev;
      const next = new Set(prev);
      next.add(room.id);
      return next;
    });
    setSelectedRoom(room);
  };

  if (selectedRoom) {
    return (
      <PanoramaView
        imageUrl={selectedRoom.image}
        roomLabel={selectedRoom.label}
        roomId={selectedRoom.id}
        onNavigateBack={() => setSelectedRoom(null)}
        onNavigateHome={onNavigateHome}
        username={username}
        onLogin={onLogin}
        onLogout={onLogout}
        onNavigateProfile={onNavigateProfile}
        onRegister={onRegister}
        completedStations={completedStations}
        totalStations={totalStations}
        totalPoints={totalPoints}
        visitedRooms={visitedRooms}
        currentStationId={SCHWARZES_TOR_STATION_ID}
        currentStationTitle={texts.stationName}
        currentStationPoints={currentStationPoints}
        onCompleteStation={onCompleteStation}
        isCurrentStationCompleted={isCurrentStationCompleted}
        isGuestMode={isGuestMode}
        showCompleteButton={allRoomsVisited}
        ignoreCompleteTimer={true}
      />
    );
  }

  return (
    <ZeitreiseView
      onNavigateBack={onNavigateHome}
      onSelectRoom={handleSelectRoom}
      username={username}
      onLogin={onLogin}
      onLogout={onLogout}
      onNavigateProfile={onNavigateProfile}
      onRegister={onRegister}
      completedStations={completedStations}
      totalStations={totalStations}
      totalPoints={totalPoints}
      visitedRooms={visitedRooms}
      currentStationId={SCHWARZES_TOR_STATION_ID}
      currentStationTitle={texts.stationName}
      currentStationPoints={currentStationPoints}
      onCompleteStation={onCompleteStation}
      isCurrentStationCompleted={isCurrentStationCompleted}
      isGuestMode={isGuestMode}
      showCompleteButton={allRoomsVisited}
      ignoreCompleteTimer={true}
    />
  );
};

export default SchwarzesTorView;
