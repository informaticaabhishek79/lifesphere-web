import Link from 'next/link';
import type { Metadata } from 'next';
import { GrievanceCard, P, Policy, Section } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function Privacy() {
  return (
    <Policy
      title="Privacy Policy"
      summary={
        <ul className="list-disc space-y-1 ps-5">
          <li>We collect only what LifeSphere needs to work, and most of it is what you choose to enter.</li>
          <li>You decide who sees your information. Family members and contacts see only what you grant them, and you can revoke access at any time.</li>
          <li>We never sell your data, never show ads, never let AI providers train on your data, and never ask for bank details.</li>
          <li>You can download your data, correct it, withdraw consent or delete your account from <strong>Privacy &amp; data</strong> in the app.</li>
        </ul>
      }
    >
      <Section id="who" title="1. Who is responsible for your data">
        <p>
          <strong>{LEGAL.company}</strong>, {LEGAL.address}, is the Data Fiduciary for personal data processed through {LEGAL.product}, under the Digital Personal Data Protection Act, 2023 (“DPDP Act”) and the rules made under it. This policy also follows the Information Technology Act, 2000 and the rules on reasonable security practices.
        </p>
        <p>
          Questions and complaints go to our Grievance Officer (details at the end of this policy). For a field-by-field list of everything we hold, see the <Link href="/privacy-notice">privacy notice and data inventory</Link>.
        </p>
      </Section>

      <Section id="collect" title="2. What we collect">
        <h3>Information you give us</h3>
        <ul>
          <li><strong>Account:</strong> mobile number and/or email address, display name, and your confirmation that you are 18 or older. We never collect your date of birth.</li>
          <li><strong>Profile (optional):</strong> photo, short bio and an approximate locality used to find neighbourhood groups. We never show your locality as an address.</li>
          <li><strong>Organiser and home:</strong> tasks, reminders, calendar events, notes, lists, inventory, chores and an optional budget.</li>
          <li><strong>Family care:</strong> trusted contacts, the access you grant them, check-in and medicine-reminder schedules and their events, and — only when you press Get help and choose to share it — your location at that moment.</li>
          <li><strong>Documents and Smart inbox:</strong> files you upload or place in your inbox folder, and what was recognised in them.</li>
          <li><strong>Community and services:</strong> posts, comments, reactions and reports; service requests and visit notes; purchases, warranties and consumer-complaint cases you track.</li>
          <li><strong>Assistants:</strong> questions you ask the assistant, voice assistant or agents. These are not stored unless you turn on history.</li>
          <li><strong>Connected mailbox (optional):</strong> if you connect Gmail or Outlook, an encrypted access token. Emails are read live and are not stored.</li>
        </ul>
        <h3>Information created when you use LifeSphere</h3>
        <ul>
          <li><strong>Security records:</strong> sign-in sessions, device names, hashed IP addresses (we do not store your IP address in readable form), push-notification tokens and an activity log of sensitive actions, such as access changes.</li>
          <li><strong>Consents:</strong> what you agreed to, which version, and when.</li>
        </ul>
        <h3>From others</h3>
        <ul>
          <li>If you sign in with Google, Google confirms your identity and gives us your name and verified email address — nothing else.</li>
          <li>Other users may add you as a contact or invite you to a household. They see your details only after you accept.</li>
        </ul>
      </Section>

      <Section id="why" title="3. Why we use it">
        <ul>
          <li>To provide the features you use: storing your information, sharing it with the people you choose, sending reminders, check-ins and alerts.</li>
          <li>To keep accounts secure: sign-in codes, two-step verification, detecting misuse and abuse.</li>
          <li>To run community spaces safely: acting on reports and keeping evidence of reported content for a limited time.</li>
          <li>To answer your requests and complaints, and to meet legal obligations.</li>
        </ul>
        <p>
          We process your data on the basis of the <strong>consent</strong> you give when you create an account and turn on features, and, where the DPDP Act allows, for <strong>legitimate uses</strong> such as information you voluntarily provide for a purpose, responding to medical emergencies, and complying with law. You can withdraw consent at any time; this does not affect processing that already happened.
        </p>
        <p>
          We do <strong>not</strong> sell personal data, use it for advertising, build advertising profiles, or use your content to train AI models.
        </p>
      </Section>

      <Section id="share" title="4. Who can see your data">
        <h3>People you choose</h3>
        <p>
          Household members see household items. Trusted contacts see only what you grant — for example, your check-ins or the location attached to a help request — and you can revoke any grant without their approval. Community posts are seen by members of that group.
        </p>
        <h3>Service providers that process data for us</h3>
        <p>We use these companies only to run LifeSphere, under contracts that limit them to our instructions:</p>
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Provider</th>
              <th>What they receive</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Hosting the app</td>
              <td>Cloud hosting providers (currently Render in Singapore, moving to MilesWeb in India)</td>
              <td>All service data, to run the app</td>
            </tr>
            <tr>
              <td>Database</td>
              <td>Neon (managed PostgreSQL)</td>
              <td>Stored account and content data</td>
            </tr>
            <tr>
              <td>File storage</td>
              <td>Cloudflare R2</td>
              <td>Uploaded files, encrypted at rest</td>
            </tr>
            <tr>
              <td>Email delivery</td>
              <td>Resend</td>
              <td>Your email address and the message</td>
            </tr>
            <tr>
              <td>AI features (only when you use them)</td>
              <td>Anthropic</td>
              <td>The text or file needed for that request only; not used for training</td>
            </tr>
            <tr>
              <td>Google sign-in, Gmail (optional)</td>
              <td>Google</td>
              <td>Confirms your identity; gives access to your mailbox if you connect it</td>
            </tr>
            <tr>
              <td>Outlook (optional)</td>
              <td>Microsoft</td>
              <td>Access to your mailbox if you connect it</td>
            </tr>
            <tr>
              <td>Browser notifications</td>
              <td>Your browser’s push service (e.g. Google, Apple, Mozilla)</td>
              <td>A device token and the notification</td>
            </tr>
            <tr>
              <td>SMS or WhatsApp messages (when enabled)</td>
              <td>Our messaging provider (e.g. Twilio or Meta)</td>
              <td>Your number and the message. Texts never name a medicine</td>
            </tr>
          </tbody>
        </table>
        <p>
          Voice input uses your browser’s own speech service (for example, Google in Chrome), under that browser’s terms.
        </p>
        <h3>Authorities</h3>
        <p>
          We disclose data to government agencies only when Indian law requires it, such as a valid order from a court or an authorised agency. Where the law allows, we will tell you.
        </p>
        <h3>Service providers you contact</h3>
        <p>When you send a request to a local service provider, they receive the details you include in it.</p>
      </Section>

      <Section id="transfers" title="5. Where your data is stored">
        <p>
          Your data may be stored and processed in India and in other countries where our providers operate, such as Singapore and the United States. The DPDP Act permits this, except to countries the Government of India restricts. We use providers that protect data with encryption and contractual safeguards.
        </p>
      </Section>

      <Section id="retention" title="6. How long we keep it">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Kept for</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Account, profile, organiser, home and documents</td><td>Until you delete them or your account. Deleted items stay in a bin for 30 days, then are purged</td></tr>
            <tr><td>Check-in and medicine-reminder events</td><td>90 days</td></tr>
            <tr><td>Location attached to a help request</td><td>24 hours</td></tr>
            <tr><td>Assistant history (only if you turn it on)</td><td>30 days</td></tr>
            <tr><td>Agent activity log</td><td>90 days</td></tr>
            <tr><td>Consumer-case attachments</td><td>30 days unless you choose to keep them</td></tr>
            <tr><td>Snapshots of reported community content</td><td>Up to 180 days, as evidence</td></tr>
            <tr><td>Security and audit logs</td><td>1 year, as Indian law requires</td></tr>
            <tr><td>Backups</td><td>Overwritten on a rolling basis, within 30 days</td></tr>
          </tbody>
        </table>
        <p>We may keep data longer only where a law requires it or for an ongoing legal claim.</p>
      </Section>

      <Section id="rights" title="7. Your rights">
        <p>Under the DPDP Act you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> get a summary of your data and who it was shared with. Use <em>Download my data</em>.</li>
          <li><strong>Correction and erasure:</strong> correct, complete or update your data, or have it erased. Most data can be edited directly; use <em>Correction</em> or <em>Delete account</em> for the rest.</li>
          <li><strong>Withdraw consent</strong> for optional processing at any time, under <em>Your choices</em>.</li>
          <li><strong>Grievance redressal:</strong> complain to our Grievance Officer.</li>
          <li><strong>Nominate</strong> a person to exercise your rights if you die or become unable to. Tell the Grievance Officer whom you nominate.</li>
        </ul>
        <p>
          All of these are under <strong>Privacy &amp; data</strong> in the app. We respond to requests within 30 days. If you are not satisfied with our response, you may complain to the <strong>Data Protection Board of India</strong>.
        </p>
      </Section>

      <Section id="security" title="8. How we protect it">
        <ul>
          <li>Encryption in transit (HTTPS) and at rest. Sensitive fields, such as mailbox tokens, are encrypted again with keys only our servers hold.</li>
          <li>Sign-in codes are short-lived and rate-limited. Two-step verification is available to everyone and required for staff.</li>
          <li>Staff access is limited to the role a task needs, requires two-step verification and is logged.</li>
          <li>Tokens are kept in secure, http-only cookies that page scripts cannot read.</li>
        </ul>
        <p>
          No system is perfectly secure. If a breach affects your personal data, we will tell you and the Data Protection Board of India without delay, as the law requires.
        </p>
      </Section>

      <Section id="cookies" title="9. Cookies and local storage">
        <p>
          We use only <strong>essential</strong> cookies: two session cookies that keep you signed in, and a short-lived cookie during Google sign-in. Your browser also stores your language and display settings, an offline page and, if you use it, the Smart inbox folder link. We do not use advertising or analytics cookies or third-party trackers.
        </p>
      </Section>

      <Section id="children" title="10. Children">
        <p>
          LifeSphere is for adults aged 18 and over, and we do not knowingly create accounts for children. If you add information about a child in your family, such as a school reminder, you do so as their parent or lawful guardian, and only the people you share it with can see it. See <P slug="child-safety" />.
        </p>
      </Section>

      <Section id="changes" title="11. Changes to this policy">
        <p>
          When we change this policy in a way that matters, we will tell you in the app before the change applies. Where new consent is needed, we will ask for it. The date at the top shows the latest version.
        </p>
      </Section>

      <Section id="contact" title="12. Contact and complaints">
        <GrievanceCard />
        <p className="mt-4">
          You can also raise a grievance from <strong>Privacy &amp; data</strong> in the app. See <P slug="grievance" /> for timelines and how to appeal.
        </p>
      </Section>
    </Policy>
  );
}
