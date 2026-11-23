/// <reference types="vitest" />
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PhonePreview, STATION_PAGE } from '../../src/components/StationAdminPanel/PhonePreview';
import type { ARChromeProps } from '../../src/stationModules/player/contract';
import type { StationModule } from '../../src/stationModules/types';

const chrome: ARChromeProps = {
  username: 'Lena',
  onNavigateHome: vi.fn(),
  onLogin: vi.fn(),
  onLogout: vi.fn(),
  onNavigateProfile: vi.fn(),
  onRegister: vi.fn(),
  completedStations: 1,
  totalStations: 4,
  totalPoints: 20,
};

const station = {
  title: 'Teststation',
  description: 'Kurz',
  longDescription: 'Eine lange Beschreibung',
  coverUrl: null,
  points: 15,
  color: null,
  latitude: 48.1,
  longitude: 8.3,
  hasArModule: false,
};

const modules: StationModule<string>[] = [
  { id: 'm-1', type: 'story', title_de: 'Erster Teil', title_en: null, style: 'text', text_de: 'Hallo Welt', text_en: null, image: null, quote_source: null },
  { id: 'm-2', type: 'story', title_de: 'Zweiter Teil', title_en: null, style: 'text', text_de: 'Noch ein Text', text_en: null, image: null, quote_source: null },
];

function renderPreview(props: Partial<React.ComponentProps<typeof PhonePreview>> = {}) {
  const onSelect = vi.fn();
  const onEdit = vi.fn();
  render(
    <MemoryRouter>
      <PhonePreview
        station={station}
        modules={modules}
        activeIndex={STATION_PAGE}
        onSelect={onSelect}
        onEdit={onEdit}
        lang="de"
        chrome={chrome}
        {...props}
      />
    </MemoryRouter>
  );
  return { onSelect, onEdit };
}

describe('PhonePreview', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('zeigt Titel und Start-Button der Stationsseite', () => {
    renderPreview();
    expect(screen.getByRole('heading', { name: 'Teststation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Station starten/ })).toBeInTheDocument();
  });

  test('Start ruft onSelect(0)', () => {
    const { onSelect } = renderPreview();
    fireEvent.click(screen.getByRole('button', { name: /Station starten/ }));
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  test('fragt in der Vorschau keinen Standort ab', () => {
    const watchPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition, getCurrentPosition: vi.fn(), clearWatch: vi.fn() } });
    renderPreview();
    expect(watchPosition).not.toHaveBeenCalled();
  });

  test('Modus „Bearbeiten“: Klick auf die Fläche ruft onEdit(activeIndex)', () => {
    const { onEdit } = renderPreview({ activeIndex: 1 });
    fireEvent.click(screen.getByRole('radio', { name: 'Bearbeiten' }));
    fireEvent.click(screen.getByRole('button', { name: 'Diesen Teil bearbeiten' }));
    expect(onEdit).toHaveBeenCalledWith(1);
  });

  test('Modus „Ausprobieren“ hat keine Bearbeiten-Fläche', () => {
    renderPreview();
    expect(screen.queryByRole('button', { name: 'Diesen Teil bearbeiten' })).not.toBeInTheDocument();
  });

  test('mit activeIndex 0 wird der Player gezeigt', () => {
    renderPreview({ activeIndex: 0 });
    expect(screen.getByText(/Teil 1 von 2/)).toBeInTheDocument();
  });
});
