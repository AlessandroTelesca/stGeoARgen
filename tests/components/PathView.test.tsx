import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/components/StationCard', () => ({
  StationCard: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <button onClick={onClick}>{title}</button>
  ),
}));

vi.mock('../../src/components/ProgressBar', () => ({
  ProgressBar: ({ current, total }: { current: number; total: number }) => (
    <div>{current}/{total}</div>
  ),
}));

import { PathView } from '../../src/components/PathView';

const stations = [
  {
    id: 1,
    title: 'Station A',
    description: 'Desc',
    imageUrl: 'img',
    status: 'available' as const,
    points: 10,
    latitude: 0,
    longitude: 0,
  },
];

describe('PathView', () => {
  it('renders header and stations and handles click', async () => {
    const onStationClick = vi.fn();
    const onBack = vi.fn();
    render(
      <PathView
        pathId="p1"
        pathTitle="Trail"
        pathDescription="Desc"
        stations={stations}
        onStationClick={onStationClick}
        onBack={onBack}
        userProgress={{ completedStations: 1, totalStations: 3, points: 50 }}
      />
    );

    expect(screen.getByText('Trail')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Station A'));
    expect(onStationClick).toHaveBeenCalledWith(1);
  });
});
