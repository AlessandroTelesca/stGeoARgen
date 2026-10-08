import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../../src/components/Settings';
import { LanguageProvider } from '../../src/contexts/LanguageContext';

describe('Settings', () => {
  it('renders settings content', () => {
    render(<Settings fullscreenActive={false} fullscreenAvailable={false} isIOS={false} onToggleFullscreen={function (enabled: boolean): void {
      throw new Error('Function not implemented.');
    } } />);
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('Allgemein')).toBeInTheDocument();
  });

  it('toggles notifications and changes language', async () => {
    render(
      <LanguageProvider>
        <Settings fullscreenActive={false} fullscreenAvailable={false} isIOS={false} onToggleFullscreen={function (enabled: boolean): void {
          throw new Error('Function not implemented.');
        } } />
      </LanguageProvider>
    );

    const toggle = screen.getAllByRole('switch')[0] as HTMLButtonElement;

    expect(toggle).toBeDefined();
    const before = toggle.getAttribute('aria-checked');
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).not.toBe(before);

    // Language is now a <select> dropdown
    const languageSelect = screen.getByRole('combobox');
    expect(languageSelect).toBeInTheDocument();
    await userEvent.selectOptions(languageSelect, 'en');
    expect(languageSelect).toHaveValue('en');
    await userEvent.selectOptions(languageSelect, 'de');
    expect(languageSelect).toHaveValue('de');
  });
});
