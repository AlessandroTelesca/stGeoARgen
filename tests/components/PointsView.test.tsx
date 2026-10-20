import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Api from '../../src/services/api';

vi.mock('../../src/components/Georgi', () => ({
  Georgi: () => <div data-testid="georgi" />,
  GeorgiAvatar: () => <div data-testid="georgi" />,
}));

// Punktwerte kommen aus der DB; der PointConfigProvider lädt sie über diese API-Funktionen
vi.mock('../../src/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  apiGetPointConfig: async (): Promise<Api.PointConfig> => ({
    stations: [],
    rewards: {},
    achievements: [],
    settings: { level_size: 100, default_station_points: 10 },
  }),
  apiGetAvailableVouchers: async (): Promise<Api.AvailableVouchersResponse> => ({
    success: true,
    vouchers: [{ id: 1, code: null, description: 'Kaffee', partner_name: 'Mustermann Café', points_value: 20 }],
  }),
}));

import { PointsView } from '../../src/components/PointsView';
import { PointConfigProvider } from '../../src/contexts/PointConfigContext';

const paths = [
  { id: 'p1', title: 'Path 1', earnedPoints: 40, totalPoints: 100 },
  { id: 'p2', title: 'Path 2', earnedPoints: 60, totalPoints: 60 },
];

const baseProps = {
  totalPoints: 120,
  earnedPoints: 150,
  maxPossiblePoints: 300,
  treasure: { earnedPoints: 0, totalPoints: 0 },
  paths,
};

describe('PointsView', () => {
  it('shows level and points summary', async () => {
    render(
      <PointConfigProvider>
        <PointsView {...baseProps} onBack={vi.fn()} />
      </PointConfigProvider>
    );
    expect(await screen.findByText('Dein Level')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Path 1')).toBeInTheDocument();
  });

  it('navigates to rewards when CTA clicked', async () => {
    const onNavigateToRewards = vi.fn();
    render(
      <PointConfigProvider>
        <PointsView {...baseProps} onBack={vi.fn()} onNavigateToRewards={onNavigateToRewards} />
      </PointConfigProvider>
    );

    await userEvent.click(await screen.findByRole('button', { name: /punkte einlösen/i }));
    expect(onNavigateToRewards).toHaveBeenCalled();
  });
});
