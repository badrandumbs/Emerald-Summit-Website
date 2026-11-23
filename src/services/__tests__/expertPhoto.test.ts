import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const storage = vi.hoisted(() => ({ upload: vi.fn(), list: vi.fn(), remove: vi.fn(), from: vi.fn() }));
const shrink = vi.hoisted(() => vi.fn());

vi.mock('../../lib/shrinkImage', () => ({ shrinkToJpeg: (...a: unknown[]) => shrink(...a) }));
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', is_anonymous: false } } } }) },
    storage: {
      from: (bucket: string) => {
        storage.from(bucket);
        return {
          upload: storage.upload,
          list: storage.list,
          remove: storage.remove,
          getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn/${bucket}/${path}` } }),
        };
      },
    },
  },
  isSupabaseConfigured: true,
}));

import { expertPhotoProblem, uploadExpertPhoto } from '../auth';

const bigPhoto = (type: string, name = 'IMG_0001.jpg') =>
  new File([new Uint8Array(8 * 1024 * 1024)], name, { type });

beforeEach(() => {
  vi.clearAllMocks();
  storage.upload.mockResolvedValue({ error: null });
  storage.list.mockResolvedValue({ data: [], error: null });
});
afterEach(() => vi.restoreAllMocks());

test('a phone photo over 5 MB is shrunk to a JPEG and uploaded', async () => {
  const small = new Blob([new Uint8Array(300 * 1024)], { type: 'image/jpeg' });
  shrink.mockResolvedValue(small);
  const url = await uploadExpertPhoto(bigPhoto('image/jpeg'));
  expect(shrink).toHaveBeenCalledWith(expect.any(File), 1200);
  const [path, body, opts] = storage.upload.mock.calls[0];
  expect(storage.from).toHaveBeenCalledWith('expert_photos');
  expect(path).toMatch(/^u1\/photo-\d+\.jpg$/);
  expect(body).toBe(small);
  expect(opts).toMatchObject({ contentType: 'image/jpeg' });
  expect(url).toBe(`https://cdn/expert_photos/${path}`);
});

test('a HEIC photo is accepted, with or without a type, and goes up as a JPEG', async () => {
  expect(expertPhotoProblem(bigPhoto('image/heic', 'IMG_0002.HEIC'))).toBeNull();
  expect(expertPhotoProblem(bigPhoto('', 'IMG_0002.HEIC'))).toBeNull();
  shrink.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
  await uploadExpertPhoto(bigPhoto('image/heic', 'IMG_0002.HEIC'));
  expect(storage.upload.mock.calls[0][2]).toMatchObject({ contentType: 'image/jpeg' });
});

test("a HEIC photo the browser can't open asks for a JPG, without uploading", async () => {
  shrink.mockResolvedValue(null);
  await expect(uploadExpertPhoto(bigPhoto('image/heic', 'IMG_0002.HEIC'))).rejects.toThrow(/Save it as a JPG or PNG/);
  expect(storage.upload).not.toHaveBeenCalled();
});

test('when shrinking is not possible, a small PNG still goes up as itself', async () => {
  shrink.mockResolvedValue(null);
  const png = new File(['x'], 'me.png', { type: 'image/png' });
  await uploadExpertPhoto(png);
  const [path, body, opts] = storage.upload.mock.calls[0];
  expect(path).toMatch(/\.png$/);
  expect(body).toBe(png);
  expect(opts).toMatchObject({ contentType: 'image/png' });
});

test('a file that is not a photo is turned away', async () => {
  const pdf = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
  expect(expertPhotoProblem(pdf)).toBe('That file is not a photo.');
  await expect(uploadExpertPhoto(pdf)).rejects.toThrow('That file is not a photo.');
});
