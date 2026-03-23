import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import emailjs from '@emailjs/browser';
import { ForgotPassword } from '../../src/components/ForgotPassword';
import { requestPasswordReset, resetPasswordWithToken } from '../../src/services/auth';

vi.mock('@emailjs/browser', () => ({
  default: {
    send: vi.fn(),
  },
}));

vi.mock('../../src/services/auth', () => ({
  requestPasswordReset: vi.fn(),
  resetPasswordWithToken: vi.fn(),
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EMAILJS_SERVICE_ID', 'service_test');
    vi.stubEnv('VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET', 'template_test');
    vi.stubEnv('VITE_EMAILJS_PUBLIC_KEY', 'public_test');
    vi.stubEnv('VITE_SUPPORT_EMAIL', 'support@test.local');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    window.history.replaceState({}, '', '/');
  });

  it('requests reset and sends EmailJS message', async () => {
    vi.mocked(requestPasswordReset).mockResolvedValue({
      message: 'ok',
      resetToken: 'reset-token-123',
    });
    vi.mocked(emailjs.send).mockResolvedValue({ status: 200, text: 'OK' } as never);

    render(<ForgotPassword />);

    await userEvent.type(screen.getByLabelText('E-Mail-Adresse'), 'max@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Link zum Zurücksetzen senden' }));

    expect(requestPasswordReset).toHaveBeenCalledWith('max@example.com');
    expect(emailjs.send).toHaveBeenCalledTimes(1);
    expect(emailjs.send).toHaveBeenCalledWith(
      'service_test',
      'template_test',
      expect.objectContaining({
        to_email: 'max@example.com',
        reset_link: expect.stringContaining('/forgot-password?token=reset-token-123'),
      }),
      { publicKey: 'public_test' }
    );
    expect(await screen.findByText('Anfrage gesendet!')).toBeInTheDocument();
  });

  it('resets password when token is provided in URL', async () => {
    window.history.replaceState({}, '', '/forgot-password?token=token-from-mail');
    vi.mocked(resetPasswordWithToken).mockResolvedValue('Passwort erfolgreich geaendert.');

    render(<ForgotPassword />);

    await userEvent.type(screen.getByLabelText('Neues Passwort'), 'newsecret');
    await userEvent.type(screen.getByLabelText('Passwort bestätigen'), 'newsecret');
    await userEvent.click(screen.getByRole('button', { name: 'Passwort aktualisieren' }));

    expect(resetPasswordWithToken).toHaveBeenCalledWith('token-from-mail', 'newsecret');
    expect(await screen.findByText('Passwort aktualisiert!')).toBeInTheDocument();
  });
});
