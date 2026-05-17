/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ARStationCompletionDialog } from '../../src/components/ARComponents/ARStationCompletionDialog';

describe('ARStationCompletionDialog', () => {
  test('renders stats and handles navigation actions', async () => {
    const user = userEvent.setup();
    const onNavigateHome = vi.fn();
    const onNavigateToNextStation = vi.fn();

    render(
      <ARStationCompletionDialog
        isOpen
        stationTitle="Station Alpha"
        stationPoints={25}
        durationSeconds={125}
        remainingStations={2}
        totalStations={5}
        distanceToNextStation={1200}
        onNavigateHome={onNavigateHome}
        onNavigateToNextStation={onNavigateToNextStation}
      />
    );

    expect(screen.getByText('Station abgeschlossen!')).toBeInTheDocument();
    expect(screen.getByText('Station Alpha')).toBeInTheDocument();
    expect(screen.getByText('+25 Punkte verdient!')).toBeInTheDocument();
    expect(screen.getByText('2 Min. 5 Sek.')).toBeInTheDocument();
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('noch 2')).toBeInTheDocument();
    expect(screen.getByText('1.2 km')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /zur nächsten station navigieren/i }));
    expect(onNavigateToNextStation).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /zurück zur startseite/i }));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });

  test('shows completion state when no stations remain', () => {
    render(
      <ARStationCompletionDialog
        isOpen
        stationTitle="Station Beta"
        stationPoints={0}
        durationSeconds={30}
        remainingStations={0}
        totalStations={3}
        distanceToNextStation={null}
        onNavigateHome={vi.fn()}
        onNavigateToNextStation={vi.fn()}
      />
    );

    expect(screen.getByText('Alle fertig!')).toBeInTheDocument();
    expect(screen.getByText('Pfad fertig')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /zur nächsten station navigieren/i })).toBeNull();
  });

  test('renders nothing when closed', () => {
    const { container } = render(
      <ARStationCompletionDialog
        isOpen={false}
        stationTitle="Station Closed"
        stationPoints={5}
        durationSeconds={10}
        remainingStations={1}
        totalStations={2}
        distanceToNextStation={200}
        onNavigateHome={vi.fn()}
        onNavigateToNextStation={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
