// User roles for the Emerald Summit web prototype. Mirrors the roles used in
// the separate Emerald Summit Flutter app so the two stay conceptually aligned.
import {
  GraduationCap,
  HeartHandshake,
  Award,
  ShieldCheck,
  Eye,
  Users,
  type LucideIcon,
} from '@/components/icons';

export interface RoleInfo {
  name: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Badge/pill accent color, e.g. for the directory-style role pill. */
  color: string;
}

// Labels and descriptions match the sign-in page (Nov 14, 2026); the app's
// SummitRole labels and blurbs (user_profile.dart) are on its to-do list to match.
export const USER_ROLES: RoleInfo[] = [
  {
    name: 'participant',
    label: 'Participant',
    description: 'Build your schedule and follow your Summit day.',
    icon: GraduationCap, // school_outlined
    color: '#0EA5E9',
  },
  {
    name: 'attendee',
    label: 'Spectator',
    description: 'Attend tracks and stay in the loop. Curious minds of all ages are welcome.',
    icon: Eye,
    color: '#2563EB',
  },
  {
    name: 'ambassador',
    label: 'Ambassador',
    description:
      'Edit activity pages, post announcements, and log volunteer hours.',
    icon: HeartHandshake, // volunteer_activism_outlined
    color: '#F59E0B',
  },
  {
    name: 'admin',
    label: 'Organizer',
    description:
      'Manage the Summit, announcements, and content.',
    icon: ShieldCheck, // admin_panel_settings_outlined
    color: '#0C7A55',
  },
  {
    name: 'volunteer',
    label: 'Volunteer',
    description: 'Parent and student volunteers.',
    icon: Users,
    color: '#E11D48',
  },
  {
    name: 'expert',
    label: 'Expert',
    description: 'Evaluate tracks and join panel discussions to share insights with attendees.',
    icon: Award, // workspace_premium_outlined
    color: '#7C3AED',
  },
];

/**
 * Roles that can sign in to the app. Ambassadors are still coordinated
 * offline; they stay in USER_ROLES so directory listings label those people
 * correctly. Admins sign in because they author announcements in-app.
 */
export const SIGN_IN_ROLES: RoleInfo[] = USER_ROLES.filter(
  (r) => r.name !== 'ambassador',
);

export function roleByName(name: string | undefined): RoleInfo | undefined {
  if (!name) return undefined;
  return USER_ROLES.find((r) => r.name === name);
}

/** The message for a role the sheets or the database refused. */
export function notEligibleMessage(roleName: string): string {
  const label = (roleByName(roleName)?.label ?? roleName).toLowerCase();
  const article = /^[aeiou]/.test(label) ? 'an' : 'a';
  return `You are not eligible to sign up as ${article} ${label}.`;
}

/** Labels for the Allowed Volunteers sheet's subtype column. */
export const VOLUNTEER_SUBTYPE_LABELS: Record<string, string> = {
  eaf_ambassador: 'EAF Ambassador',
  student_volunteer: 'Student volunteer',
  parent_volunteer: 'Parent volunteer',
};

/**
 * The label to show for a signed-in person: a volunteer's sheet subtype
 * (EAF Ambassador, Student volunteer, Parent volunteer) when there is one,
 * otherwise the role's own label.
 */
export function roleLabelFor(
  roleName: string | undefined,
  volunteerSubtype?: string | null,
): string {
  if (roleName === 'volunteer' && volunteerSubtype) {
    const label = VOLUNTEER_SUBTYPE_LABELS[volunteerSubtype];
    if (label) return label;
  }
  return roleByName(roleName)?.label ?? USER_ROLES[0].label;
}

/**
 * The roles people choose between on the "How are you joining the Summit?"
 * page and in the change-role popup, in order. Admins aren't here: they use
 * "Organizer sign in".
 */
const CHOOSER: { name: string; section: 'attending' | 'helping' }[] = [
  { name: 'participant', section: 'attending' },
  { name: 'attendee', section: 'attending' },
  { name: 'expert', section: 'attending' },
  { name: 'volunteer', section: 'helping' },
];

export const CHOOSER_ROLES: { name: string; title: string; description: string; section: 'attending' | 'helping' }[] =
  CHOOSER.map(({ name, section }) => {
    const role = USER_ROLES.find((r) => r.name === name)!;
    return { name, title: role.label, description: role.description, section };
  });
