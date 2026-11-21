import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnnouncementsPanel from '../AnnouncementsPanel';
import AnnouncementComposer from '../AnnouncementComposer';
import { removeAttachmentFile } from '../../services/announcements';
import type { Announcement } from '../../models/announcements';

const create = vi.fn().mockResolvedValue(undefined);
const edit = vi.fn().mockResolvedValue(undefined);
const auth = vi.hoisted(() => ({
  profile: { id: 'admin-1', role: 'admin' } as Record<string, unknown>,
}));

vi.mock('../../context/AnnouncementsContext', () => ({
  useAnnouncements: () => ({
    announcements: [],
    loading: false,
    error: null,
    canManage: true,
    canPost: true,
    live: true,
    configured: true,
    refresh: vi.fn(),
    create,
    edit,
    remove: vi.fn(),
  }),
}));

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ profile: auth.profile }) }));

vi.mock('../../services/announcements', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/announcements')>();
  return {
    ...actual,
    uploadAttachment: vi.fn(async (file: File) => ({
      id: `att-${file.name}`,
      title: file.name,
      type: file.type.startsWith('image/') ? 'Image' : 'File',
      url: `https://cdn.example.com/${file.name}`,
      mimeType: file.type,
      bytes: file.size,
    })),
    removeAttachmentFile: vi.fn(async () => {}),
  };
});

const announcement: Announcement = {
  id: 'a1',
  title: 'Buses leave at 4',
  body: 'Meet by the gym doors.',
  category: 'Logistics',
  date: 'Jun 29',
  pinned: false,
  author: 'Summit Admin',
  audience: 'Everyone',
  attachments: [
    {
      id: 'att-1',
      title: 'Campus map',
      type: 'PDF',
      url: 'https://cdn.example.com/map.pdf',
      bytes: 430080,
    },
    {
      id: 'att-2',
      title: 'Kickoff clip',
      type: 'Video',
      url: 'https://cdn.example.com/clip.mp4',
    },
  ],
};

describe('AnnouncementsPanel admin controls', () => {
  test('hides every management control from non-admins', () => {
    render(
      <AnnouncementsPanel announcements={[announcement]} canManage={false} />,
    );
    expect(screen.queryByRole('button', { name: /new/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  test('admins can post and delete; no Edit or re-pin on a post they did not write', async () => {
    const onCompose = vi.fn();
    render(
      <AnnouncementsPanel
        announcements={[announcement]}
        canManage
        onCompose={onCompose}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /new/i }));
    expect(onCompose).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /pin/i })).toBeNull();
    // Delete sits behind the post's ⋯ menu.
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(await screen.findByRole('menuitem', { name: /delete for everyone/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /mark as read/i })).toBeNull();
    expect(screen.queryByPlaceholderText(/search/i)).toBeNull();
  });

  test('the author gets Edit in the ⋯ menu', async () => {
    const onEdit = vi.fn();
    render(
      <AnnouncementsPanel
        announcements={[announcement]}
        onEdit={onEdit}
        canEdit={(a) => a.id === 'a1'}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /^edit$/i }));
    expect(onEdit).toHaveBeenCalledWith(announcement);
  });

  test('no Edit for a post canEdit refuses', () => {
    render(
      <AnnouncementsPanel announcements={[announcement]} onEdit={vi.fn()} canEdit={() => false} />,
    );
    // Nothing else is in the menu, so there is no menu at all.
    expect(screen.queryByRole('button', { name: /more options/i })).toBeNull();
  });

  test('an edited post shows a small "edited" label and nothing else', () => {
    const { rerender } = render(<AnnouncementsPanel announcements={[announcement]} />);
    expect(screen.queryByText(/edited/i)).toBeNull();
    rerender(
      <AnnouncementsPanel
        announcements={[{ ...announcement, title: 'Buses leave at 5', editedAt: '2026-11-20T18:00:00Z' }]}
      />,
    );
    expect(screen.getByText(/· edited/)).toBeTruthy();
    expect(screen.getByText('Buses leave at 5')).toBeTruthy();
    expect(screen.queryByText(/new/i)).toBeNull();
  });

  test('plays media inline and lists documents as download rows', () => {
    const { container } = render(
      <AnnouncementsPanel announcements={[announcement]} />,
    );
    expect(container.querySelector('video')).toBeTruthy();

    const pdfRow = screen.getByText('Campus map').closest('a');
    expect(pdfRow?.getAttribute('href')).toBe('https://cdn.example.com/map.pdf');
    expect(screen.getByText(/420 KB/)).toBeTruthy();
  });
});

describe('AnnouncementComposer', () => {
  beforeEach(() => {
    create.mockClear();
    auth.profile = { id: 'admin-1', role: 'admin' };
  });

  test('requires a title and body before posting', async () => {
    render(<AnnouncementComposer open onOpenChange={vi.fn()} />);
    const post = screen.getByRole('button', { name: /^post$/i });
    expect(post).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Subject'), 'Track sign-ups close');
    expect(post).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Message'), 'Friday at noon.');
    expect(post).toBeEnabled();
  });

  test('accepts a dropped file and posts it as an attachment', async () => {
    const onOpenChange = vi.fn();
    render(<AnnouncementComposer open onOpenChange={onOpenChange} />);

    await userEvent.type(screen.getByLabelText('Subject'), 'Photos are up');
    await userEvent.type(screen.getByLabelText('Message'), 'From the kickoff.');

    const file = new File(['binary'], 'kickoff.png', { type: 'image/png' });
    const dropzone = screen.getByText(/drag files here/i).closest('div')!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    await screen.findByText('kickoff.png');

    await userEvent.click(
      screen.getByRole('button', { name: /^post$/i }),
    );

    await waitFor(() => expect(create).toHaveBeenCalled());
    const draft = create.mock.calls[0][0];
    expect(draft.title).toBe('Photos are up');
    expect(draft.attachments).toHaveLength(1);
    expect(draft.attachments[0]).toMatchObject({
      title: 'kickoff.png',
      type: 'Image',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('highlights the dropzone while a file is dragged over it', () => {
    render(<AnnouncementComposer open onOpenChange={vi.fn()} />);
    const dropzone = screen.getByText(/drag files here/i).closest('div')!;

    fireEvent.dragEnter(dropzone);
    expect(screen.getByText(/drop to attach/i)).toBeTruthy();

    fireEvent.dragLeave(dropzone);
    expect(screen.getByText(/drag files here/i)).toBeTruthy();
  });

  test('a scoped volunteer posts to one of their disciplines, never Everyone', async () => {
    auth.profile = { id: 'vol-1', role: 'volunteer', can_post_announcements: true, managed_disciplines: ['biosphere'] };
    render(<AnnouncementComposer open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText('Audience')).toHaveTextContent('BioSphere');
    await userEvent.type(screen.getByLabelText('Subject'), 'Lab coats');
    await userEvent.type(screen.getByLabelText('Message'), 'Bring one.');
    await userEvent.click(screen.getByRole('button', { name: /^post$/i }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ audience: 'BioSphere', disciplineId: 'biosphere' });
  });

  test('editing fills in the post, keeps the audience, and saves only what can change', async () => {
    vi.mocked(removeAttachmentFile).mockClear();
    edit.mockClear();
    const onOpenChange = vi.fn();
    render(<AnnouncementComposer open onOpenChange={onOpenChange} editing={announcement} />);
    expect(screen.getByText('Edit announcement')).toBeTruthy();
    expect(screen.getByLabelText('Subject')).toHaveValue('Buses leave at 4');
    expect(screen.queryByLabelText('Audience')).toBeNull();
    expect(screen.queryByLabelText('Pin to top')).toBeNull();

    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Subject'));
    await userEvent.type(screen.getByLabelText('Subject'), 'Buses leave at 5');
    await userEvent.click(screen.getByRole('button', { name: /remove campus map/i }));
    // A saved file is only deleted once the edit saves.
    expect(removeAttachmentFile).not.toHaveBeenCalled();
    await userEvent.click(save);

    await waitFor(() => expect(edit).toHaveBeenCalled());
    expect(edit.mock.calls[0][0]).toBe('a1');
    expect(edit.mock.calls[0][1]).toEqual({
      title: 'Buses leave at 5',
      body: 'Meet by the gym doors.',
      attachments: [announcement.attachments![1]],
    });
    expect(create).not.toHaveBeenCalled();
    expect(removeAttachmentFile).toHaveBeenCalledWith(announcement.attachments![0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('admins post to Everyone by default', async () => {
    render(<AnnouncementComposer open onOpenChange={vi.fn()} />);
    expect(screen.getByLabelText('Audience')).toHaveTextContent('Everyone');
    expect(screen.queryByText(/add link/i)).toBeNull();
  });
});
