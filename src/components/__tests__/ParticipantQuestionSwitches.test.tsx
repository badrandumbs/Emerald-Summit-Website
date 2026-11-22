import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog } from '@/components/ui/dialog';

// Radix's Switch measures itself; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const content = vi.hoisted(() => ({ save: vi.fn(), switchesReady: true }));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'admin' } }) }));
vi.mock('../../services/summitContent', () => ({
  deleteSession: vi.fn(),
  hasEighthGradeColumn: () => true,
  hasQuestionSwitchColumns: () => content.switchesReady,
  notifyTimeConflicts: vi.fn(),
  previewTimeConflicts: vi.fn().mockResolvedValue(0),
  saveSessionColumns: content.save,
  toMinutes: (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  },
}));
vi.mock('../../services/organizer', () => ({ fetchSessionRoster: vi.fn().mockResolvedValue([]) }));
vi.mock('../session/SessionPhotosEditor', () => ({ default: () => null }));
vi.mock('../../services/sessionRegistration', () => ({ findTeam: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import SharedSessionForm from '../verse/SharedSessionForm';
import RegistrationForm from '../session/RegistrationForm';
import type { Session } from '../../models/sessions';
import { DEFAULT_QUESTIONS } from '../../models/registration';

const session = {
  id: 's1',
  track: 'techverse',
  title: 'CADathon Workshop',
  time: '10:00 AM',
  start: '10:00',
  end: '11:00',
  duration: '60 min',
  capacity: 30,
  enrolled: 0,
  maxTeamSize: 4,
  questions: [],
  customProjectPrompt: null,
} as unknown as Session;

const editor = (s: Session = session) => render(
  <Dialog open><SharedSessionForm verse="techverse" session={s} onClose={vi.fn()} /></Dialog>,
);

beforeEach(() => {
  vi.clearAllMocks();
  content.switchesReady = true;
  content.save.mockResolvedValue(undefined);
});

describe('track editor switches', () => {
  test('both switches start on and every question shows', () => {
    editor();
    expect(screen.getByRole('switch', { name: 'Participant questions' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Project question' })).toBeChecked();
    expect(screen.getByLabelText('Teams')).toBeInTheDocument();
    expect(screen.getByLabelText('Project question wording')).toHaveValue('What is your project name?');
  });

  test('switching questions off hides them and saves the switch', async () => {
    editor();
    await userEvent.click(screen.getByRole('switch', { name: 'Participant questions' }));
    expect(screen.queryByLabelText('Teams')).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'Project question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add question/ })).not.toBeInTheDocument();
    expect(screen.getByText(/register without answering anything/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(content.save).toHaveBeenCalledWith(
      expect.objectContaining({ ask_participant_questions: false, ask_project_name: true }),
      's1',
    );
  });

  test('switching the project question off keeps its wording for later', async () => {
    editor({ ...session, customProjectPrompt: 'What will you build?' } as Session);
    await userEvent.click(screen.getByRole('switch', { name: 'Project question' }));
    expect(screen.queryByLabelText('Project question wording')).not.toBeInTheDocument();
    expect(screen.getByText(/named after the person who creates it/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(content.save).toHaveBeenCalledWith(
      expect.objectContaining({ ask_participant_questions: true, ask_project_name: false, project_prompt: 'What will you build?' }),
      's1',
    );
  });

  test('a track saved with questions off opens with them off', () => {
    editor({ ...session, askQuestions: false } as Session);
    expect(screen.getByRole('switch', { name: 'Participant questions' })).not.toBeChecked();
    expect(screen.queryByLabelText('Teams')).not.toBeInTheDocument();
  });

  test('before the database update the switches are locked and not saved', async () => {
    content.switchesReady = false;
    editor();
    expect(screen.getByRole('switch', { name: 'Participant questions' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    const saved = content.save.mock.calls[0][0];
    expect(saved).not.toHaveProperty('ask_participant_questions');
    expect(saved).not.toHaveProperty('ask_project_name');
  });
});

describe('registering on a track without the project question', () => {
  const form = (onSubmit = vi.fn()) => {
    render(<RegistrationForm open session={{ ...session, askProjectName: false } as Session} onCancel={vi.fn()} onSubmit={onSubmit} />);
    return onSubmit;
  };

  test('solo needs no project name', async () => {
    const onSubmit = form();
    expect(await screen.findByText(DEFAULT_QUESTIONS.soloOrTeam)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Solo' }));
    expect(screen.queryByText('What is your project name?')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and add' }));
    expect(onSubmit).toHaveBeenCalledWith({ project: { action: 'solo', projectName: '' }, answers: {} });
  });

  test('creating a team needs no project name', async () => {
    const onSubmit = form();
    await userEvent.click(screen.getByRole('radio', { name: 'Team' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Create' }));
    expect(screen.queryByText('What is your project name?')).not.toBeInTheDocument();
    expect(screen.getByText(/You'll get a team code/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm and add' }));
    expect(onSubmit).toHaveBeenCalledWith({ project: { action: 'createTeam', projectName: '' }, answers: {} });
  });
});
