import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

describe('confirmation accessibility', () => {
  it('isolates background content, traps focus, supports Escape and restores the background', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    const { unmount, container } = render(
      <>
        <button>Background action</button>
        <ConfirmDialog
          title="Confirm action?"
          confirmLabel="Confirm"
          onConfirm={vi.fn()}
          onClose={close}
        >
          <p>Explicit confirmation.</p>
        </ConfirmDialog>
      </>,
    );
    expect(screen.queryByRole('button', { name: 'Background action' })).not.toBeInTheDocument();
    expect(container).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Confirm', exact: true })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close confirmation' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(container).not.toHaveAttribute('inert');
  });
});
