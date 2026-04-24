import * as THREE from 'three';
import { ARInitOptions, ARSession, ARVisualizer } from './ARVisualizer';

export class GyroARVisualizer extends ARVisualizer implements ARSession {
	private readonly initOptions: ARInitOptions;
	private readonly ownVideoElement: HTMLVideoElement;
	private readonly euler = new THREE.Euler();
	private readonly q0 = new THREE.Quaternion();
	private readonly q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
	private readonly zee = new THREE.Vector3(0, 0, 1);
	private screenOrientation = 0;
	private alpha = 0;
	private beta = 0;
	private gamma = 0;
	private hasGyroData = false;
	private gyroEnabled = false;
	private gridHelper: THREE.GridHelper | null = null;
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

	protected animate = (): void => {
		this.animationId = requestAnimationFrame(this.animate);
		this.updateCameraFromGyro();

		if (this.renderer && this.scene && this.camera) {
			this.renderer.render(this.scene, this.camera);
		}
	};

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

		this.screenOrientation = this.getScreenOrientation();
		window.addEventListener('orientationchange', this.handleOrientationChange);
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

	private getScreenOrientation(): number {
		const screenOrientation = window.screen.orientation;
		if (screenOrientation && typeof screenOrientation.angle === 'number') {
			return THREE.MathUtils.degToRad(screenOrientation.angle);
		}

		const legacyOrientation = (window as unknown as { orientation?: number }).orientation;
		if (typeof legacyOrientation === 'number') {
			return THREE.MathUtils.degToRad(legacyOrientation);
		}

		return 0;
	}

	private handleOrientationChange = (): void => {
		this.screenOrientation = this.getScreenOrientation();
	};

	private handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
		this.alpha = THREE.MathUtils.degToRad(event.alpha ?? 0);
		this.beta = THREE.MathUtils.degToRad(event.beta ?? 0);
		this.gamma = THREE.MathUtils.degToRad(event.gamma ?? 0);
		this.hasGyroData = true;
	};

	private updateCameraFromGyro(): void {
		if (!this.gyroEnabled || !this.hasGyroData || !this.camera) return;

		this.euler.set(this.beta, this.alpha, -this.gamma, 'YXZ');
		this.camera.quaternion.setFromEuler(this.euler);
		this.camera.quaternion.multiply(this.q1);
		this.q0.setFromAxisAngle(this.zee, -this.screenOrientation);
		this.camera.quaternion.multiply(this.q0);
	}

	stop(): void {
		window.removeEventListener('resize', this.handleOwnResize);

		if (this.gyroEnabled) {
			window.removeEventListener('orientationchange', this.handleOrientationChange);
			window.removeEventListener('deviceorientation', this.handleDeviceOrientation, true);
		}

		if (this.gridHelper && this.scene) {
			this.scene.remove(this.gridHelper);
		}
		this.gridHelper = null;
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
