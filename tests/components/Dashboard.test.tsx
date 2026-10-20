import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../../src/components/Dashboard';

describe('Dashboard', () => {
  const mockPath = {
    id: 'path-1',
    title: 'City Trail',
    description: 'Explore the city',
    imageUrl: 'https://example.com/path.jpg',
    totalStations: 4,
    completedStations: 2,
    totalPoints: 200,
    earnedPoints: 80,
    estimatedTime: '30 min',
    difficulty: 'Einfach' as const,
  };

  it('renders dashboard stats and path', () => {
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={120}
        lastProgressPathId="path-1"
        onPathSelect={vi.fn()}
        username="Max"
      />
    );

    expect(screen.getByRole('heading', { name: 'City Trail' })).toBeInTheDocument();
    expect(screen.getAllByText('Punkte').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stationen').length).toBeGreaterThan(0);
  });

  it('fires path selection handler', async () => {
    const onPathSelect = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        lastProgressPathId="path-1"
        onPathSelect={onPathSelect}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('heading', { name: 'City Trail' }));
    expect(onPathSelect).toHaveBeenCalledWith('path-1');
  });

  it('opens QR scanner when button clicked', async () => {
    const onOpenQRScanner = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        lastProgressPathId={null}
        onPathSelect={vi.fn()}
        onOpenQRScanner={onOpenQRScanner}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /qr-code scannen/i }));
    expect(onOpenQRScanner).toHaveBeenCalledTimes(1);
  });

  it('navigates to points view', async () => {
    const onNavigate = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={150}
        lastProgressPathId={null}
        onPathSelect={vi.fn()}
        onNavigate={onNavigate}
        username="Max"
      />
    );

    const pointsButton = screen.getByText('150').closest('button');
    if (pointsButton) {
      await userEvent.click(pointsButton);
      expect(onNavigate).toHaveBeenCalledWith('points');
    }
  });

  it('navigates to rewards view', async () => {
    const onNavigate = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={100}
        lastProgressPathId={null}
        onPathSelect={vi.fn()}
        onNavigate={onNavigate}
        username="Max"
      />
    );

    const rewardsButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('Belohnung')
    );
    if (rewardsButton) {
      await userEvent.click(rewardsButton);
      expect(onNavigate).toHaveBeenCalledWith('rewards');
    }
  });

  it('navigates to progress view', async () => {
    const onNavigate = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        lastProgressPathId="path-1"
        onPathSelect={vi.fn()}
        onNavigate={onNavigate}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /2 von 4 stationen erkundet/i }));
    expect(onNavigate).toHaveBeenCalledWith('progress');
  });

  it('calls onNavigateToPaths when total stations clicked', async () => {
    const onNavigateToPaths = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        lastProgressPathId={null}
        onPathSelect={vi.fn()}
        onNavigateToPaths={onNavigateToPaths}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /alle ansehen/i }));
    expect(onNavigateToPaths).toHaveBeenCalledTimes(1);
  });

  describe('journey card', () => {
    const forestPath = { ...mockPath, id: 'path-2', title: 'Forest Trail', totalStations: 3, completedStations: 1 };
    const untouchedPath = { ...mockPath, id: 'path-3', title: 'River Trail', totalStations: 2, completedStations: 0 };
    const journeyCard = () => screen.getByRole('button', { name: /deine reise/i });

    it('shows only the last progressed path with its own station count', () => {
      render(
        <Dashboard
          paths={[mockPath, forestPath]}
          totalPoints={0}
          lastProgressPathId="path-2"
          onPathSelect={vi.fn()}
          username="Max"
        />
      );

      expect(within(journeyCard()).getByText('Forest Trail')).toBeInTheDocument();
      expect(within(journeyCard()).getByText('1 von 3 Stationen erkundet')).toBeInTheDocument();
      expect(within(journeyCard()).queryByText('City Trail')).toBeNull();
      expect(document.getElementById('journey-other-paths')).toBeNull();
    });

    it('falls back to the first path with progress when no last path is known', () => {
      render(
        <Dashboard
          paths={[untouchedPath, mockPath]}
          totalPoints={0}
          lastProgressPathId={null}
          onPathSelect={vi.fn()}
          username="Max"
        />
      );

      expect(within(journeyCard()).getByText('City Trail')).toBeInTheDocument();
      expect(within(journeyCard()).getByText('2 von 4 Stationen erkundet')).toBeInTheDocument();
    });

    it('reveals the other paths with their own progress via the toggle', async () => {
      render(
        <Dashboard
          paths={[mockPath, forestPath]}
          totalPoints={0}
          lastProgressPathId="path-2"
          onPathSelect={vi.fn()}
          username="Max"
        />
      );

      const toggle = screen.getByRole('button', { name: /weitere pfade anzeigen/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await userEvent.click(toggle);

      const otherPaths = document.getElementById('journey-other-paths')!;
      expect(screen.getByRole('button', { name: /weitere pfade ausblenden/i })).toHaveAttribute('aria-expanded', 'true');
      expect(within(otherPaths).getByText('City Trail')).toBeInTheDocument();
      expect(within(otherPaths).getByText('2/4')).toBeInTheDocument();
      expect(within(otherPaths).queryByText('Forest Trail')).toBeNull();
    });
  });
});
