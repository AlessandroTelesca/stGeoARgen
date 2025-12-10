import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../../src/components/ProgressBar';

describe('ProgressBar', () => {
  it('renders progress summary and points', () => {
    render(<ProgressBar current={3} total={6} points={120} />);
    expect(screen.getByText('3/6 Stationen')).toBeInTheDocument();
    expect(screen.getByText('120 Punkte')).toBeInTheDocument();
  });

  it('shows percentage text', () => {
    render(<ProgressBar current={2} total={4} points={80} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
