import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/components/Georgi', () => ({
  GeorgiAvatar: () => <div data-testid="georgi-avatar" />,
}));

import { Onboarding } from '../../src/components/Onboarding';

const noop = () => {};

describe('Onboarding', () => {
  it('shows first step and skip works', async () => {
    const onSkip = vi.fn();
    render(<Onboarding onComplete={noop} onSkip={onSkip} />);

    expect(screen.getByText('Willkommen in St.Georgen!')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Überspringen'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('advances through steps and completes', async () => {
    const onComplete = vi.fn();
    render(<Onboarding onComplete={onComplete} onSkip={noop} />);

    await userEvent.click(screen.getByText('Weiter'));
    await userEvent.click(screen.getByText('Weiter'));
    await userEvent.click(screen.getByText('Weiter'));
    await userEvent.click(screen.getByText("Los geht's!"));

    expect(onComplete).toHaveBeenCalled();
  });
});
