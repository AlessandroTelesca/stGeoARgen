import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Georgi, GeorgiAvatar } from '../../src/components/Georgi';

describe('Georgi', () => {
  it('renders when show is true', () => {
    render(<Georgi message="Hello" show />);
    expect(screen.getByText('Georgi sagt:')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('invokes onClose and hides when close clicked', async () => {
    const onClose = vi.fn();
    render(<Georgi message="Bye" show onClose={onClose} />);
    const closeBtn = screen.getByRole('button');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('applies position classes', () => {
    const { rerender, container } = render(<Georgi message="Pos" show position="bottom-right" />);
    const bubble = container.querySelector('.fixed');
    expect(bubble).toHaveClass('bottom-24');

    rerender(<Georgi message="Pos" show position="top-left" />);
    const bubbleTop = container.querySelector('.fixed');
    expect(bubbleTop).toHaveClass('top-4');
  });
});

describe('GeorgiAvatar', () => {
  it('renders different sizes', () => {
    const { rerender, container } = render(<GeorgiAvatar size="sm" animated={false} />);
    expect(container.firstChild).toHaveClass('w-8');

    rerender(<GeorgiAvatar size="lg" animated={false} />);
    expect(container.firstChild).toHaveClass('w-16');
  });
});
