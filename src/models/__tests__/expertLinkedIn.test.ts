import { describe, expect, test } from 'vitest';
import { LINKEDIN_CHOICE, linkedInAnswers, linkedInProblem, normalizeLinkedInUrl } from '../expertLinkedIn';

describe('expert LinkedIn choice', () => {
  test('pasted profile links are written out in full', () => {
    expect(normalizeLinkedInUrl('linkedin.com/in/jane-doe')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(normalizeLinkedInUrl(' https://www.linkedin.com/in/jane-doe/ ')).toBe('https://www.linkedin.com/in/jane-doe');
    expect(normalizeLinkedInUrl('http://linkedin.com/in/jane?trk=x')).toBe('https://www.linkedin.com/in/jane');
  });

  test('anything that is not a LinkedIn profile is refused', () => {
    expect(normalizeLinkedInUrl('')).toBeNull();
    expect(normalizeLinkedInUrl('janedoe')).toBeNull();
    expect(normalizeLinkedInUrl('https://linkedin.com')).toBeNull();
    expect(normalizeLinkedInUrl('https://evil.com/linkedin.com/in/x')).toBeNull();
    expect(normalizeLinkedInUrl('https://notlinkedin.com/in/x')).toBeNull();
    expect(normalizeLinkedInUrl('javascript:alert(1)//linkedin.com/in/x')).toBeNull();
  });

  test('sign-up needs a choice; Edit profile does not', () => {
    expect(linkedInProblem({}, { mustChoose: true })).toBe(LINKEDIN_CHOICE.chooseError);
    expect(linkedInProblem({}, { mustChoose: false })).toBeNull();
    expect(linkedInProblem({ linkedin_visible: 'no' }, { mustChoose: true })).toBeNull();
  });

  test('showing LinkedIn needs a real profile link', () => {
    expect(linkedInProblem({ linkedin_visible: 'yes', linkedin_url: '' }, { mustChoose: true })).toBe(LINKEDIN_CHOICE.urlError);
    expect(linkedInProblem({ linkedin_visible: 'yes', linkedin_url: 'linkedin.com/in/jane' }, { mustChoose: true })).toBeNull();
  });

  test('saves the choice and the full link', () => {
    expect(linkedInAnswers({ linkedin_visible: 'yes', linkedin_url: 'linkedin.com/in/jane' }))
      .toEqual({ linkedin_visible: 'yes', linkedin_url: 'https://www.linkedin.com/in/jane' });
  });
});
