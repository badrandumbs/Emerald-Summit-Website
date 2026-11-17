import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteAccountDialog from '../DeleteAccountDialog';

const renderDialog = (onDelete = vi.fn().mockResolvedValue(undefined)) => {
  render(<DeleteAccountDialog open onOpenChange={vi.fn()} email="Team@Example.com" onDelete={onDelete} />);
  return onDelete;
};

test('deleting takes a yes, then typing your own email', async () => {
  const user = userEvent.setup();
  const onDelete = renderDialog();
  expect(screen.queryByRole('button', { name: 'Delete account forever' })).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Yes, delete my account' }));
  const final = screen.getByRole('button', { name: 'Delete account forever' });
  expect(final).toBeDisabled();
  await user.type(screen.getByLabelText(/To confirm, type your email/), 'someone@else.com');
  expect(final).toBeDisabled();
  await user.clear(screen.getByLabelText(/To confirm, type your email/));
  await user.type(screen.getByLabelText(/To confirm, type your email/), 'team@example.com');
  expect(final).toBeEnabled();
  await user.click(final);
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('a failed delete shows why and lets them try again', async () => {
  const user = userEvent.setup();
  renderDialog(vi.fn().mockRejectedValue(new Error("Couldn't delete your account. Nothing was changed.")));
  await user.click(screen.getByRole('button', { name: 'Yes, delete my account' }));
  await user.type(screen.getByLabelText(/To confirm, type your email/), 'team@example.com');
  await user.click(screen.getByRole('button', { name: 'Delete account forever' }));
  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't delete your account");
  expect(screen.getByRole('button', { name: 'Delete account forever' })).toBeEnabled();
});
