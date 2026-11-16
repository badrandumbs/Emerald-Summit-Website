// Who did and did not allow photos, from the Code of Conduct's "Media Rights
// and Consent" question (profiles.photo_consent). Admins only, through
// fetch_photo_permissions (photo_permission_list.sql in the app repo).
// Experts are not asked, so they are not listed.
import { supabase } from '../lib/supabase';

export interface PhotoPermission {
  userId: string;
  name: string;
  email: string;
  /** Stored role, e.g. "participant" or "parentSpectator". */
  role: string;
  school: string | null;
  /** true: granted. false: did not grant. null: has not answered yet. */
  granted: boolean | null;
  agreedAt: string | null;
}

export function photoPermissionFrom(row: Record<string, unknown>): PhotoPermission {
  const school = typeof row.school === 'string' && row.school.trim() ? row.school.trim() : null;
  return {
    userId: String(row.user_id),
    name: typeof row.full_name === 'string' ? row.full_name : '',
    email: typeof row.email === 'string' ? row.email : '',
    role: typeof row.role === 'string' ? row.role : '',
    school,
    granted: typeof row.photo_consent === 'boolean' ? row.photo_consent : null,
    agreedAt: typeof row.agreed_at === 'string' ? row.agreed_at : null,
  };
}

export async function fetchPhotoPermissions(): Promise<PhotoPermission[]> {
  if (!supabase) throw new Error('This needs the Summit database.');
  const { data, error } = await supabase.rpc('fetch_photo_permissions');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(photoPermissionFrom);
}
