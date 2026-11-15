import { expect, test } from 'vitest';
import { CODE_OF_CONDUCT, SPEAKER_POLICY, agreementFor, needsCodeOfConduct } from '../codeOfConduct';
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

test('experts agree to the Speaker Policy instead', () => {
  expect(agreementFor('expert')).toBe(SPEAKER_POLICY);
  for (const role of ['participant', 'attendee', 'volunteer', 'admin']) expect(agreementFor(role)).toBe(CODE_OF_CONDUCT);
  expect(needsCodeOfConduct({ role: 'expert', profile_setup_complete: true, code_of_conduct_version: CODE_OF_CONDUCT.version })).toBe(true);
  expect(needsCodeOfConduct({ role: 'expert', profile_setup_complete: true, code_of_conduct_version: SPEAKER_POLICY.version })).toBe(false);
});

test('only 8th-grade participants get the 8th-grade marks', () => {
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: '8' } })).toBe(true);
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: 'eighth' } })).toBe(true);
  expect(isEighthGradeParticipant({ role: 'participant', details: { grade: '9' } })).toBe(false);
  expect(isEighthGradeParticipant({ role: 'attendee', details: { grade: '8' } })).toBe(false);
  expect(isEighthGradeParticipant(null)).toBe(false);
});
