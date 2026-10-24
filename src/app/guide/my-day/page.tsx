import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'My Day: Tasks, Reminders & Calendar' };

export default function MyDay() {
  return (
    <GuideArticle
      title="My Day: Tasks, Reminders & Calendar"
      summary={
        <p>
          Your personal organiser. Tasks are things to do and check off. Reminders are nudges sent at a set time. Calendar is for appointments with a place and time. All three are private by default — you choose what, if anything, to share.
        </p>
      }
    >
      <GuideSection id="tasks" title="1. Tasks">
        <p>A simple to-do list with priority, due date and, if you like, who it's shared with.</p>
        <Example title="Add a task">
          <ol>
            <li>Open <strong>Tasks</strong> and tap <strong>Add</strong>.</li>
            <li>Type a title, e.g. "Pay electricity bill", and optionally a due date and priority.</li>
            <li>Save. It appears in your list and, if you gave it a due date, on your Calendar.</li>
          </ol>
        </Example>
        <p>
          <strong>Sharing a task:</strong> mark it <em>shared</em> and only contacts you've allowed to "see tasks I mark as shared" can see it (see <G slug="family-care" />). You can also <strong>offer</strong> a task to a household member or a contact who allows it — they can accept or decline it.
        </p>
        <Example title="Splitting chores with your spouse">
          <p>
            Create "Collect dry cleaning" and tap <em>Offer to…</em>, then pick your spouse. They see it under <em>Offered to me</em> and can accept, which moves it onto their own list, or decline.
          </p>
        </Example>
      </GuideSection>

      <GuideSection id="reminders" title="2. Reminders">
        <p>
          Reminders are sent on the channels you choose — in-app, push, SMS or email — and respect your quiet hours, except for urgent alerts. Use them for anything with no fixed "done" state, unlike a task.
        </p>
        <Example title="A reminder that repeats">
          <p>
            "Water the plants", every Monday and Thursday at 7:00 PM. Set the repeat rule, or let LifeSphere suggest one from plain text like "every Mon and Thu at 7pm".
          </p>
        </Example>
      </GuideSection>

      <GuideSection id="calendar" title="3. Calendar">
        <p>For appointments and events with a specific time and place — a doctor's visit, a parent-teacher meeting, a delivery window.</p>
        <Example title="A doctor's appointment">
          <p>
            Add an event, type: Appointment, with a place name like "City Clinic" — avoid putting a home address here, since shared events can be seen by people you've allowed to view your calendar. Set a reminder an hour before.
          </p>
        </Example>
        <p>Events you mark shared are visible to contacts who've allowed "see my shared calendar". Tasks with a due date appear on the calendar automatically.</p>
      </GuideSection>

      <GuideSection id="when" title="4. Which one should I use?">
        <ul>
          <li><strong>Task:</strong> something to do, that you'll tick off — "Renew car insurance".</li>
          <li><strong>Reminder:</strong> a nudge with no checkbox — "Take out the bins", every week.</li>
          <li><strong>Calendar:</strong> something at a fixed time and place you might need to prepare for or travel to.</li>
        </ul>
      </GuideSection>
    </GuideArticle>
  );
}
