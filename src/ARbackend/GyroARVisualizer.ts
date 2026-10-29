import * as THREE from 'three';
import { ARInitOptions, ARSession, ARVisualizer } from './ARVisualizer';

export class GyroARVisualizer extends ARVisualizer implements ARSession {
	private readonly initOptions: ARInitOptions;
	private readonly ownVideoElement: HTMLVideoElement;
	private readonly euler = new THREE.Euler();
	private readonly deltaQuaternion = new THREE.Quaternion();
	private alphaDelta = 0;
	private betaDelta = 0;
	private readonly smoothingFactor = 0.2;
	private readonly minResidualDelta = 1e-4;
	private lastAlpha: number | null = null;
	private lastBeta: number | null = null;
	private lastMotionTimestamp: number | null = null;
	private hasGyroData = false;
	private gyroEnabled = false;
	private usingMotionRate = false;
	private readonly gyroSensitivity = 1;
	private gridHelper: THREE.GridHelper | null = null;
	private panoramaBackdrop: THREE.Mesh | null = null;
	private readonly handleOwnResize = (): void => {
		if (!this.camera || !this.renderer) return;
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	};

	constructor(
		container: HTMLDivElement,
		videoElement: HTMLVideoElement,
		options: ARInitOptions = {}
	) {
		super(container, videoElement, options);
		this.initOptions = options;
		this.ownVideoElement = videoElement;
	}

	async init(): Promise<void> {
		this.ownVideoElement.srcObject = null;
		this.ownVideoElement.style.display = 'none';

		this.initThree();
		this.applySpaceLook();
		this.addDebugGrid();
		await this.enableGyroControls();
		this.animate();
		window.addEventListener('resize', this.handleOwnResize);
	}

	public loadGLTFModel(
		url: string,
		options: {
			position?: THREE.Vector3 | [number, number, number];
			rotation?: THREE.Euler | [number, number, number];
			scale?: number | [number, number, number];
		} = {}
	): Promise<THREE.Object3D> {
		return super.loadGLTFModel(url, options);
	}

	public loadGLTFModelWithAnimations(
		url: string,
		options: {
			position?: THREE.Vector3 | [number, number, number];
			rotation?: THREE.Euler | [number, number, number];
			scale?: number | [number, number, number];
		} = {}
	): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] }> {
		return super.loadGLTFModelWithAnimations(url, options);
	}

	public setPanoramaBackground(texture: THREE.Texture | null): void {
		if (!this.scene) return;

		if (this.panoramaBackdrop) {
			this.disposePanoramaBackdrop();
			this.panoramaBackdrop = null;
		}

		if (!texture) return;

		texture.needsUpdate = true;

		const geometry = new THREE.SphereGeometry(120, 64, 32);
		const material = new THREE.MeshBasicMaterial({
			map: texture,
			side: THREE.BackSide,
			depthWrite: false,
		});
		const backdrop = new THREE.Mesh(geometry, material);
		backdrop.name = 'PanoramaBackdrop';
		backdrop.renderOrder = -1000;
		this.scene.add(backdrop);
		this.panoramaBackdrop = backdrop;
	}

	private disposePanoramaBackdrop(): void {
		if (!this.panoramaBackdrop) return;

		if (this.scene) {
			this.scene.remove(this.panoramaBackdrop);
		}

		this.panoramaBackdrop.geometry.dispose();
		const material = this.panoramaBackdrop.material;
		if (Array.isArray(material)) {
			material.forEach((part) => part.dispose());
		} else {
			const meshMaterial = material as THREE.MeshBasicMaterial;
			meshMaterial.map?.dispose();
			meshMaterial.dispose();
		}
	}

	protected animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);
		this.updateCameraFromGyro();
		this.beforeRender();

		if (this.renderer && this.scene && this.camera) {
			this.renderer.render(this.scene, this.camera);
		}
	};

	/** Wird jedes Frame nach der Kamera-Aktualisierung und vor dem Rendern aufgerufen. */
	protected beforeRender(): void {}

	private addDebugGrid(): void {
		if (!this.scene || this.gridHelper) return;

		this.gridHelper = new THREE.GridHelper(20, 20, 0xff4444, 0x44aaff);
		this.gridHelper.position.set(0, -2, 0);
		this.scene.add(this.gridHelper);
	}

	private applySpaceLook(): void {
		if (!this.scene) return;

		this.scene.background = new THREE.Color(0x101820);
		const axes = new THREE.AxesHelper(2);
		this.scene.add(axes);
	}

	private async enableGyroControls(): Promise<void> {
		if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
			return;
		}

		const permissionGranted = await this.requestBrowserMotionPermissions();
		if (!permissionGranted) {
			this.initOptions.onError?.(
				new Error('Browser denied motion/orientation permission for gyroscope access')
			);
			return;
		}

		window.addEventListener('devicemotion', this.handleDeviceMotion, true);
		window.addEventListener('deviceorientation', this.handleDeviceOrientation, true);
		this.gyroEnabled = true;
	}

	private async requestBrowserMotionPermissions(): Promise<boolean> {
		type PermissionState = 'granted' | 'denied';
		type PermissionRequestable = {
			requestPermission?: () => Promise<PermissionState>;
		};

		const orientationCtor = DeviceOrientationEvent as typeof DeviceOrientationEvent & PermissionRequestable;
		const motionCtor =
			typeof DeviceMotionEvent !== 'undefined'
				? (DeviceMotionEvent as typeof DeviceMotionEvent & PermissionRequestable)
				: undefined;

		try {
			if (typeof orientationCtor.requestPermission === 'function') {
				const orientationPermission = await orientationCtor.requestPermission();
				if (orientationPermission !== 'granted') {
					return false;
				}
			}

			if (motionCtor && typeof motionCtor.requestPermission === 'function') {
				const motionPermission = await motionCtor.requestPermission();
				if (motionPermission !== 'granted') {
					return false;
				}
			}

			return true;
		} catch (err) {
			this.initOptions.onError?.(err);
			return false;
		}
	}

	private normalizeAngleDelta(current: number, previous: number): number {
		const tau = Math.PI * 2;
		let delta = current - previous;

		if (delta > Math.PI) delta -= tau;
		if (delta < -Math.PI) delta += tau;

		return delta;
	}

	private handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
		if (this.usingMotionRate) return;

		const nextAlpha = THREE.MathUtils.degToRad(event.alpha ?? 0);
		const nextBeta = THREE.MathUtils.degToRad(event.beta ?? 0);

		if (this.lastAlpha !== null && this.lastBeta !== null) {
			this.alphaDelta += this.normalizeAngleDelta(nextAlpha, this.lastAlpha);
			this.betaDelta += this.normalizeAngleDelta(nextBeta, this.lastBeta);
		}

		this.lastAlpha = nextAlpha;
		this.lastBeta = nextBeta;
		this.hasGyroData = true;
	};

	private handleDeviceMotion = (event: DeviceMotionEvent): void => {
		const rotation = event.rotationRate;
		if (!rotation) return;

		const now = event.timeStamp;
		if (this.lastMotionTimestamp === null) {
			this.lastMotionTimestamp = now;
			return;
		}

		const deltaSeconds = Math.max(0, (now - this.lastMotionTimestamp) / 1000);
		this.lastMotionTimestamp = now;
		if (deltaSeconds === 0) return;

		const boundedDeltaSeconds = Math.min(deltaSeconds, 0.05);
		const alphaRate = THREE.MathUtils.degToRad(rotation.alpha ?? 0);
		const betaRate = THREE.MathUtils.degToRad(rotation.beta ?? 0);

		if (!Number.isFinite(alphaRate) || !Number.isFinite(betaRate)) {
			return;
		}

		const maxStep = Math.PI / 6;
		const alphaStep = THREE.MathUtils.clamp(alphaRate * boundedDeltaSeconds, -maxStep, maxStep);
		const betaStep = THREE.MathUtils.clamp(betaRate * boundedDeltaSeconds, -maxStep, maxStep);

		this.alphaDelta += alphaStep;
		this.betaDelta += betaStep;

		this.usingMotionRate = true;
		this.hasGyroData = true;
	};

	protected updateCameraFromGyro(): void {
		if (!this.gyroEnabled || !this.hasGyroData || !this.camera) return;
		if (this.alphaDelta === 0 && this.betaDelta === 0) return;

		const appliedAlpha = this.alphaDelta * this.smoothingFactor;
		const appliedBeta = this.betaDelta * this.smoothingFactor;

		// Apply yaw rotation around world Y-axis (pre-multiply for world-space rotation)
		this.euler.set(0, appliedBeta * this.gyroSensitivity, 0, 'XYZ');
		this.deltaQuaternion.setFromEuler(this.euler);
		this.camera.quaternion.multiplyQuaternions(this.deltaQuaternion, this.camera.quaternion);

		// Apply pitch rotation around local X-axis (post-multiply for local-space rotation)
		this.euler.set(appliedAlpha * this.gyroSensitivity, 0, 0, 'XYZ');
		this.deltaQuaternion.setFromEuler(this.euler);
		this.camera.quaternion.multiply(this.deltaQuaternion);

		this.camera.quaternion.normalize();

		this.alphaDelta -= appliedAlpha;
		this.betaDelta -= appliedBeta;

		if (Math.abs(this.alphaDelta) < this.minResidualDelta) this.alphaDelta = 0;
		if (Math.abs(this.betaDelta) < this.minResidualDelta) this.betaDelta = 0;
	}

	stop(): void {
		window.removeEventListener('resize', this.handleOwnResize);

		if (this.gyroEnabled) {
			window.removeEventListener('devicemotion', this.handleDeviceMotion, true);
			window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
		}

		this.alphaDelta = 0;
		this.betaDelta = 0;
		this.lastAlpha = null;
		this.lastBeta = null;
		this.lastMotionTimestamp = null;
		this.usingMotionRate = false;

		if (this.gridHelper && this.scene) {
			this.scene.remove(this.gridHelper);
		}
		this.gridHelper = null;

		if (this.panoramaBackdrop && this.scene) {
			this.disposePanoramaBackdrop();
		}
		this.panoramaBackdrop = null;
		this.ownVideoElement.style.display = '';

		super.stop();
	}
}

export const initGyroAR = async (
	container: HTMLDivElement,
	videoElement: HTMLVideoElement,
	options: ARInitOptions = {}
): Promise<ARSession> => {
	const visualizer = new GyroARVisualizer(container, videoElement, options);
	await visualizer.init();
	return visualizer;
};
