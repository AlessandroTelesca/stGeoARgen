/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RewardDialog } from '../../src/components/RewardDialog';
import { RewardsView } from '../../src/components/RewardsView';

describe('RewardDialog', () => {
  const renderDialog = () => {
    const onClose = vi.fn();
    const onSelectReward = vi.fn();
    render(<RewardDialog onClose={onClose} onSelectReward={onSelectReward} />);
    return { onClose, onSelectReward };
  };

  test('enables confirm after selecting a voucher', async () => {
    const user = userEvent.setup();
    const { onSelectReward } = renderDialog();

    const confirmButton = screen.getByRole('button', { name: /gutschein einlösen/i });
    expect(confirmButton).toBeDisabled();

    await user.click(screen.getByText('Lokalität 2'));
    expect(confirmButton).toBeEnabled();

    await user.click(confirmButton);
    expect(onSelectReward).toHaveBeenCalledWith('locality2');
  });

  test('closes via later button', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDialog();

    await user.click(screen.getByRole('button', { name: /später/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('RewardsView', () => {
  const defaultProps = {
    totalPoints: 120,
    onBack: vi.fn(),
  };

  test('shows unlocked count and enables only unlocked vouchers', () => {
    render(<RewardsView {...defaultProps} />);

    expect(screen.getByText(/2 von 6 Gutscheinen freigeschaltet/i)).toBeInTheDocument();

    const unlockedButtons = screen.getAllByRole('button', { name: /gutschein einlösen/i });
    expect(unlockedButtons).toHaveLength(2);
    unlockedButtons.forEach((btn) => expect(btn).toBeEnabled());

    const lockedButton = screen.getByRole('button', { name: /150 Punkte nötig/i });
    expect(lockedButton).toBeDisabled();
  });

  test('back button triggers callback', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<RewardsView {...defaultProps} onBack={onBack} />);

    await user.click(screen.getByRole('button', { name: /zurück/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
