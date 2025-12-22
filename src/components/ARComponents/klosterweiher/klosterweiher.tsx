import React from 'react';
import { AndroidKlosterweiherView } from './Android/AndroidKlosterweiher';
import { IOSKlosterweiherView } from './IOS/IOSKlosterweiher';


export const KlosterweiherView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile }: { onNavigateHome?: () => void; username?: string | null; onLogin?: () => void; onLogout?: () => void; onNavigateProfile?: () => void }) => {

    // Detect device and open appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isNotMobile = !isIOS && !isAndroid;
    
    if (isIOS) {
		console.log("Device is iOS, rendering IOSKlosterweiher");
		return (
			<IOSKlosterweiherView />
		);
    } else if (isAndroid) {
		console.log("Device is Android, rendering AndroidKlosterweiher");
		return <AndroidKlosterweiherView onNavigateHome={onNavigateHome} username={username} onLogin={onLogin} onLogout={onLogout} onNavigateProfile={onNavigateProfile} />;
    } else if (isNotMobile) {
		return (
			<div className="flex items-center justify-center h-screen p-4">
				<div className="text-center">
					<h2 className="text-xl font-bold mb-4">Not mobile devices are Not Supported</h2>
					<p>Please access this AR experience on a mobile device (Android or iOS).</p>
				</div>
			</div>
		);
    }
    
    return null;
};

export default KlosterweiherView;