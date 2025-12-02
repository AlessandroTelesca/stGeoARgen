import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ARView } from '../ARView';

/**
 * Test Suite für ARView Component
 * 
 * Testet die AR-View Komponente mit Mock-Implementierungen für:
 * - getUserMedia API (Kamera-Zugriff)
 * - Three.js Rendering
 * - Canvas-Erstellung
 */

// Mock für Three.js
vi.mock('three', () => {
  class MockScene {
    add = vi.fn();
  }

  class MockPerspectiveCamera {
    position = { z: 0 };
    aspect = 0;
    updateProjectionMatrix = vi.fn();
  }

  class MockWebGLRenderer {
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    domElement = document.createElement('canvas');
    render = vi.fn();
    dispose = vi.fn();
  }

  class MockBoxGeometry {
    dispose = vi.fn();
  }

  class MockMeshBasicMaterial {
    dispose = vi.fn();
  }

  class MockMesh {
    rotation = { x: 0, y: 0 };
    geometry = { dispose: vi.fn() };
    material = { dispose: vi.fn() };
    add = vi.fn();
  }

  class MockEdgesGeometry {}

  class MockLineBasicMaterial {}

  class MockLineSegments {
    add = vi.fn();
  }

  class MockAmbientLight {}

  class MockDirectionalLight {
    position = { set: vi.fn() };
  }

  return {
    Scene: MockScene,
    PerspectiveCamera: MockPerspectiveCamera,
    WebGLRenderer: MockWebGLRenderer,
    BoxGeometry: MockBoxGeometry,
    MeshBasicMaterial: MockMeshBasicMaterial,
    Mesh: MockMesh,
    EdgesGeometry: MockEdgesGeometry,
    LineBasicMaterial: MockLineBasicMaterial,
    LineSegments: MockLineSegments,
    AmbientLight: MockAmbientLight,
    DirectionalLight: MockDirectionalLight
  };
});

describe('ARView Component', () => {
  // Mock für getUserMedia
  const mockGetUserMedia = vi.fn();
  const mockVideoPlay = vi.fn();
  const mockStreamTrack = {
    stop: vi.fn()
  };

  beforeEach(() => {
    // getUserMedia Mock
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [mockStreamTrack]
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: mockGetUserMedia
      }
    });

    // HTMLVideoElement.play Mock
    HTMLVideoElement.prototype.play = mockVideoPlay;
    mockVideoPlay.mockResolvedValue(undefined);

    // Window.requestAnimationFrame Mock - nicht direkt ausführen
    global.requestAnimationFrame = vi.fn(() => 1);

    global.cancelAnimationFrame = vi.fn();

    // Window innerWidth/innerHeight
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('sollte die Komponente rendern', () => {
    const { container } = render(<ARView />);
    expect(container.firstChild).toBeTruthy();
  });

  it('sollte einen Video-Element mit korrekten Attributen erstellen', () => {
    render(<ARView />);
    const video = document.querySelector('video');
    
    expect(video).toBeTruthy();
    expect(video).toHaveProperty('playsInline', true);
    expect(video).toHaveProperty('muted', true);
  });

  it('sollte getUserMedia mit korrekten Parametern aufrufen', async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
    });
  });

  it('sollte video.play() nach erfolgreichem Stream-Setup aufrufen', async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(mockVideoPlay).toHaveBeenCalled();
    });
  });

  it('sollte Fehler beim Kamera-Zugriff behandeln', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('Camera access denied');
    mockGetUserMedia.mockRejectedValueOnce(error);

    render(<ARView />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Fehler beim Zugriff auf die Kamera:',
        error
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('sollte requestAnimationFrame aufrufen', async () => {
    render(<ARView />);

    await waitFor(() => {
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });
  });

  it('sollte beim Unmount aufräumen', async () => {
    const { unmount } = render(<ARView />);

    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Warten, damit der Stream gesetzt wird
    await new Promise(resolve => setTimeout(resolve, 50));

    unmount();

    // Cleanup sollte aufgerufen werden
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('sollte Container mit korrekten Styles haben', () => {
    const { container } = render(<ARView />);
    const arContainer = container.firstChild as HTMLElement;

    expect(arContainer.style.position).toBe('fixed');
    expect(arContainer.style.width).toBe('100vw');
    expect(arContainer.style.height).toBe('100vh');
  });

  it('sollte auf Window-Resize reagieren', () => {
    const { unmount } = render(<ARView />);
    
    const resizeEvent = new Event('resize');
    window.dispatchEvent(resizeEvent);

    // Event Listener sollte hinzugefügt worden sein
    // Nach unmount sollte er entfernt werden
    unmount();
  });
});
