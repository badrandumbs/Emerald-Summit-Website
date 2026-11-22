import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const submit = vi.hoisted(() => vi.fn());

vi.mock('../../services/bugReports', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../services/bugReports')>();
  return { ...real, submitReport: submit };
});

import ReportDialog from '../ReportDialog';

function open() {
  return render(<ReportDialog open onOpenChange={() => {}} defaultName="Ada Lovelace" email="ada@example.com" />);
}

beforeEach(() => {
  submit.mockReset();
  URL.createObjectURL = vi.fn(() => `blob:${Math.random()}`);
  URL.revokeObjectURL = vi.fn();
});

describe('ReportDialog', () => {
  test('fills in the name, asks for a description, and offers an emailed copy by default', async () => {
    open();
    expect(screen.getByLabelText('Your name')).toHaveValue('Ada Lovelace');
    expect(screen.getByRole('checkbox', { name: 'Email me a copy' })).toHaveAttribute('data-state', 'checked');
    expect(screen.getByText('To ada@example.com, including everything listed above.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Send bug report' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please describe the bug.');
    expect(submit).not.toHaveBeenCalled();
  });

  test('opens as Report a bug by default, or as Send feedback when asked', () => {
    const { unmount } = open();
    expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Bug report/ })).toHaveAttribute('aria-checked', 'true');
    unmount();
    render(<ReportDialog open kind="feedback" onOpenChange={() => {}} defaultName="Ada" email="ada@example.com" />);
    expect(screen.getByRole('heading', { name: 'Send feedback' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Feedback/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Send feedback' })).toBeInTheDocument();
  });

  test('keeps the profile name read-only and follows profile updates', async () => {
    submit.mockResolvedValue({ ticketNo: 13, emailed: false });
    const { rerender } = open();
    const name = screen.getByLabelText('Your name');
    expect(name).toHaveAttribute('readonly');
    await userEvent.type(name, 'Someone else');
    expect(name).toHaveValue('Ada Lovelace');

    rerender(<ReportDialog open onOpenChange={() => {}} defaultName="Grace Hopper" email="ada@example.com" />);
    expect(screen.getByLabelText('Your name')).toHaveValue('Grace Hopper');
    await userEvent.click(screen.getByRole('radio', { name: /Feedback/ }));
    expect(screen.getByLabelText('Your name')).toHaveAttribute('readonly');
    await userEvent.type(screen.getByLabelText('Your feedback'), 'Helpful');
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Grace Hopper' })));
  });

  test('directs a missing profile name to the profile instead of an uneditable field', async () => {
    render(<ReportDialog open onOpenChange={() => {}} defaultName="" email="ada@example.com" />);
    await userEvent.type(screen.getByLabelText('What went wrong?'), 'Broken');
    await userEvent.click(screen.getByRole('button', { name: 'Send bug report' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add your name in your profile before sending a report.');
    expect(submit).not.toHaveBeenCalled();
  });

  test('sends the report with screenshots and shows the ticket number', async () => {
    submit.mockResolvedValue({ ticketNo: 12, emailed: true });
    open();
    await userEvent.click(screen.getByRole('radio', { name: /Feedback/ }));
    expect(screen.getByRole('heading', { name: 'Send feedback' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Your feedback'), 'Love it');
    const shot = new File(['x'], 'a.png', { type: 'image/png' });
    await userEvent.upload(screen.getByTestId('report-file-input'), shot);
    expect(screen.getByAltText('Screenshot 1')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Email me a copy' }));

    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }));
    await waitFor(() => expect(screen.getByText('Your ticket is Feedback #12.')).toBeInTheDocument());
    expect(submit).toHaveBeenCalledWith({ kind: 'feedback', name: 'Ada Lovelace', description: 'Love it', screenshots: [shot], emailCopy: false });
  });

  test('lists what is attached, says what is left out, and who can read it', async () => {
    open();
    await userEvent.click(screen.getByRole('button', { name: /What else is sent/ }));
    expect(screen.getByText(/The tracks on your day/)).toBeInTheDocument();
    expect(screen.getByText(/Not your phone number, student ID, school, grade or emergency contact/)).toBeInTheDocument();
    expect(screen.getByText(/Only Summit app developers can read reports/)).toBeInTheDocument();
  });

  test("shows the server's refusal in words", async () => {
    submit.mockRejectedValue({ message: 'too_many_reports' });
    open();
    await userEvent.type(screen.getByLabelText('What went wrong?'), 'Again');
    await userEvent.click(screen.getByRole('button', { name: 'Send bug report' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/last hour/));
  });
});
