import type { Metadata } from 'next';
import { Example, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Install on Your Phone' };

export default function MobileAndOffline() {
  return (
    <GuideArticle
      title="Install on Your Phone"
      summary={
        <p>
          LifeSphere works in any browser, but installing it puts it on your home screen like a regular app: it opens full screen, with its own icon, and on iPhone this is required for notifications to work.
        </p>
      }
    >
      <GuideSection id="install" title="1. Installing">
        <p>Open Settings → Notifications and use the <strong>Install the app</strong> card, or tap the banner that appears on the home page on a phone.</p>
        <Example title="On Android (Chrome)">
          <ol>
            <li>Open LifeSphere in Chrome.</li>
            <li>Tap <strong>Install the app</strong> when prompted, or use Chrome's menu → "Add to Home screen".</li>
            <li>Open it from your home screen from then on.</li>
          </ol>
        </Example>
        <Example title="On iPhone (Safari)">
          <ol>
            <li>Open LifeSphere in Safari.</li>
            <li>Tap the Share icon, then "Add to Home Screen".</li>
            <li>This step is required on iPhone before notifications can work at all.</li>
          </ol>
        </Example>
      </GuideSection>

      <GuideSection id="sharing-in" title="2. Sharing a file straight into your inbox">
        <p>Once installed on Android, you can share a photo or file from another app — like your camera roll — directly to LifeSphere. It lands in the Smart inbox "Not sure" folder, ready to be sorted; see the Documents &amp; Smart Inbox guide.</p>
      </GuideSection>

      <GuideSection id="offline" title="3. When you're offline">
        <p>
          LifeSphere needs an internet connection for your personal data — tasks, check-ins and messages are never cached on your device for privacy. If you lose connection, you'll see a friendly offline page rather than an error; it checks again automatically once you're back online.
        </p>
        <p>
          Public pages that carry no personal data — this guide and the policies — are kept on your device once you've visited them, so they still open without a connection.
        </p>
      </GuideSection>

      <GuideSection id="notifications" title="4. Notifications">
        <p>Allow notifications when asked, so you get reminders, check-in alerts and help requests even when LifeSphere isn't open. Fine-tune which categories reach you, and when, in Settings → Notifications.</p>
      </GuideSection>
    </GuideArticle>
  );
}
