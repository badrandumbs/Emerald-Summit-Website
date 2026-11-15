import { expect, test } from 'vitest';
import { CODE_OF_CONDUCT, GUEST_EXPERT_POLICY, agreementFor, needsCodeOfConduct } from '../codeOfConduct';
import { isEighthGradeParticipant } from '../registration';

test('finished accounts agree to the current version once', () => {
  expect(needsCodeOfConduct({ profile_setup_complete: true, code_of_conduct_version: null })).toBe(true);
  expect(needsCodeOfConduct({ profile_setup_complete: true, code_of_conduct_version: 'old' })).toBe(true);
  expect(needsCodeOfConduct({ profile_setup_complete: true, code_of_conduct_version: CODE_OF_CONDUCT.version })).toBe(false);
  // Before code_of_conduct.sql adds the column, nobody is asked.
  expect(needsCodeOfConduct({ profile_setup_complete: true })).toBe(false);
  // Sign-up asks for it on its own page.
  expect(needsCodeOfConduct({ profile_setup_complete: false, code_of_conduct_version: null })).toBe(false);
});

test('experts agree to the Guest Expert Policy instead', () => {
  expect(agreementFor('expert')).toBe(GUEST_EXPERT_POLICY);
  for (const role of ['participant', 'attendee', 'volunteer', 'admin']) expect(agreementFor(role)).toBe(CODE_OF_CONDUCT);
  expect(needsCodeOfConduct({ role: 'expert', profile_setup_complete: true, code_of_conduct_version: CODE_OF_CONDUCT.version })).toBe(true);
  expect(needsCodeOfConduct({ role: 'expert', profile_setup_complete: true, code_of_conduct_version: GUEST_EXPERT_POLICY.version })).toBe(false);
});

test('only 8th-grade participants get the 8th-grade marks', () => {
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: '8' } })).toBe(true);
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: 'eighth' } })).toBe(true);
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: '9' } })).toBe(false);
  expect(isEighthGradeParticipant({ role: 'attendee', details: { grade: '8' } })).toBe(false);
  expect(isEighthGradeParticipant(null)).toBe(false);
});

test('the texts are the documents, not summaries', () => {
  const all = (a: typeof CODE_OF_CONDUCT) => [
    a.title, ...a.preamble,
    ...a.sections.flatMap((s) => [s.title, ...s.blocks.map((b) => `${b.lead ?? ''} ${b.text}`)]),
    a.mediaChoice?.grant ?? '',
  ].join(' ');
  expect(all(CODE_OF_CONDUCT)).toContain('It is NOT a school/DUSD-sponsored event.');
  expect(all(CODE_OF_CONDUCT)).toContain('the EHS PFSO');
  expect(CODE_OF_CONDUCT.mediaChoice?.grant).toContain('I waive the right to inspect');
  expect(all(GUEST_EXPERT_POLICY)).toContain('CivicVerse tracks may cover civics');
  expect(all(GUEST_EXPERT_POLICY)).toContain('no signature is needed');
  expect(GUEST_EXPERT_POLICY.mediaChoice).toBeUndefined();
});
