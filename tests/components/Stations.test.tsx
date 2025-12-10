/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationDetail } from '../../src/components/StationDetail';
import { StationsView } from '../../src/components/StationsView';

const sampleStation = {
  id: 1,
  title: 'Sample Station',
  description: 'Short description',
  imageUrl: 'https://example.com/image.jpg',
  longDescription: 'A much longer description for the station.',
  points: 20,
  status: 'available' as const,
  latitude: 1,
  longitude: 2,
};

const samplePaths = [
  {
    id: 'alpha',
    title: 'Alpha Path',
    stations: [
      { id: 1, title: 'Alpha One', description: 'First', imageUrl: 'img', status: 'available' as const, points: 10 },
      { id: 2, title: 'Alpha Two', description: 'Locked', imageUrl: 'img', status: 'locked' as const, points: 10 },
    ],
  },
  {
    id: 'beta',
    title: 'Beta Path',
    stations: [
      { id: 3, title: 'Beta Done', description: 'Done', imageUrl: 'img', status: 'completed' as const, points: 5 },
    ],
  },
];

describe('StationDetail', () => {
  test('invokes onComplete when marking as done', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <StationDetail
        station={{ ...sampleStation }}
        onClose={onClose}
        onComplete={onComplete}
      />
    );

    expect(screen.getByText(sampleStation.title)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /als erledigt markieren/i }));
    expect(onComplete).toHaveBeenCalledWith(sampleStation.id, sampleStation.points);

    openSpy.mockRestore();
  });

  test('closes when X button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <StationDetail
        station={{ ...sampleStation }}
        onClose={onClose}
        onComplete={vi.fn()}
      />
    );

    const closeButtons = screen.getAllByRole('button');
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);

    openSpy.mockRestore();
  });

  test('opens navigation when navigate button clicked', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <StationDetail
        station={{ ...sampleStation }}
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /zur station navigieren/i }));
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('google.com/maps'),
      '_blank'
    );

    openSpy.mockRestore();
  });

  test('shows completed state for completed station', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <StationDetail
        station={{ ...sampleStation, status: 'completed' }}
        onClose={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    expect(screen.getByText(/station abgeschlossen/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /als erledigt markieren/i })).not.toBeInTheDocument();

    openSpy.mockRestore();
  });
});

describe('StationsView', () => {
  test('clicks available station and ignores locked ones', async () => {
    const user = userEvent.setup();
    const onStationClick = vi.fn();

    render(
      <StationsView paths={samplePaths} onStationClick={onStationClick} onBack={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /alpha one/i }));
    expect(onStationClick).toHaveBeenCalledWith('alpha', 1);

    await user.click(screen.getByRole('button', { name: /alpha two/i }));
    expect(onStationClick).toHaveBeenCalledTimes(1);
  });

  test('filters to completed stations', async () => {
    const user = userEvent.setup();
    render(
      <StationsView paths={samplePaths} onStationClick={vi.fn()} onBack={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /abgeschlossen/i }));

    expect(screen.getByText('Beta Done')).toBeInTheDocument();
    expect(screen.queryByText('Alpha One')).not.toBeInTheDocument();
  });
});
