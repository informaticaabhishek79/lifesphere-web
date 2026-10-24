import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Family Care: Check-ins, Contacts & Help' };

export default function FamilyCare() {
  return (
    <GuideArticle
      title="Family Care: Check-ins, Contacts & Help"
      summary={
        <p>
          LifeSphere's core use case: knowing a parent or relative is OK, without calling every day, and a one-tap way for anyone to ask for help. Every share is opt-in on both sides, and the person being watched stays in control of exactly what they share.
        </p>
      }
    >
      <GuideSection id="trusted-contacts" title="1. Trusted contacts">
        <p>Being connected to someone shares nothing by itself. You choose exactly what each trusted contact can see, through specific permissions, not an all-or-nothing switch.</p>
        <Example title="Inviting your mother">
          <ol>
            <li>Open <strong>Trusted contacts</strong> and invite her by phone number.</li>
            <li>She gets a link by SMS, which only that number can accept.</li>
            <li>Once she accepts, you're connected — but nothing is shared yet. Go to <strong>Sharing</strong> to ask for specific things.</li>
          </ol>
        </Example>
        <p>Removing a contact stops all sharing both ways immediately; they aren't told why.</p>
      </GuideSection>

      <GuideSection id="sharing" title="2. Sharing: what you grant, and what you're given">
        <p>
          Sharing works in both directions, item by item: <em>tasks.view</em>, <em>calendar.view</em>, <em>checkins.view</em>, <em>checkins.alerts</em> (be told if a check-in is missed), <em>help.alerts</em> and <em>help.location</em> (see the location attached to a help request, for 24 hours).
        </p>
        <Example title="A parent allowing her son to see check-ins">
          <p>
            On the Sharing page, she switches on "checkins.view" and "checkins.alerts" for her son, with a short cooling-off period before it takes effect — a safeguard so a grant can't be rushed through. From then on, he sees her daily check-in and is told if she misses one. She can revoke it at any time, without his approval.
          </p>
        </Example>
      </GuideSection>

      <GuideSection id="checkins" title="3. Check-ins">
        <p>A simple "I'm OK" at the times you choose — daily, weekly, or a one-off. If a check-in is missed, it goes through reminded → missed → contacts alerted, but only to contacts who've been allowed "be alerted if I miss a check-in".</p>
        <Example title="A daily check-in at 9 AM">
          <p>
            Your father sets a daily check-in for 9 AM. If he hasn't tapped "I'm OK" by, say, 9:20, he gets a reminder. If he still hasn't by 10:00, the contacts he chose are alerted. When you reach him and confirm he's fine, mark it "followed up" so other contacts see that too.
          </p>
        </Example>
        <p>Medicine reminders work the same way as check-ins, under the family-care section — "I'm OK" never counts as a medicine taken, and a medicine reminder never counts as a check-in.</p>
      </GuideSection>

      <GuideSection id="help" title="4. Get help">
        <p>
          One tap alerts the people you've trusted with help alerts. It is <strong>not</strong> an emergency service — see the <a href="/legal/medical-disclaimer">Medical Disclaimer</a>. In a real emergency, call your country's emergency number, shown on the Get help page.
        </p>
        <Example title="Needing help at home">
          <ol>
            <li>Open <strong>Get help</strong> and choose what kind of help — notify contacts, call someone, or request a local service.</li>
            <li>Optionally share your location — it's visible only to the people alerted, and is erased again after 24 hours.</li>
            <li>Your trusted contacts are notified and can tap "I'm responding" so others know someone's on it.</li>
          </ol>
        </Example>
      </GuideSection>

      <GuideSection id="family-home" title="5. The Family page">
        <p>
          If you look after more than one person, <strong>Family</strong> shows a card for each: today's check-in and medicine status, any open help request, and what they've chosen to share with you — all in one place, so you don't need to open each person's details separately.
        </p>
      </GuideSection>
    </GuideArticle>
  );
}
