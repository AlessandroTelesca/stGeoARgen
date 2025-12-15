import React from 'react';
import { KlosterweiherView as AndroidKlosterweiherView } from './Android/AndroidKlosterweiher';
import { IOSKlosterweiherPlaceholder } from './IOS/IOSKlosterweiher';

// Simple platform detection using userAgent
const isIOS = () => {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
	return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
};

// Wrapper component that chooses the platform-specific implementation
export const Klosterweiher = ({ onNavigateHome }: { onNavigateHome?: () => void }) => {
	const ios = isIOS();

	if (ios) {
		// iOS fallback (image tracking to be implemented in IOSKlosterweiher)
		return (
			<IOSKlosterweiherPlaceholder />
		);
	}

	// Default to Android/WebXR implementation
	return <AndroidKlosterweiherView onNavigateHome={onNavigateHome} />;
};

export default Klosterweiher;
