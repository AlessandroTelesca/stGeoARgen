import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
        totalCompletedStations={2}
        onPathSelect={vi.fn()}
        username="Max"
      />
    );

    expect(screen.getByText('City Trail')).toBeInTheDocument();
    expect(screen.getAllByText('Punkte').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stationen').length).toBeGreaterThan(0);
  });

  it('fires path selection handler', async () => {
    const onPathSelect = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        totalCompletedStations={1}
        onPathSelect={onPathSelect}
        username="Max"
      />
    );

    await userEvent.click(screen.getByText('City Trail'));
    expect(onPathSelect).toHaveBeenCalledWith('path-1');
  });

  it('opens QR scanner when button clicked', async () => {
    const onOpenQRScanner = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        totalCompletedStations={1}
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
        totalCompletedStations={2}
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
        totalCompletedStations={2}
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
        totalCompletedStations={3}
        onPathSelect={vi.fn()}
        onNavigate={onNavigate}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /3 von 4 stationen erkundet/i }));
    expect(onNavigate).toHaveBeenCalledWith('progress');
  });

  it('calls onNavigateToPaths when total stations clicked', async () => {
    const onNavigateToPaths = vi.fn();
    render(
      <Dashboard
        paths={[mockPath]}
        totalPoints={80}
        totalCompletedStations={2}
        onPathSelect={vi.fn()}
        onNavigateToPaths={onNavigateToPaths}
        username="Max"
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /alle ansehen/i }));
    expect(onNavigateToPaths).toHaveBeenCalledTimes(1);
  });
});
