// Bug reports and feedback (bug_reports_setup.sql and the bug-report-email
// Edge Function in the app repo; README: Bug reports).
//
// Sending one is three steps:
//   1. upload any screenshots into the private bucket, under
//      `<user_id>/<report_id>/`;
//   2. submit_bug_report() saves the row and adds the server's snapshot of
//      the account (role, sessions, check-in, notifications…);
//   3. bug-report-email emails the copy (if asked) and the team.
// Step 3 failing doesn't lose the report; the person is told the email didn't go.
import { supabase } from '../lib/supabase';
import { collectClientContext } from '../lib/diagnostics';

const BUCKET = 'bug_report_screenshots';

export type ReportKind = 'bug' | 'feedback';

export const MAX_SCREENSHOTS = 5;
export const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
export const SCREENSHOT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'];
export const MAX_DESCRIPTION = 5000;
export const MAX_NAME = 120;

export interface ReportInput {
  kind: ReportKind;
  name: string;
  description: string;
  screenshots: File[];
  emailCopy: boolean;
}

export interface SubmitResult {
  ticketNo: number;
  /** null when no email was asked for and no team address is set. */
  emailed: boolean | null;
}

/** The server's refusals, in words. */
const REFUSALS: Record<string, string> = {
  not_signed_in: 'Please sign in again, then send the report.',
  name_required: 'Please add your name.',
  description_required: 'Please describe the bug or your feedback.',
  too_long: 'That description is too long. Please shorten it.',
  too_many_reports: "You've sent a lot of reports in the last hour. Please try again later.",
};

export function reportErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  const code = Object.keys(REFUSALS).find((k) => text.includes(k));
  return code ? REFUSALS[code] : "We couldn't send your report. Please try again.";
}

/** Returns a reason the file can't be attached, or null. */
export function screenshotProblem(file: File): string | null {
  if (!SCREENSHOT_TYPES.includes(file.type)) return `${file.name || 'That file'} isn't an image.`;
  if (file.size > MAX_SCREENSHOT_BYTES) return `${file.name || 'That image'} is over 10 MB.`;
  return null;
}

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'image/gif': 'gif',
};

function newId(): string {
  return crypto.randomUUID();
}

export async function submitReport(input: ReportInput): Promise<SubmitResult> {
  if (!supabase) throw new Error('Reports need the Summit database.');
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) throw new Error('not_signed_in');

  const id = newId();
  const paths: string[] = [];
  const store = supabase.storage.from(BUCKET);
  for (const [i, file] of input.screenshots.slice(0, MAX_SCREENSHOTS).entries()) {
    const problem = screenshotProblem(file);
    if (problem) throw new Error(problem);
    const path = `${userId}/${id}/${i + 1}.${EXTENSION[file.type] ?? 'png'}`;
    const { error } = await store.upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Couldn't upload ${file.name || 'a screenshot'}.`);
    paths.push(path);
  }

  const { data, error } = await supabase.rpc('submit_bug_report', {
    p_id: id,
    p_kind: input.kind,
    p_name: input.name.trim(),
    p_description: input.description.trim(),
    p_screenshots: paths,
    p_client: collectClientContext(),
    p_email_copy: input.emailCopy,
  });
  if (error) {
    if (paths.length) await store.remove(paths).catch(() => undefined);
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  const ticketNo = Number(row?.ticket_no);

  let emailed: boolean | null = null;
  try {
    const { data: sent, error: sendError } = await supabase.functions.invoke('bug-report-email', { body: { report_id: id } });
    if (sendError) emailed = input.emailCopy ? false : null;
    else if (input.emailCopy) emailed = sent?.sent_copy === true;
  } catch {
    emailed = input.emailCopy ? false : null;
  }
  return { ticketNo, emailed };
}
