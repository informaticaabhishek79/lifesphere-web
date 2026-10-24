import type { Metadata } from 'next';
import { Example, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Settings, Privacy & Your Data' };

export default function SettingsAndPrivacy() {
  return (
    <GuideArticle
      title="Settings, Privacy & Your Data"
      summary={
        <p>
          Settings controls how LifeSphere looks, behaves and notifies you. Privacy &amp; data is where you see what LifeSphere keeps about you and exercise your rights over it — export, correct, withdraw consent or delete your account.
        </p>
      }
    >
      <GuideSection id="profile" title="1. Profile">
        <p>Your display name, an optional photo and bio, and an approximate locality — used only to find nearby groups and services, never shown as an address. Turn on "discoverable" only if you want to appear in public group member lists.</p>
      </GuideSection>

      <GuideSection id="accessibility" title="2. Accessibility">
        <p>Senior mode gives bigger text, fewer items per screen and simpler confirmations. You can also turn on extra screen-reader hints and "Are you sure?" confirmations before anything important.</p>
        <Example title="Setting up LifeSphere for a parent">
          <p>Turn on Senior mode in her Settings, and increase the text size slider. Fewer buttons, bigger text, and a confirmation before anything is deleted or changed.</p>
        </Example>
      </GuideSection>

      <GuideSection id="notifications" title="3. Notifications">
        <p>Choose how each kind of update reaches you — in-app, push, SMS or email — and set quiet hours. Non-urgent notifications wait until quiet hours end; help alerts can still come through. Lock-screen detail controls how much a push notification shows before you unlock your phone.</p>
      </GuideSection>

      <GuideSection id="features" title="4. Features">
        <p>
          Switch off any part of LifeSphere you don't use — community, consumer help, agents, household, whatever doesn't apply to you. Your data stays in place until you delete it; turning a feature off just hides it from the menu.
        </p>
      </GuideSection>

      <GuideSection id="privacy-data" title="5. Privacy & data">
        <p>From this page you can:</p>
        <ul>
          <li><strong>Download my data</strong> — a file with everything linked to your account; you're notified when it's ready.</li>
          <li><strong>Correction</strong> — tell LifeSphere what's wrong and what it should be.</li>
          <li><strong>Grievance</strong> — raise a complaint; the Grievance Officer responds within the legal time limit.</li>
          <li><strong>Delete account</strong> — deactivates your account now and permanently deletes it after a grace period (signing in during that time cancels the deletion).</li>
        </ul>
        <p>This page also lists every consent you've given, each with one purpose — withdrawing it takes effect immediately — and links to the full set of policies.</p>
      </GuideSection>

      <GuideSection id="security" title="6. Security">
        <p>Turn on two-step verification for an extra code from an authenticator app on sensitive actions. Review your sign-in sessions and recovery codes here too, and see your activity log — sign-ins, sharing changes and other important events on your account.</p>
      </GuideSection>
    </GuideArticle>
  );
}
