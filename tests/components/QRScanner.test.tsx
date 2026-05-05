import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRScanner } from '../../src/components/QRScanner';
import jsQR from 'jsqr';

vi.mock('jsqr', () => ({
  default: vi.fn(),
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('QRScanner', () => {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  const originalPlay = HTMLMediaElement.prototype.play;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;

  beforeEach(() => {
    mockGetUserMedia.mockClear();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });

    window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    window.cancelAnimationFrame = vi.fn();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      }),
    });
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    HTMLMediaElement.prototype.play = originalPlay;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  test('renders QR scanner with title', () => {
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} />);
    expect(screen.getByText(/qr-code scanner/i)).toBeInTheDocument();
  });

  test('starts camera on mount', async () => {
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} />);
    
    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: { facingMode: 'environment' }
      });
    });
  });

  test('closes when X button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QRScanner onClose={onClose} onScan={vi.fn()} />);

    const closeButton = screen.getByRole('button');
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('displays scanning instruction', () => {
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} />);
    expect(screen.getByText(/halte den qr-code vor die kamera/i)).toBeInTheDocument();
  });

  test('displays video element for camera stream', () => {
    const { container } = render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} />);
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoPlay');
    expect(video).toHaveAttribute('playsInline');
  });

  test('stops camera stream on unmount', async () => {
    const stopMock = vi.fn();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: stopMock }],
    });

    const { unmount } = render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} />);
    
    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    unmount();
    
    expect(stopMock).toHaveBeenCalled();
  });

  test('scans a valid AR view and maps it to the view key', async () => {
    const onScan = vi.fn();
    const stopMock = vi.fn();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: stopMock }],
    });

    vi.mocked(jsQR).mockReturnValue({ data: 'https://example.com/klosterweiher' } as any);

    const { container } = render(<QRScanner onClose={vi.fn()} onScan={onScan} />);
    const video = container.querySelector('video') as HTMLVideoElement | null;
    if (!video) throw new Error('Video element not found');

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(typeof video.onloadedmetadata).toBe('function');
    });

    Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
    Object.defineProperty(video, 'HAVE_ENOUGH_DATA', { value: 4, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true });

    await act(async () => {
      video.onloadedmetadata?.(new Event('loadedmetadata'));
    });

    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('klosterweiher');
    });

    expect(stopMock).toHaveBeenCalled();
  });

  test('passes raw QR data when no AR view matches', async () => {
    const onScan = vi.fn();
    vi.mocked(jsQR).mockReturnValue({ data: 'https://example.com/some-path' } as any);

    const { container } = render(<QRScanner onClose={vi.fn()} onScan={onScan} />);
    const video = container.querySelector('video') as HTMLVideoElement | null;
    if (!video) throw new Error('Video element not found');

    await vi.waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
      expect(typeof video.onloadedmetadata).toBe('function');
    });

    Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
    Object.defineProperty(video, 'HAVE_ENOUGH_DATA', { value: 4, configurable: true });
    Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true });

    await act(async () => {
      video.onloadedmetadata?.(new Event('loadedmetadata'));
    });

    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('https://example.com/some-path');
    });
  });
});
