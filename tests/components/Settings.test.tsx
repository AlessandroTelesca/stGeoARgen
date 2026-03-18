import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Settings } from '../../src/components/Settings';
import i18n from '../../src/i18n/languageChanger';

describe('Settings', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders settings content', () => {
    render(<Settings onResetProgress={vi.fn()} />);
    expect(screen.getByText(i18n.t('settings.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('settings.general'))).toBeInTheDocument();
  });

  it('toggles notifications and changes language', async () => {
    render(<Settings onResetProgress={vi.fn()} />);

    const toggle = screen
      .getAllByRole('button')
      .find((btn) => btn.className.includes('w-12') && btn.className.includes('h-6')) as HTMLButtonElement;

    expect(toggle).toBeDefined();
    const beforeClass = toggle.className;
    await userEvent.click(toggle);
    expect(toggle.className).not.toBe(beforeClass);

    const select = screen.getByDisplayValue(i18n.t('settings.german'));
    await userEvent.selectOptions(select, 'en');
    expect(screen.getByDisplayValue(i18n.t('settings.english'))).toBeInTheDocument();
  });

  it('confirms and calls reset handler', async () => {
    const onResetProgress = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<Settings onResetProgress={onResetProgress} />);
    await userEvent.click(screen.getByText(i18n.t('settings.resetProgress')));

    expect(window.confirm).toHaveBeenCalled();
    expect(onResetProgress).toHaveBeenCalled();
  });
});
