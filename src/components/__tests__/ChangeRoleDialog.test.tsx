import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ChangeRoleDialog from '../ChangeRoleDialog';

const rc = vi.hoisted(() => ({ eligible: vi.fn(), preview: vi.fn(), change: vi.fn(), refresh: vi.fn() }));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'participant' }, refreshProfile: rc.refresh }),
}));
vi.mock('../../services/roleChange', () => ({
  checkRoleEligible: (role: string) => rc.eligible(role),
  previewRoleChange: (role: string) => rc.preview(role),
  changeRole: (role: string) => rc.change(role),
  describeRoleChange: () => '',
  roleChangeLeadIn: () => '',
  roleChangedPath: (role: string) => `/profile?changed=${role}`,
}));

beforeEach(() => {
  vi.clearAllMocks();
  rc.eligible.mockResolvedValue(undefined);
  rc.preview.mockResolvedValue([]);
  rc.change.mockResolvedValue({ role: 'attendee' });
  rc.refresh.mockResolvedValue(undefined);
});

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<ChangeRoleDialog open onOpenChange={onOpenChange} />} />
        <Route path="/profile" element={<div>Profile questions</div>} />
      </Routes>
    </MemoryRouter>,
  );
  return onOpenChange;
}

test('picks a new role in the popup and confirms it in place, without the sign-in page', async () => {
  // It leaves before the profile reloads, so the page it was on cannot send it
  // to /profile without the new role first.
  rc.refresh.mockReturnValue(new Promise(() => {}));
  const user = userEvent.setup();
  const onOpenChange = renderDialog();
  expect(screen.getByRole('button', { name: /Participant/ })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: /Spectator/ }));
  expect(rc.eligible).toHaveBeenCalledWith('attendee');
  await user.click(await screen.findByRole('button', { name: /Confirm/ }));
  expect(rc.change).toHaveBeenCalledWith('attendee');
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(await screen.findByText('Profile questions')).toBeInTheDocument();
});

test('a refused role says why and goes back to the list', async () => {
  const user = userEvent.setup();
  rc.eligible.mockRejectedValue(new Error("Your email is not on the list of people allowed to be a volunteer. Please email support@ehsacademics.org."));
  renderDialog();
  await user.click(screen.getByRole('button', { name: /Volunteer/ }));
  expect(await screen.findByRole('alert')).toHaveTextContent("Please email support@ehsacademics.org");
  await user.click(screen.getByRole('button', { name: 'Pick another role' }));
  expect(screen.getByRole('button', { name: /Expert/ })).toBeInTheDocument();
  expect(rc.change).not.toHaveBeenCalled();
});
