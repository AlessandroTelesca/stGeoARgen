import React from 'react';
import { useLocation } from 'react-router-dom';
import { XRKlosterweiherView } from './Android/AndroidKlosterweiher';
import { NonXRKlosterweiherView } from './IOS/IOSKlosterweiher';
import { MobileOnlyNotice } from '../MobileOnlyNotice';


export const KlosterweiherView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, onTreasureCollect, isGuestMode = false }: { onNavigateHome?: () => void; username?: string | null; onLogin?: () => void; onLogout?: () => void; onNavigateProfile?: () => void; onRegister?: () => void; completedStations?: number; totalStations?: number; totalPoints?: number; currentStationPoints?: number; onCompleteStation?: (stationId: number) => void; isCurrentStationCompleted?: boolean; onTreasureCollect?: () => Promise<boolean>; isGuestMode?: boolean }) => {
	const location = useLocation();

	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isAndroid = /Android/.test(navigator.userAgent);
	const isNotMobile = !isIOS && !isAndroid;

	if (isNotMobile) {
		return <MobileOnlyNotice />;
	}

	// XR availability is decided by the "Start AR experience" button (StationDetail) and passed as route state.
	// Direct visits (QR code / URL) bypass the button, so the same check runs here.
	const xrAvailable = (location.state as { xrAvailable?: boolean } | null)?.xrAvailable ?? ('xr' in navigator);

	if (!xrAvailable) {
		console.log("WebXR not available, rendering NonXRKlosterweiher");
		return (
			<NonXRKlosterweiherView
				onNavigateHome={onNavigateHome}
				username={username}
				onLogin={onLogin}
				onLogout={onLogout}
				onNavigateProfile={onNavigateProfile}
				onRegister={onRegister}
				completedStations={completedStations}
				totalStations={totalStations}
				totalPoints={totalPoints}
				currentStationPoints={currentStationPoints}
				onCompleteStation={onCompleteStation}
				isCurrentStationCompleted={isCurrentStationCompleted}
				onTreasureCollect={onTreasureCollect}
				isGuestMode={isGuestMode}
			/>
		);
	}

	return (
		<XRKlosterweiherView
			onNavigateHome={onNavigateHome} 
			username={username} 
			onLogin={onLogin} 
			onLogout={onLogout} 
			onNavigateProfile={onNavigateProfile} 
			onRegister={onRegister} 
			completedStations={completedStations} 
			totalStations={totalStations} 
			totalPoints={totalPoints} 
			currentStationPoints={currentStationPoints}
			onCompleteStation={onCompleteStation}
			isCurrentStationCompleted={isCurrentStationCompleted}
			onTreasureCollect={onTreasureCollect}
			isGuestMode={isGuestMode} />
	);
};

export default KlosterweiherView;
