/// <reference types="vitest" />
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as Api from '../../src/services/api';

// Gutscheine kommen aus dem Shop (DB); der PointConfigProvider lädt sie über diese API-Funktionen
vi.mock('../../src/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof Api>()),
  apiGetPointConfig: async () => Promise.reject(new Error('offline')),
  apiGetAvailableVouchers: async (): Promise<Api.AvailableVouchersResponse> => ({
    success: true,
    vouchers: [{ id: 1, code: null, description: 'Kaffee', partner_name: 'Mustermann Café', points_value: 20 }],
  }),
}));

import { RewardsView } from '../../src/components/RewardsView';
import { PointConfigProvider } from '../../src/contexts/PointConfigContext';

describe('RewardsView', () => {
  const defaultProps = {
    totalPoints: 120,
    onBack: vi.fn(),
  };

  test('shows unlocked count and enables only unlocked vouchers', async () => {
    render(<PointConfigProvider><RewardsView {...defaultProps} /></PointConfigProvider>);

    expect(await screen.findByText(/1 von 1 Gutscheinen freigeschaltet/i)).toBeInTheDocument();

    const unlockedButtons = screen.getAllByRole('button', { name: /gutschein einlösen/i });
    expect(unlockedButtons).toHaveLength(1);
    unlockedButtons.forEach((btn) => expect(btn).toBeEnabled());
  });

  test('locks vouchers when points are insufficient', async () => {
    render(<PointConfigProvider><RewardsView {...defaultProps} totalPoints={10} /></PointConfigProvider>);

    expect(await screen.findByText(/0 von 1 Gutscheinen freigeschaltet/i)).toBeInTheDocument();

    const lockedButton = screen.getByRole('button', { name: /20 Punkte nötig/i });
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
