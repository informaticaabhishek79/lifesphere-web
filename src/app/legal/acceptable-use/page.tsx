import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';

export const metadata: Metadata = { title: 'Acceptable Use' };

export default function AcceptableUse() {
  return (
    <Policy
      title="Acceptable Use Policy"
      summary={
        <p>
          Be honest, kind and lawful. Respect other people’s privacy and consent. Use the help button for real needs. Don’t try to break LifeSphere or get into anyone else’s data. This applies to everything you post, upload, send or set up in LifeSphere.
        </p>
      }
    >
      <Section id="illegal" title="1. Illegal and harmful content">
        <p>Do not upload, post, share or link to content that:</p>
        <ul>
          <li>is illegal in India, or encourages or helps someone commit a crime;</li>
          <li>sexualises or endangers children, in any way (see <P slug="child-safety" />);</li>
          <li>is obscene or pornographic, or shares intimate images of anyone without their consent;</li>
          <li>threatens, harasses, bullies, stalks or intimidates anyone;</li>
          <li>promotes hatred or violence against people based on religion, caste, race, ethnicity, gender, sexual orientation, disability or similar characteristics;</li>
          <li>promotes terrorism, or threatens the unity, integrity, defence, security or sovereignty of India, public order or friendly relations with other countries;</li>
          <li>is knowingly false or misleading in a way that could cause harm, including fake emergencies, health misinformation and financial scams;</li>
          <li>infringes someone else’s copyright, trademark or other rights;</li>
          <li>impersonates a person, organisation, government body or LifeSphere;</li>
          <li>contains viruses or malicious code.</li>
        </ul>
      </Section>

      <Section id="privacy" title="2. Respect privacy and consent">
        <ul>
          <li>Add people as contacts, set up check-ins for them, or record their medicines only with their knowledge and agreement.</li>
          <li>Do not use family-care features to track, monitor or control a partner or any adult without their consent.</li>
          <li>Do not post anyone’s phone number, address, documents, photos or health information in community spaces without permission. Do not “dox” anyone.</li>
          <li>Do not collect other users’ data, by scraping or by any other means.</li>
        </ul>
      </Section>

      <Section id="help" title="3. Help requests and alerts">
        <ul>
          <li>Use Get help and alerts for genuine needs. Repeated false alarms put real people under stress and may lead to the feature being limited.</li>
          <li>LifeSphere does not alert emergency services. In an emergency, call 112 (see <P slug="medical-disclaimer" />).</li>
        </ul>
      </Section>

      <Section id="community" title="4. Community spaces">
        <ul>
          <li>Keep posts relevant to the group. No spam, chain messages, repeated advertising or unsolicited bulk messages.</li>
          <li>Promote a business only where the group allows it, and say clearly that you are promoting it.</li>
          <li>Disagree respectfully. Moderators and group admins may remove posts that break group rules.</li>
          <li>Do not manipulate reactions or reports, or use several accounts to mislead.</li>
        </ul>
      </Section>

      <Section id="providers" title="5. Service providers and reviews">
        <ul>
          <li>Providers must describe their services, qualifications and prices honestly, and hold any licences their work requires.</li>
          <li>Reviews must reflect a genuine experience. Do not write fake reviews, review your own business, or offer anything in exchange for reviews.</li>
          <li>Do not ask customers for advance payments for work you do not intend to do, or for OTPs, PINs or bank details.</li>
        </ul>
      </Section>

      <Section id="ai" title="6. AI features">
        <ul>
          <li>Do not use the assistants or agents to create content this policy prohibits, to impersonate others, or to send messages someone did not ask for.</li>
          <li>Check what an agent drafts before you send it. You are responsible for what is sent from your account.</li>
        </ul>
      </Section>

      <Section id="security" title="7. Security and fair use">
        <ul>
          <li>Do not try to access accounts or data that are not yours, guess codes, or get around sign-in, two-step verification or rate limits.</li>
          <li>Do not probe, scan or test our systems for weaknesses without our written permission. If you find a security issue, report it to the <P slug="grievance">Grievance Officer</P>; we welcome responsible disclosure.</li>
          <li>Do not overload the Service, use automated tools against it, or reverse engineer it.</li>
          <li>Do not resell or sublicense the Service.</li>
        </ul>
      </Section>

      <Section id="enforcement" title="8. Reporting and enforcement">
        <p>
          Report anything that breaks these rules using <em>Report</em> in the app or by contacting the <P slug="grievance">Grievance Officer</P>. We may remove content, limit features, or suspend or close accounts, as described in <P slug="account-termination" />. Where the law requires, we will report matters to the authorities.
        </p>
      </Section>
    </Policy>
  );
}
