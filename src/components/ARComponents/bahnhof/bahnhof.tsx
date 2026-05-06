import * as THREE from 'three';
import React, { useEffect, useRef } from 'react';
import { ARComponentBase } from '../ARComponentBase';
import { ARProximityGate } from '../ARProximityGate';
import { GyroARVisualizer } from '../../../ARbackend/GyroARVisualizer';
import { AR_VIEW_STATION_MAP } from '../../../data/stationsConfig';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getBahnhofTexts } from '../../../i18n/stations/bahnhof';
import { MobileOnlyNotice } from '../MobileOnlyNotice';

const BAHNHOF_LOCOMOTIVE_MODEL_URL = new URL('./models/german_steam_locomotive.glb', import.meta.url).href;
const BAHNHOF_PANORAMA_URL = '/images/360/bahnhof.jpg';
const BAHNHOF_PARALLAX_URL = '/images/parallax/2203_w026_n002_1520b_p1_1520.jpg';
const SHOW_DEBUG_CAMERA_UI = false;


function loadPanoramaTexture(url: string): Promise<THREE.Texture> {
	return new Promise((resolve, reject) => {
		new THREE.TextureLoader().load(
			url,
			(texture) => {
				texture.colorSpace = THREE.SRGBColorSpace;
				texture.minFilter = THREE.LinearFilter;
				texture.magFilter = THREE.LinearFilter;
				texture.generateMipmaps = false;
				resolve(texture);
			},
			undefined,
			(error) => reject(error)
		);
	});
}

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
	private insideViewLight: THREE.AmbientLight | null = null;
	private trainModel: THREE.Object3D | null = null;
	private parallaxMeshes: THREE.Mesh[] = [];
	private parallaxTextures: THREE.Texture[] = [];
	private parallaxStartMs: number | null = null;
	private readonly parallaxSpeed = 0.1;

	async init(): Promise<void> {
		await super.init();

		// Keep the locomotive's authored transform from the GLB (no manual position/rotation/scale).
		this.trainModel = await this.loadGLTFModel(BAHNHOF_LOCOMOTIVE_MODEL_URL);

		// Remove debug helpers so the model appears in an empty black space.
		if (this.scene) {
			const debugHelpers = this.scene.children.filter(
				(child) => child.type === 'GridHelper' || child.type === 'AxesHelper'
			);
			debugHelpers.forEach((helper) => this.scene?.remove(helper));
		}

		try {
			this.setPanoramaBackground(await loadPanoramaTexture(BAHNHOF_PANORAMA_URL));
		} catch (err) {
			console.error('[BahnhofARSession] Failed to load panorama texture', err);
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

	setInsideView(): void {
		this.setCameraPositionAndLookAt(-1.5, 1, 0);

		if (!this.scene) return;

		if (!this.insideViewLight) {
			this.insideViewLight = new THREE.AmbientLight(0xffffff, 6);
			this.scene.add(this.insideViewLight);
		}
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

	async enableParallaxBackdrops(url: string): Promise<void> {
		if (!this.scene) return;

		this.setPanoramaBackground(null);
		this.disposeParallaxMeshes();

		const leftTexture = await loadPanoramaTexture(url);
		leftTexture.wrapS = THREE.RepeatWrapping;
		leftTexture.wrapT = THREE.ClampToEdgeWrapping;
		leftTexture.repeat.set(2, 1);
		leftTexture.offset.set(0, 0);
		leftTexture.center.set(0.5, 0.5);

		const rightTexture = await loadPanoramaTexture(url);
		rightTexture.wrapS = THREE.RepeatWrapping;
		rightTexture.wrapT = THREE.ClampToEdgeWrapping;
		rightTexture.repeat.set(2, 1);
		rightTexture.offset.set(0, 0);
		rightTexture.center.set(0.5, 0.5);

		const leftMaterial = new THREE.MeshBasicMaterial({
			map: leftTexture,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const rightMaterial = new THREE.MeshBasicMaterial({
			map: rightTexture,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const geometry = new THREE.PlaneGeometry(24, 12);

		const leftPlane = new THREE.Mesh(geometry, leftMaterial);
		leftPlane.position.set(0, 0, 5);
		leftPlane.renderOrder = -10;

		const rightPlane = new THREE.Mesh(geometry, rightMaterial);
		rightPlane.position.set(0, 0, -5);
		rightPlane.renderOrder = -10;

		const onBeforeRender = () => {
			this.updateParallaxOffset();
			this.updateParallaxLookAt();
		};
		leftPlane.onBeforeRender = onBeforeRender;
		rightPlane.onBeforeRender = onBeforeRender;

		this.scene.add(leftPlane, rightPlane);
		this.parallaxMeshes = [leftPlane, rightPlane];
		this.parallaxTextures = [leftTexture, rightTexture];
		this.parallaxStartMs = performance.now();
	}

	private updateParallaxOffset(): void {
		if (this.parallaxTextures.length < 2 || this.parallaxStartMs === null) return;

		const elapsedSeconds = (performance.now() - this.parallaxStartMs) / 1000;
		const offset = (elapsedSeconds * this.parallaxSpeed) % 1;
		this.parallaxTextures[0].offset.x = -offset;
		this.parallaxTextures[1].offset.x = offset;
	}

	private updateParallaxLookAt(): void {
		if (!this.trainModel || this.parallaxMeshes.length === 0) return;

		const trainPosition = new THREE.Vector3();
		this.trainModel.getWorldPosition(trainPosition);
		this.parallaxMeshes.forEach((mesh) => mesh.lookAt(trainPosition));
	}

	private disposeParallaxMeshes(): void {
		if (!this.scene || this.parallaxMeshes.length === 0) {
			this.parallaxMeshes = [];
			this.parallaxTextures = [];
			this.parallaxStartMs = null;
			return;
		}

		this.parallaxMeshes.forEach((mesh) => this.scene?.remove(mesh));
		this.parallaxMeshes.forEach((mesh) => mesh.geometry.dispose());
		const material = this.parallaxMeshes[0]?.material;
		if (material && !Array.isArray(material)) {
			material.dispose();
		}
		this.parallaxTextures.forEach((texture) => texture.dispose());
		this.parallaxMeshes = [];
		this.parallaxTextures = [];
		this.parallaxStartMs = null;
	}

	stop(): void {
		if (this.scene && this.insideViewLight) {
			this.scene.remove(this.insideViewLight);
		}
		this.insideViewLight = null;
		this.disposeParallaxMeshes();

		super.stop();
	}
}

export const BahnhofView = ({ onNavigateHome, username, onLogin, onLogout, onNavigateProfile, onRegister, completedStations, totalStations, totalPoints, currentStationPoints = 0, onCompleteStation, isCurrentStationCompleted = false, isGuestMode = false }: ARViewProps) => {
	const { language } = useLanguage();
	const bahnhofTexts = getBahnhofTexts(language);
	const guidedTexts = {
		front: bahnhofTexts.tourFrontText,
		back: bahnhofTexts.tourBackText,
		inside: bahnhofTexts.tourInsideText,
	};
	const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isAndroid = /Android/.test(navigator.userAgent);
	const isNotMobile = !isIOS && !isAndroid;
	const containerRef = useRef<HTMLDivElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const sessionRef = useRef<BahnhofARSession | null>(null);
	const [isAuthorized, setIsAuthorized] = React.useState(false);
	const [hasStarted, setHasStarted] = React.useState(false);
	const [isStarting, setIsStarting] = React.useState(false);
	const [cameraPosition, setCameraPosition] = React.useState<{ x: number; y: number; z: number } | null>(null);
	const [isTrainMoving, setIsTrainMoving] = React.useState(false);
	const [isInsideView, setIsInsideView] = React.useState(false);
	const [tourStep, setTourStep] = React.useState<0 | 1 | 2>(0);
	const [showTourText, setShowTourText] = React.useState(true);
	const [showDriveHint, setShowDriveHint] = React.useState(false);

	const [startError, setStartError] = React.useState<string | null>(null);

	if (isNotMobile) {
		return <MobileOnlyNotice />;
	}

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
			session.setCameraPositionAndLookAt(7.5, 0.5, 2);
			sessionRef.current = session;
			setTourStep(0);
			setShowTourText(true);
			setShowDriveHint(false);
			setIsInsideView(false);
			setIsTrainMoving(false);
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

	const startTrain = () => {
		if (!sessionRef.current || isTrainMoving || !isInsideView) return;

		sessionRef.current
			.enableParallaxBackdrops(BAHNHOF_PARALLAX_URL)
			.then(() => {
				setIsTrainMoving(true);
				setShowTourText(false);
				setShowDriveHint(true);
			})
			.catch((err) => console.error('[BahnhofView] Failed to load parallax backdrop', err));
	};

	const handleNextStep = () => {
		const session = sessionRef.current;
		if (!session) return;

		if (tourStep === 0) {
			session.setCameraPositionAndLookAt(-6.5, 0.5, 2);
			setTourStep(1);
			return;
		}

		if (tourStep === 1) {
			session.setInsideView();
			setIsInsideView(true);
			setTourStep(2);
			return;
		}
	};

	const getTourText = () => {
		switch (tourStep) {
			case 0:
				return guidedTexts.front;
			case 1:
				return guidedTexts.back;
			case 2:
				return guidedTexts.inside;
			default:
				return guidedTexts.front;
		}
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

				{hasStarted && showTourText && (
					<div
						style={{
							position: 'fixed',
							left: '50%',
							bottom: 'max(140px, calc(env(safe-area-inset-bottom) + 120px))',
							transform: 'translateX(-50%)',
							zIndex: 10005,
							width: 'min(440px, calc(100vw - 24px))',
							padding: '16px',
							borderRadius: '16px',
							border: '1px solid rgba(255,255,255,0.35)',
							background: 'rgba(228, 232, 236, 0.24)',
							backdropFilter: 'blur(6px) grayscale(16%)',
							WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
							boxShadow: '0 10px 28px rgba(0,0,0,0.26)',
							color: 'white',
						}}
					>
						<div style={{ fontSize: '0.9rem', lineHeight: 1.4, marginBottom: '12px' }}>
							{getTourText()}
						</div>
						{tourStep < 2 && (
							<button
								onClick={handleNextStep}
								style={{
									width: '100%',
									border: 'none',
									borderRadius: '12px',
									padding: '12px 14px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 800,
									cursor: 'pointer',
								}}
							>
								{bahnhofTexts.tourNextButton}
							</button>
						)}
						{tourStep === 2 && (
							<button
								onClick={startTrain}
								disabled={isTrainMoving}
								style={{
									width: '100%',
									border: 'none',
									borderRadius: '12px',
									padding: '12px 14px',
									background: 'var(--color-primary)',
									color: 'var(--color-white)',
									fontWeight: 800,
									cursor: isTrainMoving ? 'default' : 'pointer',
									opacity: isTrainMoving ? 0.75 : 1,
									fontSize: '0.9rem',
								}}
							>
								{isTrainMoving ? bahnhofTexts.tourTrainStartedLabel : bahnhofTexts.trainStartButton}
							</button>
						)}
					</div>
				)}

				{hasStarted && showDriveHint && (
					<div
						style={{
							position: 'fixed',
							left: '50%',
							bottom: 'max(140px, calc(env(safe-area-inset-bottom) + 120px))',
							transform: 'translateX(-50%)',
							zIndex: 10005,
							width: 'min(360px, calc(100vw - 24px))',
							padding: '12px 14px',
							borderRadius: '14px',
							border: '1px solid rgba(255,255,255,0.35)',
							background: 'rgba(228, 232, 236, 0.24)',
							backdropFilter: 'blur(6px) grayscale(16%)',
							WebkitBackdropFilter: 'blur(6px) grayscale(16%)',
							boxShadow: '0 10px 28px rgba(0,0,0,0.26)',
							color: 'white',
							textAlign: 'center',
							fontSize: '0.9rem',
							lineHeight: 1.4,
						}}
					>
						{bahnhofTexts.tourDriveHint}
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
