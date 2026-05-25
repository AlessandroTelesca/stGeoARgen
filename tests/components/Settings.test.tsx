import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../../src/components/Settings';
import { LanguageProvider } from '../../src/contexts/LanguageContext';

describe('Settings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders settings content', () => {
    render(<Settings onResetProgress={vi.fn()} fullscreenActive={false} fullscreenAvailable={false} isIOS={false} onToggleFullscreen={function (enabled: boolean): void {
      throw new Error('Function not implemented.');
    } } />);
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('Allgemein')).toBeInTheDocument();
  });

  it('toggles notifications and changes language', async () => {
    render(
      <LanguageProvider>
        <Settings onResetProgress={vi.fn()} fullscreenActive={false} fullscreenAvailable={false} isIOS={false} onToggleFullscreen={function (enabled: boolean): void {
          throw new Error('Function not implemented.');
        } } />
      </LanguageProvider>
    );

    const toggle = screen
      .getAllByRole('button')
      .find((btn) => btn.className.includes('w-12') && btn.className.includes('h-6')) as HTMLButtonElement;

    expect(toggle).toBeDefined();
    const beforeClass = toggle.className;
    await userEvent.click(toggle);
    expect(toggle.className).not.toBe(beforeClass);

    // Language is now a <select> dropdown
    const languageSelect = screen.getByRole('combobox');
    expect(languageSelect).toBeInTheDocument();
    await userEvent.selectOptions(languageSelect, 'en');
    expect(languageSelect).toHaveValue('en');
    await userEvent.selectOptions(languageSelect, 'de');
    expect(languageSelect).toHaveValue('de');
  });

  it('confirms and calls reset handler', async () => {
    const onResetProgress = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Settings onResetProgress={onResetProgress} fullscreenActive={false} fullscreenAvailable={false} isIOS={false} onToggleFullscreen={function (enabled: boolean): void {
      throw new Error('Function not implemented.');
    } } />);
    await userEvent.click(screen.getByText('Fortschritt zurücksetzen'));

    expect(window.confirm).toHaveBeenCalled();
    expect(onResetProgress).toHaveBeenCalled();
  });
});
