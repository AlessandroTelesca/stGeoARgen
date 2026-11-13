/// <reference types="vitest" />
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationModulePlayer } from '../../src/stationModules/player/StationModulePlayer';
import type { ARChromeProps, PlayerStation } from '../../src/stationModules/player/contract';
import type { StationModule } from '../../src/stationModules/types';

// Schätzfragen-Player durch einen Stub ersetzen, der Ergebnisse meldet und Neuaufbauten zählt
const mounts = vi.hoisted(() => ({ n: 0 }));
vi.mock('../../src/stationModules/player/players', async (importOriginal) => {
  const React = await import('react');
  const actual = await importOriginal<typeof import('../../src/stationModules/player/players')>();
  function StubEstimate({ continueLabel, onContinue, onResult }: { continueLabel: string; onContinue: () => void; onResult?: (r: { correct: number; total: number }) => void }) {
    const [mount] = React.useState(() => ++mounts.n);
    return React.createElement(
      'div',
      null,
      React.createElement('p', null, `Aufbau ${mount}`),
      React.createElement('button', { onClick: () => onResult?.({ correct: 0, total: 1 }) }, 'Ergebnis falsch'),
      React.createElement('button', { onClick: () => onResult?.({ correct: 1, total: 1 }) }, 'Ergebnis richtig'),
      React.createElement('button', { onClick: onContinue }, continueLabel)
    );
  }
  return { ...actual, MODULE_PLAYERS: { ...actual.MODULE_PLAYERS, estimate: StubEstimate } };
});

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

  describe('Bestehensgrenze', () => {
    const estimate: StationModule<string> = {
      id: 'm-est',
      type: 'estimate',
      title_de: null,
      title_en: null,
      question_de: 'Wie hoch?',
      question_en: null,
      min: 0,
      max: 100,
      step: 1,
      answer: 50,
      tolerance: 5,
      unit_de: null,
      unit_en: null,
      explanation_de: null,
      explanation_en: null,
      pass_threshold: 1,
    } as StationModule<string>;
    const gated: PlayerStation = { ...station, modules: [estimate, station.modules[1]] };

    beforeEach(() => {
      mounts.n = 0;
    });

    test('shows the gate when the threshold is missed and does not complete the station', async () => {
      const user = userEvent.setup();
      const { onCompleteStation } = renderPlayer({ station: gated });

      await user.click(screen.getByRole('button', { name: 'Ergebnis falsch' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));

      expect(screen.getByText('Fast geschafft')).toBeInTheDocument();
      expect(screen.getByText('Diese Aufgabe musst du lösen, um die Punkte der Station zu bekommen.')).toBeInTheDocument();
      expect(onCompleteStation).not.toHaveBeenCalled();
    });

    test('retry rebuilds the module, a passed result continues and completes the station', async () => {
      const user = userEvent.setup();
      const { onCompleteStation } = renderPlayer({ station: gated });

      expect(screen.getByText('Aufbau 1')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Ergebnis falsch' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));
      await user.click(screen.getByRole('button', { name: 'Nochmal versuchen' }));
      expect(await screen.findByText('Aufbau 2')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ergebnis richtig' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));
      expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Station abschließen' }));
      expect(onCompleteStation).toHaveBeenCalledWith(1000);
    });

    test('skipping ends the station without points and allows retrying the task', async () => {
      const user = userEvent.setup();
      const { onClose, onCompleteStation } = renderPlayer({ station: gated });

      await user.click(screen.getByRole('button', { name: 'Ergebnis falsch' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));
      await user.click(screen.getByRole('button', { name: 'Weiter ohne Punkte' }));
      expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Station abschließen' }));
      expect(await screen.findByText('Station beendet')).toBeInTheDocument();
      expect(onCompleteStation).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'Aufgabe wiederholen' }));
      expect(await screen.findByText('Aufbau 2')).toBeInTheDocument();
      expect(screen.getByText(/Teil 1 von 2/)).toBeInTheDocument();
    });

    test('a skipped task passed later via the back button still completes the station', async () => {
      const user = userEvent.setup();
      const { onCompleteStation } = renderPlayer({ station: gated });

      await user.click(screen.getByRole('button', { name: 'Ergebnis falsch' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));
      await user.click(screen.getByRole('button', { name: 'Weiter ohne Punkte' }));
      expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();

      // Zurück zur übersprungenen Aufgabe, diesmal bestanden
      await user.click(screen.getByRole('button', { name: 'Zurück' }));
      await user.click(await screen.findByRole('button', { name: 'Ergebnis richtig' }));
      await user.click(screen.getByRole('button', { name: 'Weiter' }));
      expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Station abschließen' }));
      expect(screen.queryByText('Station beendet')).not.toBeInTheDocument();
      expect(onCompleteStation).toHaveBeenCalledWith(1000);
    });
  });

  test('embedded has no dialog role and ignores Escape', () => {
    const { onClose } = renderPlayer({ embedded: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Teststation' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Escape closes the player when not embedded', () => {
    const { onClose } = renderPlayer();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('controlled index shows the given module and reports changes', async () => {
    const user = userEvent.setup();
    const third: StationModule<string> = { id: 'm-3', type: 'story', title_de: 'Dritter Teil', title_en: null, style: 'text', text_de: 'Dritter Text', text_en: null, image: null, quote_source: null };
    const onIndexChange = vi.fn();
    renderPlayer({ station: { ...station, modules: [...station.modules, third] }, activeIndex: 1, onIndexChange });

    expect(screen.getByText('Noch ein Text')).toBeInTheDocument();
    expect(screen.getByText(/Teil 2 von 3/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(onIndexChange).toHaveBeenCalledWith(2);
    // gesteuert: ohne neuen activeIndex bleibt die Anzeige stehen
    expect(screen.getByText(/Teil 2 von 3/)).toBeInTheDocument();
  });

  test('unknown module type falls back to a note with a continue button', async () => {
    const user = userEvent.setup();
    const unknown = { id: 'm-x', type: 'does_not_exist' } as unknown as StationModule<string>;
    renderPlayer({ station: { ...station, modules: [unknown, station.modules[1]] } });

    expect(screen.getByText('Dieser Teil kann gerade nicht angezeigt werden.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(await screen.findByText('Noch ein Text')).toBeInTheDocument();
  });
});
