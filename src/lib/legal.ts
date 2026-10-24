/**
 * Company, contact and policy details used by every legal page. Change them here only.
 * Bump POLICY_UPDATED (and the API's policy version) whenever a policy changes in substance.
 */
export const LEGAL = {
  product: 'LifeSphere',
  company: 'Deemona Global Solutions',
  address: 'New Delhi 110075, India',
  city: 'New Delhi',
  grievanceOfficer: {
    name: 'Abhishek',
    designation: 'Grievance Officer',
    phone: '+91 96541 35922',
    phoneHref: 'tel:+919654135922',
    /** Set a monitored address (e.g. grievance@deemona.com) to show it on every page. */
    email: null as string | null,
  },
  /** General support address. Leave null to send people to the grievance officer. */
  supportEmail: null as string | null,
  hours: 'Monday to Saturday, 10:00 to 18:00 IST (except public holidays)',
  emergencyNumber: '112',
  updated: '24 October 2026',
  effective: '24 October 2026',
} as const;

export interface PolicyLink {
  slug: string;
  title: string;
  summary: string;
}

export const POLICIES: PolicyLink[] = [
  { slug: 'terms', title: 'Terms of Service', summary: 'The agreement between you and us for using LifeSphere.' },
  { slug: 'privacy', title: 'Privacy Policy', summary: 'What personal data we collect, why, who processes it, how long we keep it and your rights.' },
  { slug: 'refund-policy', title: 'Refund Policy', summary: 'LifeSphere is free today. How charges and refunds will work if paid plans launch.' },
  { slug: 'medical-disclaimer', title: 'Medical Disclaimer', summary: 'Check-ins, medicine reminders and help requests support care; they are not medical or emergency services.' },
  { slug: 'child-safety', title: 'Child Safety', summary: 'Accounts are for adults only, and how we protect children and act on abuse material.' },
  { slug: 'account-termination', title: 'Account Termination', summary: 'How you can close your account, when we may suspend one, and what happens to your data.' },
  { slug: 'acceptable-use', title: 'Acceptable Use', summary: 'What is and is not allowed in LifeSphere, including community posts and the help button.' },
  { slug: 'grievance', title: 'Grievance Officer', summary: 'How to raise a complaint, the timelines we follow and how to appeal.' },
  { slug: 'contact', title: 'Contact Us', summary: 'How to reach us for support, privacy requests and complaints.' },
];

export const policyHref = (slug: string) => `/legal/${slug}`;
