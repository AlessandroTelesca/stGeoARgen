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
const SHOW_DEBUG_CAMERA_UI = import.meta.env.DEV;

interface InfoMarkerDef {
	id: string;
	tourStep: 0 | 1 | 2;
	position: [number, number, number];
}

// Positions are tuned to the german_steam_locomotive.glb at origin.
// Step 0 camera: (7.5, 0.5, 2)  Step 1 camera: (-6.5, 0.5, 2)  Step 2 camera: (-1.5, 1, 0)
const INFO_MARKER_DEFS: InfoMarkerDef[] = [
	{ id: 'frontLamp',     tourStep: 0, position: [3.8,  2.6,  0.0] },
	{ id: 'smokestack',    tourStep: 0, position: [2.0,  3.5,  0.0] },
	{ id: 'boiler',        tourStep: 0, position: [0.0,  1.6,  0.9] },
	{ id: 'tender',        tourStep: 1, position: [-3.5, 1.4,  0.0] },
	{ id: 'rearBuffers',   tourStep: 1, position: [-5.8, 0.7,  0.6] },
	{ id: 'pressureGauge', tourStep: 2, position: [-2.2, 1.6, -0.5] },
	{ id: 'throttle',      tourStep: 2, position: [-2.0, 1.3,  0.5] },
	{ id: 'brake',         tourStep: 2, position: [-1.1, 1.4, -0.5] },
];

// Desired icon diameter in CSS pixels — constant across all markers and distances.
const INFO_MARKER_TARGET_PX = 88;

function buildInfoIconTexture(): THREE.CanvasTexture {
	const size = 256;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;

	// Outer glow ring — brand green
	const glow = ctx.createRadialGradient(128, 128, 72, 128, 128, 128);
	glow.addColorStop(0, 'rgba(12, 105, 15, 0)');
	glow.addColorStop(1, 'rgba(12, 105, 15, 0.45)');
	ctx.fillStyle = glow;
	ctx.beginPath();
	ctx.arc(128, 128, 128, 0, Math.PI * 2);
	ctx.fill();

	// Solid circle — brand primary
	ctx.fillStyle = '#0C690F';
	ctx.beginPath();
	ctx.arc(128, 128, 92, 0, Math.PI * 2);
	ctx.fill();

	// White border
	ctx.strokeStyle = 'rgba(255,255,255,0.92)';
	ctx.lineWidth = 10;
	ctx.beginPath();
	ctx.arc(128, 128, 92, 0, Math.PI * 2);
	ctx.stroke();

	// "i" character
	ctx.fillStyle = 'white';
	ctx.font = 'bold 108px Georgia, serif';
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('i', 128, 136);

	return new THREE.CanvasTexture(canvas);
}


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
	private infoMarkerSprites: THREE.Sprite[] = [];
	private infoIconTexture: THREE.CanvasTexture | null = null;
	private readonly markerRaycaster = new THREE.Raycaster();

	async init(): Promise<void> {
		await super.init();

		// Keep the locomotive's authored transform from the GLB (no manual position/rotation/scale).
		this.trainModel = await this.loadGLTFModel(BAHNHOF_LOCOMOTIVE_MODEL_URL);
		this.trainModel.position.x = -4;
		this.trainModel.position.y = -5;
		this.trainModel.rotation.y += Math.PI / 2;

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

		const trainposition = this.trainModel?.position;

		const rotatedPosition = new THREE.Vector3(x, y, z).applyAxisAngle(
			new THREE.Vector3(0, 1, 0),
			Math.PI / 2
		);
		this.camera.position.copy(rotatedPosition.add(trainposition ?? new THREE.Vector3(0, 0, 0)));
		this.camera.lookAt(trainposition ?? new THREE.Vector3(0, 0, 0));
	}

	setInsideView(): void {
		this.setCameraPositionAndLookAt(-1.5, 1, 0);

		if (!this.scene) return;

		if (!this.insideViewLight) {
			this.insideViewLight = new THREE.AmbientLight(0xffffff, 6);
			this.scene.add(this.insideViewLight);
		}
	}

	setDebugLookDirection(direction: 'left' | 'right'): void {
		if (!this.camera) return;

		const trainPosition = this.trainModel?.position ?? new THREE.Vector3(0, 0, 0);
		const cameraOffset = this.camera.position.clone().sub(trainPosition);
		cameraOffset.y = 0;

		if (cameraOffset.lengthSq() === 0) {
			cameraOffset.set(1, 0, 0);
		}

		cameraOffset.normalize();

		const lookDistance = Math.max(3, this.camera.position.distanceTo(trainPosition));
		const targetOffset = cameraOffset.multiplyScalar(direction === 'right' ? lookDistance : -lookDistance);
		const target = trainPosition.clone().add(targetOffset);
		target.y = trainPosition.y + 1;

		this.camera.lookAt(target);
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
		leftPlane.position.set(-9, -4.75, 0);
		leftPlane.renderOrder = -10;

		const rightPlane = new THREE.Mesh(geometry, rightMaterial);
		rightPlane.position.set(9, -5.5, 0);
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
		this.parallaxTextures[0].offset.x = offset;
		this.parallaxTextures[1].offset.x = -offset;
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

	addInfoMarkers(): void {
		if (!this.scene) return;

		this.infoIconTexture ??= buildInfoIconTexture();
		const markerCreatedAt = performance.now();

		const anchor = this.trainModel?.position ?? new THREE.Vector3(0, 0, 0);
		for (const def of INFO_MARKER_DEFS) {
			const material = new THREE.SpriteMaterial({
				map: this.infoIconTexture,
				transparent: true,
				depthWrite: false,
				depthTest: false,   // always render in front of 3D geometry
				sizeAttenuation: true,
			});
			const sprite = new THREE.Sprite(material);
			sprite.position
				.set(def.position[0], def.position[1], def.position[2])
				.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
				.add(anchor);
			sprite.scale.set(1, 1, 1);
			sprite.renderOrder = 100;
			sprite.visible = false;
			sprite.userData['markerId'] = def.id;
			sprite.userData['tourStep'] = def.tourStep;

			// Keep a constant screen-space size regardless of camera distance.
			sprite.onBeforeRender = (renderer, _scene, camera) => {
				if (!sprite.visible) return;
				const t = (performance.now() - markerCreatedAt) / 1000;
				const pulse = 0.92 + 0.08 * Math.sin(t * 2.2 + def.position[0]);
				const dist = camera.position.distanceTo(sprite.position);
				const fovY = (camera as THREE.PerspectiveCamera).fov ?? 75;
				const h = renderer.domElement.clientHeight || renderer.domElement.height;
				const focalPx = (h / 2) / Math.tan(THREE.MathUtils.degToRad(fovY / 2));
				const worldScale = (INFO_MARKER_TARGET_PX * dist) / focalPx;
				const s = worldScale * pulse;
				sprite.scale.set(s, s, 1);
			};

			this.scene.add(sprite);
			this.infoMarkerSprites.push(sprite);
		}
	}

	showInfoMarkersForStep(step: 0 | 1 | 2): void {
		this.infoMarkerSprites.forEach((sprite) => {
			sprite.visible = sprite.userData['tourStep'] === step;
		});
	}

	hideAllInfoMarkers(): void {
		this.infoMarkerSprites.forEach((sprite) => { sprite.visible = false; });
	}

	getClickedInfoMarkerId(clientX: number, clientY: number): string | null {
		if (!this.camera || !this.renderer || this.infoMarkerSprites.length === 0) return null;

		const rect = this.renderer.domElement.getBoundingClientRect();
		const x = ((clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((clientY - rect.top) / rect.height) * 2 + 1;

		this.markerRaycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

		const visible = this.infoMarkerSprites.filter((s) => s.visible);
		const hits = this.markerRaycaster.intersectObjects(visible);
		if (hits.length > 0) {
			return (hits[0].object.userData['markerId'] as string) ?? null;
		}
		return null;
	}

	private removeInfoMarkers(): void {
		this.infoMarkerSprites.forEach((sprite) => {
			this.scene?.remove(sprite);
			(sprite.material as THREE.SpriteMaterial).dispose();
		});
		this.infoMarkerSprites = [];
		this.infoIconTexture?.dispose();
		this.infoIconTexture = null;
	}

	stop(): void {
		if (this.scene && this.insideViewLight) {
			this.scene.remove(this.insideViewLight);
		}
		this.insideViewLight = null;
		this.disposeParallaxMeshes();
		this.removeInfoMarkers();

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
	const locomotiveAudioRef = useRef<HTMLAudioElement | null>(null);
	const hornAudioRef = useRef<HTMLAudioElement | null>(null);
	// Tracks when a popup was last opened to prevent the backdrop click from closing
	// it in the same gesture (pointerdown opens → synthetic click fires on backdrop).
	const popupOpenedAtRef = useRef<number>(0);
	const [isAuthorized, setIsAuthorized] = React.useState(false);
	const [hasStarted, setHasStarted] = React.useState(false);
	const [isStarting, setIsStarting] = React.useState(false);
	const [cameraPosition, setCameraPosition] = React.useState<{ x: number; y: number; z: number } | null>(null);
	const [isTrainMoving, setIsTrainMoving] = React.useState(false);
	const [isInsideView, setIsInsideView] = React.useState(false);
	const [tourStep, setTourStep] = React.useState<0 | 1 | 2>(0);
	const [showTourText, setShowTourText] = React.useState(true);
	const [showDriveHint, setShowDriveHint] = React.useState(false);
	const [activeInfoPopup, setActiveInfoPopup] = React.useState<string | null>(null);

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
			session.addInfoMarkers();
			session.showInfoMarkersForStep(0);
			sessionRef.current = session;
			setTourStep(0);
			setShowTourText(true);
			setShowDriveHint(false);
			setIsInsideView(false);
			setIsTrainMoving(false);
			setActiveInfoPopup(null);
			if (locomotiveAudioRef.current) {
				locomotiveAudioRef.current.pause();
				locomotiveAudioRef.current.currentTime = 0;
			}
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
		const audio = new Audio('/sounds/steam-locomotive.mp3');
		audio.loop = true;
		audio.preload = 'auto';
		audio.volume = 0.35;
		locomotiveAudioRef.current = audio;

		const hornAudio = new Audio('/sounds/steam-locomotive-horn.mp3');
		hornAudio.preload = 'auto';
		hornAudio.volume = 0.65;
		hornAudioRef.current = hornAudio;

		return () => {
			if (locomotiveAudioRef.current) {
				locomotiveAudioRef.current.pause();
				locomotiveAudioRef.current.src = '';
				locomotiveAudioRef.current.load();
			}
			if (hornAudioRef.current) {
				hornAudioRef.current.pause();
				hornAudioRef.current.src = '';
				hornAudioRef.current.load();
			}
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

	useEffect(() => {
		if (!hasStarted) return;

		const handlePointerDown = (e: PointerEvent) => {
			const id = sessionRef.current?.getClickedInfoMarkerId(e.clientX, e.clientY) ?? null;
			if (id) {
				popupOpenedAtRef.current = Date.now();
				setActiveInfoPopup(id);
			}
		};

		// The Three.js canvas is the first canvas inside the container
		const canvas = containerRef.current?.querySelector('canvas');
		canvas?.addEventListener('pointerdown', handlePointerDown);
		return () => canvas?.removeEventListener('pointerdown', handlePointerDown);
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

	const lookAround = (direction: 'left' | 'right') => {
		sessionRef.current?.setDebugLookDirection(direction);
	};

	const startTrain = () => {
		if (!sessionRef.current || isTrainMoving || !isInsideView) return;

		sessionRef.current
			.enableParallaxBackdrops(BAHNHOF_PARALLAX_URL)
			.then(() => {
				sessionRef.current?.hideAllInfoMarkers();
				setIsTrainMoving(true);
				setShowTourText(false);
				setShowDriveHint(true);
				setActiveInfoPopup(null);
				if (locomotiveAudioRef.current) {
					locomotiveAudioRef.current.currentTime = 0;
					void locomotiveAudioRef.current.play().catch((err) => {
						console.warn('[BahnhofView] Failed to play locomotive audio', err);
					});
				}
			})
			.catch((err) => console.error('[BahnhofView] Failed to load parallax backdrop', err));
	};

	const playHorn = () => {
		if (!hornAudioRef.current) return;
		hornAudioRef.current.currentTime = 0;
		void hornAudioRef.current.play().catch((err) => {
			console.warn('[BahnhofView] Failed to play horn audio', err);
		});
	};

	const handleNextStep = () => {
		const session = sessionRef.current;
		if (!session) return;

		if (tourStep === 0) {
			session.setCameraPositionAndLookAt(-6.5, 0.5, 2);
			session.showInfoMarkersForStep(1);
			setTourStep(1);
			setActiveInfoPopup(null);
			return;
		}

		if (tourStep === 1) {
			session.setInsideView();
			session.showInfoMarkersForStep(2);
			setIsInsideView(true);
			setTourStep(2);
			setActiveInfoPopup(null);
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
					onCompleteInitiated={() => {
						setShowTourText(false);
						setShowDriveHint(false);
						if (locomotiveAudioRef.current) {
							locomotiveAudioRef.current.pause();
							locomotiveAudioRef.current.currentTime = 0;
						}
						if (hornAudioRef.current) {
							hornAudioRef.current.pause();
							hornAudioRef.current.currentTime = 0;
						}
					}}
					isCurrentStationCompleted={isCurrentStationCompleted}
					showCompleteButton={isTrainMoving}
					ignoreCompleteTimer={true}
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
						<button
							onClick={() => {
								void playHorn();
							}}
							style={{
								marginTop: '10px',
								width: '100%',
								border: 'none',
								borderRadius: '12px',
								padding: '10px 12px',
								background: 'var(--color-primary)',
								color: 'var(--color-white)',
								fontWeight: 800,
								cursor: 'pointer',
								fontSize: '0.85rem',
							}}
						>
							{bahnhofTexts.tourHornButton}
						</button>
					</div>
				)}

				{hasStarted && activeInfoPopup && (() => {
					const popup = bahnhofTexts.infoPopups[activeInfoPopup];
					if (!popup) return null;
					return (
						<div
							style={{
								position: 'fixed',
								inset: 0,
								zIndex: 10015,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								padding: '20px',
								background: 'rgba(0,0,0,0.32)',
								backdropFilter: 'blur(4px)',
								WebkitBackdropFilter: 'blur(4px)',
							}}
							onClick={() => {
							// Guard: ignore the synthetic click that fires right after
							// the pointerdown that opened this popup.
							if (Date.now() - popupOpenedAtRef.current < 300) return;
							setActiveInfoPopup(null);
						}}
						>
							<div
								style={{
									width: 'min(420px, calc(100vw - 32px))',
									borderRadius: '20px',
									background: 'rgba(228, 232, 236, 0.18)',
									border: '1px solid rgba(255,255,255,0.30)',
									padding: '20px',
									boxShadow: '0 10px 40px rgba(0,0,0,0.35)',
									backdropFilter: 'blur(22px) grayscale(10%)',
									WebkitBackdropFilter: 'blur(22px) grayscale(10%)',
									color: 'var(--color-white)',
								}}
								onClick={(e) => e.stopPropagation()}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
									<div
										style={{
											width: '38px',
											height: '38px',
											borderRadius: '50%',
											background: 'var(--color-primary)',
											border: '2px solid var(--color-white-70)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: '1.1rem',
											fontWeight: 800,
											fontFamily: 'Georgia, serif',
											color: 'var(--color-white)',
											flexShrink: 0,
										}}
									>
										i
									</div>
									<h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, lineHeight: 1.2 }}>
										{popup.title}
									</h3>
								</div>
								<p style={{ margin: '0 0 18px', fontSize: '0.88rem', lineHeight: 1.55, opacity: 0.88 }}>
									{popup.text}
								</p>
								<button
									onClick={() => setActiveInfoPopup(null)}
									style={{
										width: '100%',
										border: 'none',
										borderRadius: 'var(--radius)',
										padding: '10px',
										background: 'var(--color-primary)',
										color: 'var(--color-white)',
										fontWeight: 700,
										cursor: 'pointer',
										fontSize: '0.9rem',
									}}
								>
									{bahnhofTexts.infoPopupClose}
								</button>
							</div>
						</div>
					);
				})()}

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
							<button
								onClick={() => lookAround('left')}
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
								Look Left
							</button>
							<button
								onClick={() => lookAround('right')}
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
								Look Right
							</button>
						</div>
					</div>
				)}
			</>
		</ARProximityGate>
	);
};
