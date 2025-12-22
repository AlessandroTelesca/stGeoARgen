import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRScanner } from '../../src/components/QRScanner';

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

describe('QRScanner', () => {
  beforeEach(() => {
    mockGetUserMedia.mockClear();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    });
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
});
