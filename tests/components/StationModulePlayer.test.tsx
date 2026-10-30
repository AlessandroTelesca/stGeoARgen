/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationModulePlayer } from '../../src/stationModules/player/StationModulePlayer';
import type { ARChromeProps, PlayerStation } from '../../src/stationModules/player/contract';

const arChrome: ARChromeProps = {
  username: 'tester',
  onNavigateHome: vi.fn(),
  onLogin: vi.fn(),
  onLogout: vi.fn(),
  onNavigateProfile: vi.fn(),
  onRegister: vi.fn(),
  completedStations: 1,
  totalStations: 4,
  totalPoints: 20,
};

const station: PlayerStation = {
  id: 1000,
  title: 'Teststation',
  latitude: 1,
  longitude: 2,
  points: 15,
  modules: [
    { id: 'm-1', type: 'story', title_de: 'Erster Teil', title_en: null, style: 'text', text_de: 'Hallo Welt', text_en: null, image: null, quote_source: null },
    { id: 'm-2', type: 'story', title_de: 'Zweiter Teil', title_en: null, style: 'text', text_de: 'Noch ein Text', text_en: null, image: null, quote_source: null },
  ],
};

function renderPlayer(props: Partial<React.ComponentProps<typeof StationModulePlayer>> = {}) {
  const onClose = vi.fn();
  const onCompleteStation = vi.fn();
  render(
    <StationModulePlayer
      station={station}
      lang="de"
      arChrome={arChrome}
      canComplete={true}
      isGuest={false}
      onCompleteStation={onCompleteStation}
      onClose={onClose}
      {...props}
    />
  );
  return { onClose, onCompleteStation };
}

describe('StationModulePlayer', () => {
  test('plays modules in order and completes the station after the last one', async () => {
    const user = userEvent.setup();
    const { onClose, onCompleteStation } = renderPlayer();

    expect(screen.getByRole('dialog', { name: 'Teststation' })).toBeInTheDocument();
    expect(screen.getByText(/Teil 1 von 2/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zurück' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();
    expect(screen.getByText(/Teil 2 von 2/)).toBeInTheDocument();
    expect(onCompleteStation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Station abschließen' }));
    expect(onCompleteStation).toHaveBeenCalledWith(1000);
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByText('Station abgeschlossen!')).toBeInTheDocument();
  });

  test('preview closes after the last module without completing', async () => {
    const user = userEvent.setup();
    const { onClose, onCompleteStation } = renderPlayer({ preview: true });

    expect(screen.getByText('Vorschau')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await user.click(await screen.findByRole('button', { name: 'Fertig' }));

    expect(onCompleteStation).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('guest finishes without completing the station', async () => {
    const user = userEvent.setup();
    const { onClose, onCompleteStation } = renderPlayer({ canComplete: false, isGuest: true });

    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    await user.click(await screen.findByRole('button', { name: 'Fertig' }));

    expect(onCompleteStation).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows an empty state for a station without modules', async () => {
    const user = userEvent.setup();
    const { onClose } = renderPlayer({ station: { ...station, modules: [] } });

    expect(screen.getByText('Diese Station hat noch keine Inhalte')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Schließen' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
