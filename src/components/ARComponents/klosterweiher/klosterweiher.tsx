import React from 'react';
import { AndroidKlosterweiherView } from './Android/AndroidKlosterweiher';
import { IOSKlosterweiherView } from './IOS/IOSKlosterweiher';
import { MobileOnlyNotice } from '../MobileOnlyNotice';


export const KlosterweiherView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, onTreasureCollect, isGuestMode = false }: { onNavigateHome?: () => void; username?: string | null; onLogin?: () => void; onLogout?: () => void; onNavigateProfile?: () => void; onRegister?: () => void; completedStations?: number; totalStations?: number; totalPoints?: number; currentStationPoints?: number; onCompleteStation?: (stationId: number) => void; isCurrentStationCompleted?: boolean; onTreasureCollect?: () => Promise<boolean>; isGuestMode?: boolean }) => {

	// Detect device and open appropriate maps app
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isAndroid = /Android/.test(navigator.userAgent);
	const isNotMobile = !isIOS && !isAndroid;

	if (isNotMobile) {
		return <MobileOnlyNotice />;
	}

	if (isIOS) {
		console.log("Device is iOS, rendering IOSKlosterweiher");
		return (
			<IOSKlosterweiherView
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
	} else if (isAndroid) {
		return (
			<AndroidKlosterweiherView 
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
	} else if (isNotMobile) {
		return (
			<div className="flex items-center justify-center h-screen p-4">
				<div className="text-center">
					<h2 className="text-xl font-bold mb-4">We only support mobile devices.</h2>
					<p>Please access this AR experience on a mobile device (Android or iOS).</p>
				</div>
			</div>
		);
	}

	return null;
};

export default KlosterweiherView;