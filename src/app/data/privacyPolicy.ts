import type { TermsBlock } from './termsAndConditions';

/** ISO version stored on the member profile and used in the PDF filename. */
export const PRIVACY_VERSION = '2026-01-15';
export const PRIVACY_LAST_UPDATED = 'January 15, 2026';
export const PRIVACY_DOCUMENT_TITLE = 'Balansé Privacy Policy';
/** Set true only when processing purposes change materially. */
export const PRIVACY_REQUIRES_REACCEPT = false;

export const PRIVACY_BLOCKS: TermsBlock[] = [
  {
    type: 'heading',
    text: '1. Who we are',
  },
  {
    type: 'paragraph',
    text: 'Balansé Wellness Hub (“BALANSÉ”, “we”, “us”) operates our studio and member portal. This policy explains how we collect, use, and store information when you create an account, book classes, or complete required studio documents.',
  },
  {
    type: 'heading',
    text: '2. Information we collect',
  },
  {
    type: 'bullets',
    items: [
      {
        label: 'Account & profile:',
        text: 'name, email, phone, birthday, sex, nationality, address (province, city, barangay), emergency contact, height, and weight.',
      },
      {
        label: 'Health declaration:',
        text: 'your questionnaire answers, extra details, and acknowledgment, used so coaches can keep sessions safe.',
      },
      {
        label: 'Bookings & payments:',
        text: 'class enrollments, attendance, and payment history needed to run your membership.',
      },
      {
        label: 'Signed documents:',
        text: 'a PDF copy of the Terms, Privacy Policy, and Health Declaration you accepted, stored as a legal snapshot.',
      },
    ],
  },
  {
    type: 'heading',
    text: '3. How we use your information',
  },
  {
    type: 'numbered',
    items: [
      'To create and manage your member account and profile.',
      'To book classes, communicate schedule changes, and process payments.',
      'To share relevant health information with assigned coaches for safety during training.',
      'To keep an immutable record of documents you signed.',
      'To improve studio operations and respond to support requests.',
    ],
  },
  {
    type: 'heading',
    text: '4. Who can see your information',
  },
  {
    type: 'paragraph',
    text: 'Your profile and documents are visible to you and to authorized BALANSÉ staff (admins, front desk, and assigned coaches as needed for class safety). We do not sell your personal information.',
  },
  {
    type: 'heading',
    text: '5. Retention',
  },
  {
    type: 'paragraph',
    text: 'We keep account, booking, and signed-document records while your membership is active and as needed for legal, safety, and accounting purposes after it ends. You may request access or correction of your profile through the member portal or studio staff.',
  },
  {
    type: 'heading',
    text: '6. Your choices',
  },
  {
    type: 'paragraph',
    text: 'You can update profile details and your health declaration in the member portal. Media photos during classes remain voluntary — tell staff before a session if you do not want to be included. For questions about this policy, contact studio staff.',
  },
  {
    type: 'paragraph',
    text: 'I have read this Privacy Policy and understand how BALANSÉ collects and uses my information.',
  },
];
