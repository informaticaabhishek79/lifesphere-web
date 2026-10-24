import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';

export const metadata: Metadata = { title: 'Account Termination' };

export default function AccountTermination() {
  return (
    <Policy
      title="Account Termination"
      summary={
        <p>
          You can delete your account whenever you like. You have 7 days to change your mind, then it is gone for good. We suspend or close accounts only for serious or repeated breaches of our rules. Except in urgent cases, we tell you why first, and you can appeal.
        </p>
      }
    >
      <Section id="you" title="1. Closing your own account">
        <ol>
          <li>Download your data first if you want a copy: <strong>Privacy &amp; data → Download my data</strong>.</li>
          <li>Go to <strong>Privacy &amp; data → Delete account</strong>. You may be asked to confirm it is you.</li>
          <li>Your account is scheduled for deletion. For <strong>7 days</strong> you can cancel by signing in again or by choosing <em>Keep my account</em>.</li>
          <li>After 7 days the account is permanently deleted. This cannot be undone.</li>
        </ol>
      </Section>

      <Section id="deleted" title="2. What is deleted, and what remains">
        <ul>
          <li><strong>Deleted:</strong> your account, profile, personal organiser items, documents and uploaded files, family-care schedules and grants, assistant and agent data, connected mailboxes, community posts and comments, and your sessions.</li>
          <li><strong>Shared spaces continue:</strong> households and community groups you belonged to remain for other members. Items you added to a shared household may stay available to them without your name. If you were a household’s only admin, the longest-standing member becomes admin.</li>
          <li><strong>Service provider listings:</strong> a listing you owned alone is taken down.</li>
          <li><strong>Kept for a limited time where the law requires it:</strong> security and audit logs (1 year), evidence of reported content (up to 180 days) and records needed for an ongoing legal matter. Backups roll over within 30 days.</li>
        </ul>
      </Section>

      <Section id="us" title="3. When we may suspend or close an account">
        <p>We may restrict, suspend or close an account if:</p>
        <ul>
          <li>it is used for content or behaviour prohibited by the <P slug="acceptable-use" /> or the <P slug="child-safety" /> policy;</li>
          <li>it breaches the <P slug="terms" /> seriously or repeatedly, after a warning;</li>
          <li>it is used for fraud, impersonation, harassment, spam or attempts to break into accounts or systems;</li>
          <li>it belongs to someone under 18;</li>
          <li>a court or authority lawfully orders it; or</li>
          <li>it is needed to protect someone’s safety or the security of the Service.</li>
        </ul>
        <p>Our steps are proportionate: removing content, a warning, limiting a feature, a temporary suspension, or closure for the most serious cases.</p>
      </Section>

      <Section id="notice" title="4. Notice and reasons">
        <p>
          Before we suspend or close your account, we will tell you why, by email or in the app, and give you a chance to respond. We may act first and explain afterwards when there is a risk of harm, illegal content (including child sexual abuse material), fraud, or a legal requirement not to notify.
        </p>
      </Section>

      <Section id="appeal" title="5. Appeals">
        <ol>
          <li>Write to the <P slug="grievance">Grievance Officer</P> within 30 days. Say which account it is and why you think the decision is wrong.</li>
          <li>Someone who did not make the original decision will review it. We will reply within 15 days.</li>
          <li>If the decision concerns content and you remain dissatisfied, you can appeal to the Grievance Appellate Committee (see <P slug="grievance" />).</li>
        </ol>
      </Section>

      <Section id="inactive" title="6. Inactive accounts">
        <p>
          We do not delete accounts just because they are quiet; a parent may rely on check-ins without opening the app often. If the law requires us to remove long-inactive accounts in future, we will give you at least 48 hours’ notice and a chance to keep the account.
        </p>
      </Section>

      <Section id="after" title="7. After closure">
        <p>
          If we close your account, you may not create a new one without our permission. If your account was closed for a reason other than a breach, such as our discontinuing the Service, we will give you reasonable notice and time to download your data.
        </p>
      </Section>
    </Policy>
  );
}
