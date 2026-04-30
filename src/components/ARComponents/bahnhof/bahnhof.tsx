import React, { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBahnhofTexts } from '../../../i18n/stations/bahnhof';

const BAHNHOF_LOCOMOTIVE_MODEL_URL = new URL('./models/german_steam_locomotive.glb', import.meta.url).href;
const SHOW_DEBUG_CAMERA_UI = false;

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
	isGuestMode?: boolean;
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

		// Set the default camera position and look at the train model
		this.setCameraPositionAndLookAt(7, 0.5, 2.5);
	}

	getCameraPosition(): { x: number; y: number; z: number } | null {
		if (!this.camera) return null;

		return {
			x: this.camera.position.x,
			y: this.camera.position.y,
			z: this.camera.position.z,
		};
	}

	setCameraPositionAndLookAt(x: number, y: number, z: number): void {
		if (!this.camera) return;

		this.camera.position.set(x, y, z);
		// Look at the train model (assumed to be at origin)
		this.camera.lookAt(0, 0, 0);
	}

	moveLeft(step = 0.25): void {
		this.camera?.translateX(-step);
	}

	moveRight(step = 0.25): void {
		this.camera?.translateX(step);
	}

	moveForward(step = 0.25): void {
		this.camera?.translateZ(-step);
	}

	moveBackward(step = 0.25): void {
		this.camera?.translateZ(step);
	}
}

export const BahnhofView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false }: ARViewProps) => {
	const { language } = useLanguage();
	const bahnhofTexts = getBahnhofTexts(language);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const sessionRef = useRef<BahnhofARSession | null>(null);
	const [isAuthorized, setIsAuthorized] = React.useState(false);
	const [hasStarted, setHasStarted] = React.useState(false);
	const [isStarting, setIsStarting] = React.useState(false);
	const [cameraPosition, setCameraPosition] = React.useState<{ x: number; y: number; z: number } | null>(null);

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

	useEffect(() => {
		if (!hasStarted) {
			setCameraPosition(null);
			return;
		}

		const updateCameraPosition = () => {
			const position = sessionRef.current?.getCameraPosition() ?? null;
			setCameraPosition(position);
		};

		updateCameraPosition();
		const intervalId = window.setInterval(updateCameraPosition, 100);

		return () => {
			window.clearInterval(intervalId);
		};
	}, [hasStarted]);

	const moveCamera = (direction: 'left' | 'right' | 'forward' | 'backward') => {
		const session = sessionRef.current;
		if (!session) return;

		switch (direction) {
			case 'left':
				session.moveLeft();
				break;
			case 'right':
				session.moveRight();
				break;
			case 'forward':
				session.moveForward();
				break;
			case 'backward':
				session.moveBackward();
				break;
		}

		setCameraPosition(session.getCameraPosition());
	};

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
				isGuestMode={isGuestMode}
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

				{hasStarted && (
					<div
						style={{
							position: 'fixed',
							left: '50%',
							bottom: 'max(140px, calc(env(safe-area-inset-bottom) + 120px))',
							transform: 'translateX(-50%)',
							zIndex: 10005,
							width: 'min(420px, calc(100vw - 24px))',
							padding: '14px',
							borderRadius: '16px',
							background: 'var(--color-white)',
							border: '1px solid rgba(0,0,0,0.08)',
							boxShadow: '0 10px 28px rgba(0,0,0,0.26)',
							color: 'var(--color-gray-800)',
						}}
					>
						<div style={{ fontSize: '0.78rem', opacity: 0.75, marginBottom: '10px', fontWeight: 700 }}>
							Camera Positions
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '8px',
							}}
						>
							<button
								onClick={() => {
									sessionRef.current?.setCameraPositionAndLookAt(7.5, 0.5, 2);
								}}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
									fontSize: '0.85rem',
								}}
							>
								Right Front
							</button>
							<button
								onClick={() => {
									sessionRef.current?.setCameraPositionAndLookAt(7.5, 0.5, -2);
								}}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
									fontSize: '0.85rem',
								}}
							>
								Left Front
							</button>
							<button
								onClick={() => {
									sessionRef.current?.setCameraPositionAndLookAt(-6.5, 0.5, 2);
								}}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
									fontSize: '0.85rem',
								}}
							>
								Right Back
							</button>
							<button
								onClick={() => {
									sessionRef.current?.setCameraPositionAndLookAt(-6.5, 0.5, -2);
								}}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
									fontSize: '0.85rem',
								}}
							>
								Left Back
							</button>
						</div>
					</div>
				)}

				{hasStarted && SHOW_DEBUG_CAMERA_UI && (
					<div
						style={{
							position: 'fixed',
							left: '50%',
							top: '50%',
							transform: 'translate(-50%, -50%)',
							zIndex: 10006,
							width: 'min(320px, calc(100vw - 24px))',
							padding: '12px',
							borderRadius: '12px',
							background: 'rgba(0, 0, 0, 0.64)',
							border: '1px solid rgba(255,255,255,0.2)',
							color: 'var(--color-white)',
							backdropFilter: 'blur(4px)',
						}}
					>
						<div style={{ fontSize: '0.78rem', opacity: 0.85, marginBottom: '8px', fontWeight: 700 }}>
							Debug Camera
						</div>
						<div style={{ fontSize: '0.9rem', marginBottom: '10px', fontFamily: 'monospace' }}>
							X: {cameraPosition ? cameraPosition.x.toFixed(2) : '0.00'} | Y: {cameraPosition ? cameraPosition.y.toFixed(2) : '0.00'} | Z: {cameraPosition ? cameraPosition.z.toFixed(2) : '0.00'}
						</div>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '8px',
							}}
						>
							<button
								onClick={() => moveCamera('left')}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'rgba(255,255,255,0.16)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
								}}
							>
								Left
							</button>
							<button
								onClick={() => moveCamera('right')}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'rgba(255,255,255,0.16)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
								}}
							>
								Right
							</button>
							<button
								onClick={() => moveCamera('forward')}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'rgba(255,255,255,0.16)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
								}}
							>
								Forward
							</button>
							<button
								onClick={() => moveCamera('backward')}
								style={{
									border: 'none',
									borderRadius: '10px',
									padding: '10px 12px',
									background: 'rgba(255,255,255,0.16)',
									color: 'var(--color-white)',
									fontWeight: 700,
									cursor: 'pointer',
								}}
							>
								Backward
							</button>
						</div>
					</div>
				)}
			</>
		</ARProximityGate>
	);
};
