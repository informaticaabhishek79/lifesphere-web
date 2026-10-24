export interface GuideLink {
  slug: string;
  title: string;
  summary: string;
}

/** One topic per nav section, in the order people meet them. */
export const GUIDE_TOPICS: GuideLink[] = [
  { slug: 'getting-started', title: 'Getting Started', summary: 'Create an account, choose what LifeSphere is for, and find your way around.' },
  { slug: 'my-day', title: 'My Day: Tasks, Reminders & Calendar', summary: 'Your personal to-do list, reminders on a schedule, and a calendar for appointments.' },
  { slug: 'home', title: 'Home: Households, Lists, Inventory & Budget', summary: 'Share chores and lists with the people you live with, track appliances, and plan a monthly budget.' },
  { slug: 'family-care', title: 'Family Care: Check-ins, Contacts & Help', summary: 'Keep an eye on a parent from a distance, or let your own family look out for you.' },
  { slug: 'community', title: 'Community & Civic Issues', summary: 'Neighbourhood groups, and a record of local problems like broken streetlights or potholes.' },
  { slug: 'help-and-services', title: 'Local Services & Consumer Help', summary: 'Find trusted local help, track service requests, and manage warranties and complaints.' },
  { slug: 'assistants', title: 'Voice Assistant, Agents, Email & Smart Inbox', summary: 'Ask questions out loud, automate document filing, and let an agent reply to email for you.' },
  { slug: 'documents', title: 'Documents & the Smart Inbox', summary: 'Your own folders for files, and a folder that sorts itself.' },
  { slug: 'settings-and-privacy', title: 'Settings, Privacy & Your Data', summary: 'Language, accessibility, notifications, what LifeSphere keeps about you, and how to delete your account.' },
  { slug: 'mobile-and-offline', title: 'Install on Your Phone', summary: 'Add LifeSphere to your home screen so it opens like an app and can send notifications.' },
];

export const guideHref = (slug: string) => `/guide/${slug}`;
