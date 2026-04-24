import React, { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBahnhofTexts } from '../../../i18n/stations/bahnhof';

const BAHNHOF_LOCOMOTIVE_MODEL_URL = new URL('./models/german_steam_locomotive.glb', import.meta.url).href;

interface ARViewProps {
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
}

class BahnhofARSession extends GyroARVisualizer {
	async init(): Promise<void> {
		await super.init();

		// Keep the locomotive's authored transform from the GLB (no manual position/rotation/scale).
		await this.loadGLTFModel(BAHNHOF_LOCOMOTIVE_MODEL_URL);

		// Remove debug helpers so the model appears in an empty black space.
		if (this.scene) {
			const debugHelpers = this.scene.children.filter(
				(child) => child.type === 'GridHelper' || child.type === 'AxesHelper'
			);
			debugHelpers.forEach((helper) => this.scene?.remove(helper));
		}
	}
}

export const BahnhofView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false }: ARViewProps) => {
	const { language } = useLanguage();
	const bahnhofTexts = getBahnhofTexts(language);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const sessionRef = useRef<BahnhofARSession | null>(null);
	const [isAuthorized, setIsAuthorized] = React.useState(false);
	const [hasStarted, setHasStarted] = React.useState(false);
	const [isStarting, setIsStarting] = React.useState(false);
	const [startError, setStartError] = React.useState<string | null>(null);

	const startARSession = async () => {
		if (!isAuthorized || !containerRef.current || !videoRef.current || isStarting || hasStarted) {
			return;
		}

		setIsStarting(true);
		setStartError(null);

		try {
			const session = new BahnhofARSession(
				containerRef.current,
				videoRef.current,
				{
					onError: (e) => console.error('Bahnhof AR init failed', e),
				}
			);

			await session.init();
			sessionRef.current = session;
			setHasStarted(true);
		} catch (err: any) {
			const message = err?.message || bahnhofTexts.arStartErrorFallback;
			setStartError(message);
			console.error('[BahnhofView] AR init error:', err);
		} finally {
			setIsStarting(false);
		}
	};

	useEffect(() => {
		return () => {
			sessionRef.current?.stop();
		};
	}, []);

	return (
		<ARProximityGate
			stationId={AR_VIEW_STATION_MAP['bahnhof']}
			stationName={bahnhofTexts.stationName}
			onNavigateBack={onNavigateHome}
			onAccessGranted={() => setIsAuthorized(true)}
		>
			<>
				<ARComponentBase
					onNavigateHome={onNavigateHome}
					closeARViewKey="closeBahnhofView"
					containerRef={containerRef as React.RefObject<HTMLDivElement>}
					videoRef={videoRef as React.RefObject<HTMLVideoElement>}
					username={username}
					onLogin={onLogin}
					onLogout={onLogout}
					onNavigateProfile={onNavigateProfile}
					onRegister={onRegister}
					completedStations={completedStations}
					totalStations={totalStations}
					totalPoints={totalPoints}
					currentStationId={2}
					currentStationTitle={bahnhofTexts.stationName}
					currentStationPoints={currentStationPoints}
					onCompleteStation={onCompleteStation}
					isCurrentStationCompleted={isCurrentStationCompleted}
				/>

				{isAuthorized && !hasStarted && (
					<div
						style={{
							position: 'fixed',
							inset: 0,
							zIndex: 10005,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '20px',
							pointerEvents: 'auto',
							background: 'linear-gradient(to bottom, rgba(16,24,32,0.75), rgba(16,24,32,0.45))',
						}}
					>
						<div
							style={{
								width: 'min(460px, 100%)',
								borderRadius: '16px',
								background: 'rgba(0,0,0,0.5)',
								border: '1px solid rgba(255,255,255,0.2)',
								padding: '20px',
								textAlign: 'center',
							}}
						>
							<h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--color-white)' }}>
								{bahnhofTexts.arStartTitle}
							</h2>
							<p style={{ marginBottom: '14px', color: 'var(--color-white)', opacity: 0.95 }}>
								{bahnhofTexts.arStartDescription}
							</p>
							{startError && (
								<p style={{ marginBottom: '12px', color: '#ffd3d3', fontWeight: 700 }}>
									{startError}
								</p>
							)}
							<button
								onClick={() => {
									void startARSession();
								}}
								disabled={isStarting}
								style={{
									width: '100%',
									border: 'none',
									borderRadius: '12px',
									padding: '12px 14px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: isStarting ? 'default' : 'pointer',
									opacity: isStarting ? 0.75 : 1,
								}}
							>
								{isStarting ? bahnhofTexts.arStartingButton : bahnhofTexts.arStartButton}
							</button>
						</div>
					</div>
				)}
			</>
		</ARProximityGate>
	);
};
