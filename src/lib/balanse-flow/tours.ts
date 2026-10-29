import type { BalanseFlowRole } from './mode.ts';

export interface TourStep {
  title: string;
  body: string;
  points?: string[];
  pointsTitle?: string;
  view?: string;
  settingsTab?: string;
  target?: string;
  skipIfMissing?: boolean;
  fill?: boolean;
}

export const FINISH_HINT = 'Tap the ? at the top any time to see this again.';

export function aroundTour(role: BalanseFlowRole): TourStep[] {
  if (role === 'admin') {
    return [
      {
        title: 'Welcome',
        body: 'Here is a quick tour of your part as the Admin. It takes a minute.',
      },
      {
        title: 'Set up first',
        body: 'Do these once so the studio can run.',
        pointsTitle: 'How to do it',
        points: [
          'Open Admin → Policies and tap Save Changes.',
          'Open Admin → Pricing & Services and tap Add offering.',
          'Open Marketing → Amenities and tap Save for website.',
          'Open Community → Disciplines and tap Add Discipline.',
          'Open Admin → Staffing and tap Add Staff.',
          'Open Finance → Payment Channels and tap Add channel.',
          'Open Admin → Subscriptions and tap Add package.',
        ],
        view: '/admin-policies',
        target: '[data-tour="nav-Policies"]',
        skipIfMissing: true,
      },
      {
        title: 'Every day',
        body: 'Open hours, put classes on the calendar, then check payments.',
        pointsTitle: 'How to do it',
        points: [
          'Schedule → Time Blocking → Add Block.',
          'Tap Assign Schedule on a block.',
          'Schedule → Coach Slots → Approve or Reject.',
          'Finance → Payments → Approve Payment.',
        ],
        view: '/admin-schedule',
        target: '[data-tour="nav-Time Blocking"]',
        skipIfMissing: true,
      },
      {
        title: "You're all set",
        body: FINISH_HINT,
        target: '[data-tour="help-menu"]',
        skipIfMissing: true,
      },
    ];
  }

  if (role === 'coach') {
    return [
      {
        title: 'Welcome',
        body: 'Here is a quick tour of your part as the Coach. It takes a minute.',
      },
      {
        title: 'Set up first',
        body: 'Fill your page, then mark when you can teach.',
        pointsTitle: 'How to do it',
        points: [
          'Open Coach Profile and tap Save.',
          'Open Availability, tap Add for today or Edit, then Save.',
        ],
        view: '/staff-profile',
        target: '[data-tour="nav-Coach Profile"], [data-tour="nav-Profile"]',
        skipIfMissing: true,
      },
      {
        title: 'Every day',
        body: 'Ask for a vacant hour or read the classes already assigned to you.',
        pointsTitle: 'How to do it',
        points: [
          'Time Slots → Request → Submit request.',
          'Class Schedule to read the week.',
          'Requests to watch status.',
        ],
        view: '/staff-time-slots',
        target: '[data-tour="nav-Time Slots"]',
        skipIfMissing: true,
      },
      {
        title: "You're all set",
        body: FINISH_HINT,
        target: '[data-tour="help-menu"]',
        skipIfMissing: true,
      },
    ];
  }

  if (role === 'user') {
    return [
      {
        title: 'Welcome',
        body: 'Here is a quick tour of your part as the Student. It takes a minute.',
      },
      {
        title: 'Set up first',
        body: 'Finish your profile so you can book.',
        pointsTitle: 'How to do it',
        points: ['Open Profile, tap Save, then Verify on your phone.'],
        view: '/profile',
        target: '[data-tour="nav-Profile"]',
        skipIfMissing: true,
        fill: true,
      },
      {
        title: 'Every day',
        body: 'Pick a class, pay, then watch My Bookings.',
        pointsTitle: 'How to do it',
        points: [
          'Class Schedules → Enroll Class.',
          'Pay online or Use credit, then Submit for verification.',
          'My Bookings to see Enrolled or Waitlisted.',
        ],
        view: '/class-schedule',
        target: '[data-tour="nav-Class Schedules"]',
        skipIfMissing: true,
      },
      {
        title: "You're all set",
        body: FINISH_HINT,
        target: '[data-tour="help-menu"]',
        skipIfMissing: true,
      },
    ];
  }

  if (role === 'frontdesk') {
    return [
      {
        title: 'Welcome',
        body: 'Here is a quick tour of your part as Front Desk. It takes a minute.',
      },
      {
        title: 'Set up first',
        body: 'You use the studio the Admin already set up. Start on the dashboard.',
        view: '/frontdesk-dashboard',
      },
      {
        title: 'Every day',
        body: 'Help people pay, book, and cancel.',
        pointsTitle: 'How to do it',
        points: [
          'Payments to Approve Payment.',
          'Bookings for walk-in help.',
          'Cancellations to Approve or Reject.',
        ],
        view: '/frontdesk-payments',
        target: '[data-tour="nav-Payments"]',
        skipIfMissing: true,
      },
      {
        title: "You're all set",
        body: FINISH_HINT,
        target: '[data-tour="help-menu"]',
        skipIfMissing: true,
      },
    ];
  }

  return [
    {
      title: 'Welcome',
      body: 'Here is a quick tour of your part as Marketing. It takes a minute.',
    },
    {
      title: 'Set up first',
      body: 'Keep the public site current.',
      pointsTitle: 'How to do it',
      points: [
        'Bulletin → Add Post → Publish.',
        'Gallery → Add Media.',
        'Amenities → Save for website.',
      ],
      view: '/marketing-dashboard',
      target: '[data-tour="nav-Bulletin"]',
      skipIfMissing: true,
    },
    {
      title: 'Every day',
      body: 'Write posts and keep photos fresh. Some posts wait for Approve.',
      view: '/marketing-gallery',
      target: '[data-tour="nav-Gallery"]',
      skipIfMissing: true,
    },
    {
      title: "You're all set",
      body: FINISH_HINT,
      target: '[data-tour="help-menu"]',
      skipIfMissing: true,
    },
  ];
}

export function explainPageTour(pathname: string): TourStep[] {
  const page = pathname.split('?')[0];
  const steps: TourStep[] = [
    {
      title: 'This page',
      body: pageTitle(page),
    },
  ];

  const targets = [
    { target: 'h1', title: 'Page name', body: 'This is the screen you are on.' },
    { target: '[data-tour="help-menu"]', title: 'Help', body: 'Tap ? any time for this guide, a full tour, or How it works.', skipIfMissing: true },
    { target: 'button.action-button, [data-tour^="nav-"]', title: 'Main actions', body: 'Use the buttons and links on this screen. Names match what you see.', skipIfMissing: true },
  ];

  return [...steps, ...targets.map((step) => ({ ...step, skipIfMissing: true }))];
}

function pageTitle(page: string): string {
  if (page.includes('dashboard')) return 'This home screen shows the work waiting for you.';
  if (page.includes('policy')) return 'Write studio rules here, then tap Save Changes.';
  if (page.includes('schedule') || page.includes('classes') || page.includes('time')) {
    return 'This calendar is where hours and classes live.';
  }
  if (page.includes('payment')) return 'Check proofs here. Tap Approve Payment or Reject.';
  if (page.includes('credit')) return 'Credit packs and wallet activity live here.';
  if (page.includes('profile')) return 'Fill your details, then tap Save.';
  if (page.includes('availability')) return 'Mark when you can teach, then tap Save.';
  return 'This screen is part of your daily work. Use the buttons you see.';
}

export function setupTour(role: BalanseFlowRole): TourStep[] {
  return aroundTour(role).filter((step) => step.title === 'Set up first' || step.fill);
}

export const HOW_IT_WORKS = {
  setup: [
    'Admin writes Policies, then Pricing & Services, Amenities, Gallery, Disciplines, Staffing, Payment Channels, and Subscriptions.',
    'Coach signs in, fills Coach Profile, and marks Availability.',
  ],
  flow: [
    { role: 'Admin' as const, youRoles: ['admin'] as BalanseFlowRole[], does: 'Opens hours and assigns classes, or Approves a slot.', tap: 'Time Blocking → Assign Schedule, or Coach Slots → Approve' },
    { role: 'Coach' as const, youRoles: ['coach'] as BalanseFlowRole[], does: 'Asks for a vacant hour or teaches the assigned class.', tap: 'Time Slots → Submit request, or Class Schedule' },
    { role: 'Student' as const, youRoles: ['user'] as BalanseFlowRole[], does: 'Enrolls and pays.', tap: 'Class Schedules → Enroll Class → Pay online or Use credit' },
    { role: 'Front Desk' as const, youRoles: ['frontdesk'] as BalanseFlowRole[], does: 'Checks the payment and helps walk-ins.', tap: 'Payments → Approve Payment' },
    { role: 'Admin' as const, youRoles: ['admin'] as BalanseFlowRole[], does: 'Handles cancels, replacements, and refunds.', tap: 'Coach Cancellations → Approve or Reject' },
  ],
};
