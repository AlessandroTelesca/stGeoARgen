/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ARNavigationButton } from '../../src/components/ARComponents/ARNavigationButton';
import { ARProfileMenu } from '../../src/components/ARComponents/ARProfileMenu';
import { ARProgressBar } from '../../src/components/ARComponents/ARProgressBar';
import { ARTopBar } from '../../src/components/ARComponents/ARTopBar';

describe('AR components', () => {
  test('ARNavigationButton forwards clicks', async () => {
    const user = userEvent.setup();
    const onNavigateToNextStation = vi.fn();

    render(<ARNavigationButton onNavigateToNextStation={onNavigateToNextStation} />);

    await user.click(screen.getByRole('button'));
    expect(onNavigateToNextStation).toHaveBeenCalledTimes(1);
  });

  test('ARProfileMenu triggers actions and closes', async () => {
    const user = userEvent.setup();
    const onProfileClick = vi.fn();
    const onSettingsClick = vi.fn();
    const onLogoutClick = vi.fn();
    const onClose = vi.fn();

    render(
      <ARProfileMenu
        isOpen
        onClose={onClose}
        onProfileClick={onProfileClick}
        onSettingsClick={onSettingsClick}
        onLogoutClick={onLogoutClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /profil/i }));
    expect(onProfileClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /einstellungen/i }));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /abmelden/i }));
    expect(onLogoutClick).toHaveBeenCalledTimes(1);
  });

  test('ARProgressBar shows progress and stations', () => {
    const { container } = render(
      <ARProgressBar
        progress={{ current: 2, total: 3, points: 50 }}
        stations={['completed', 'current', 'locked']}
      />
    );

    expect(screen.getByText(/station 2\/3/i)).toBeInTheDocument();
    expect(screen.getByText(/50 Punkte/i)).toBeInTheDocument();

    const circles = container.getElementsByClassName('ar-station-circle');
    expect(circles).toHaveLength(3);
  });

  test('ARTopBar exposes home and profile actions', async () => {
    const user = userEvent.setup();
    const onNavigateHome = vi.fn();
    const onProfileClick = vi.fn();

    render(
      <ARTopBar
        onNavigateHome={onNavigateHome}
        onProfileClick={onProfileClick}
        profileMenuOpen={false}
      />
    );

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    const profileButton = screen.getByText('Max').closest('button');
    if (!profileButton) throw new Error('Profile button not found');
    await user.click(profileButton);

    expect(onNavigateHome).toHaveBeenCalledTimes(1);
    expect(onProfileClick).toHaveBeenCalledTimes(1);
  });
});
