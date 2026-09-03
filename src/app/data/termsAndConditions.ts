export const TC_LAST_UPDATED = 'January 15, 2026';
export const TC_DOCUMENT_TITLE = 'Balansé Terms & Conditions';

export type TermsBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'labelValue'; label: string; value: string }
  | { type: 'bullets'; items: { label: string; text: string }[] }
  | { type: 'numbered'; items: string[] };

export const TERMS_BLOCKS: TermsBlock[] = [
  {
    type: 'heading',
    text: '1. Full Payment Required',
  },
  {
    type: 'paragraph',
    text: 'Registration must be paid in full to secure your spot.',
  },
  {
    type: 'heading',
    text: 'Payment Details',
  },
  { type: 'labelValue', label: 'Bank Name', value: 'Maya Bank, Inc.' },
  { type: 'labelValue', label: 'Account Name', value: 'Balanse Wellness Hub' },
  { type: 'labelValue', label: 'Account Number', value: '703830942511' },
  {
    type: 'heading',
    text: '2. Booking Policy',
  },
  {
    type: 'paragraph',
    text: 'Advance Booking: To guarantee your spot and prevent your request from being declined, please book and confirm your class at least 12 hours in advance. This gives our coaches adequate time to prepare for an optimal session.',
  },
  {
    type: 'heading',
    text: '3. Rescheduling & Cancellations',
  },
  {
    type: 'bullets',
    items: [
      {
        label: 'Rescheduling (24+ Hours Notice):',
        text: 'If you need to change your session time, you may do so without penalty up to 24 hours before the class. You will have one week from the original date to complete your rescheduled session.',
      },
      {
        label: 'Cancellation Policy:',
        text: 'We do not offer refunds or cancellations. However, we are happy to help you find a new time slot, provided the request is made outside the 24-hour window.',
      },
      {
        label: 'Late Changes (Less than 24 Hours):',
        text: 'Requests to cancel or reschedule within 24 hours of the session will result in a forfeited payment. A new fee will be required to book a future session.',
      },
    ],
  },
  {
    type: 'heading',
    text: '4. Attendance & Late Policy',
  },
  {
    type: 'bullets',
    items: [
      {
        label: '15-Minute Rule:',
        text: 'To maintain the quality of our sessions and minimize disruptions, clients arriving more than 15 minutes late will be marked absent and will forfeit their slot for that session.',
      },
      {
        label: 'Emergencies:',
        text: 'In the event of unforeseen circumstances, please notify the admin or the front desk via chat prior to the start of the class.',
      },
    ],
  },
  {
    type: 'paragraph',
    text: 'These guidelines are designed to ensure fairness, respect the dedicated time of our coaches, and provide the best experience for all clients. Please note that all policies are subject to change.',
  },
  {
    type: 'heading',
    text: 'Waiver & Release Form | Media Release & Consent Statement',
  },
  {
    type: 'numbered',
    items: [
      'I must consult a physician before participating in this or any fitness program. I affirm that I have no medical conditions that would restrict me from participating in any of the fitness services provided by Balansé Wellness.',
      'I agree to hold Balansé Wellness and, if applicable, its owners, trainers, and representatives harmless from any damage, whether tangible or intangible, that may occur to me while participating in the fitness services.',
      'I understand that any diet recommendations provided by Balansé Wellness are not a guarantee of results. I am solely responsible for maintaining a diet and fitness regime appropriate for my level of health and stamina. I acknowledge that any positive or negative results are the effects of my personal choices and efforts.',
      "I understand that participation in Balansé Wellness' fitness services does not replace medical care. Should I experience any medical issues, I will contact my physician immediately.",
    ],
  },
  {
    type: 'paragraph',
    text: 'If any portion of this waiver is deemed invalid by a court of competent jurisdiction, the remainder of this waiver shall remain in full force and effect, and the invalid provision(s) shall be severed from this waiver.',
  },
  {
    type: 'heading',
    text: 'Media Release and Consent Statement',
  },
  {
    type: 'paragraph',
    text: 'At Balansé Wellness Hub, we value your privacy and comfort. From time to time, our team may take photos and videos during classes, events, or sessions for documentation, social media posting, and marketing purposes.',
  },
  {
    type: 'paragraph',
    text: 'By giving your consent, you allow Balanse Wellness Hub, including its coaches and staff, to capture and use your image, voice, and likeness in photos or videos that may appear on our official social media pages, website, and promotional materials.',
  },
  {
    type: 'paragraph',
    text: 'Your participation is completely voluntary. If you prefer not to be included, please inform our staff or coach before the session begins, and we will make sure to honor your request.',
  },
  {
    type: 'paragraph',
    text: 'We appreciate your support in helping us share the Balansé experience with our community.',
  },
  {
    type: 'paragraph',
    text: 'I have read the above Waiver & Release form and Media Release & Consent Statement, fully understand and agree to its contents.',
  },
];
