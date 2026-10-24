import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function Terms() {
  return (
    <Policy
      title="Terms of Service"
      summary={
        <p>
          LifeSphere is a personal organiser, family-care and neighbourhood app for adults. You keep ownership of what you put in it, you choose who sees it, and you can leave at any time. It is free today. It is not an emergency or medical service: in an emergency, call {LEGAL.emergencyNumber}.
        </p>
      }
    >
      <Section id="agreement" title="1. Who we are and this agreement">
        <p>
          {LEGAL.product} (the “Service”) is provided by <strong>{LEGAL.company}</strong>, {LEGAL.address} (“we”, “us”). These Terms of Service are a binding agreement between you and us. By creating an account or using the Service you agree to these Terms and to the policies they refer to: the <P slug="privacy" />, <P slug="acceptable-use" />, <P slug="medical-disclaimer" />, <P slug="child-safety" />, <P slug="account-termination" /> and <P slug="refund-policy" />.
        </p>
        <p>This agreement is an electronic record under the Information Technology Act, 2000 and does not need a physical or digital signature.</p>
      </Section>

      <Section id="eligibility" title="2. Who can use LifeSphere">
        <ul>
          <li>You must be <strong>18 years or older</strong> and able to enter into a contract under Indian law. We do not offer accounts to children (see <P slug="child-safety" />).</li>
          <li>You must give accurate details, keep only one personal account, and not use the Service if we have previously closed your account for a breach of these Terms.</li>
          <li>If you use LifeSphere on behalf of an organisation, such as a service provider listing, you confirm you are authorised to act for it.</li>
        </ul>
      </Section>

      <Section id="account" title="3. Your account and security">
        <ul>
          <li>You sign in with a one-time code sent to your mobile number or email, or with Google. Keep access to these secure: anyone who can read your codes can enter your account.</li>
          <li>Turn on two-step verification in Settings where you can. Tell us promptly if you think someone else has used your account.</li>
          <li>You are responsible for activity in your account, unless it happened because of our failure to take reasonable security measures.</li>
        </ul>
      </Section>

      <Section id="service" title="4. What the Service does">
        <p>LifeSphere includes, among other features:</p>
        <ul>
          <li><strong>Personal organiser:</strong> tasks, reminders, calendar, notes, documents and the Smart inbox.</li>
          <li><strong>Home:</strong> shared households, shopping lists, inventory, chores and an optional budget.</li>
          <li><strong>Family care:</strong> trusted contacts, daily check-ins, medicine reminders and a Get help button that alerts the people you choose.</li>
          <li><strong>Community:</strong> neighbourhood groups, posts and comments.</li>
          <li><strong>Help and services:</strong> listings of local service providers, service requests, consumer-complaint tools and civic information.</li>
          <li><strong>Assistants:</strong> optional AI features, such as the voice assistant, agents and document reading.</li>
        </ul>
        <p>We may add, change or remove features. If we remove a feature you rely on, we will try to give reasonable notice and a way to export your data.</p>
      </Section>

      <Section id="others" title="5. Information about other people">
        <p>
          When you add a contact, invite a family member, record someone’s medicines, or share their details, you confirm that you have their permission or another lawful basis to do so. For family care in particular, check-ins and alerts must be set up with the knowledge and agreement of the person they concern. Do not use LifeSphere to monitor anyone secretly.
        </p>
      </Section>

      <Section id="content" title="6. Your content">
        <ul>
          <li>You own the content you create or upload (“your content”). We do not claim ownership of it.</li>
          <li>You give us a limited, non-exclusive, royalty-free licence to store, process, display and transmit your content only as needed to run the Service for you and for the people you share it with — for example, to show a community post to members of that group.</li>
          <li>We do not sell your content or personal data, do not use it for advertising, and do not allow our AI providers to train on it. See the <P slug="privacy" />.</li>
          <li>You are responsible for your content and must have the rights to share it. It must follow the <P slug="acceptable-use" />.</li>
        </ul>
      </Section>

      <Section id="community" title="7. Community and intermediary role">
        <p>
          For content that users post for others — community posts, comments, provider listings and reviews — we act as an intermediary under the Information Technology Act, 2000 and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. We do not create or check that content before it appears. We act on reports and on lawful orders, and may remove content or restrict accounts that breach these Terms. You can report any post from the app or contact the <P slug="grievance">Grievance Officer</P>.
        </p>
      </Section>

      <Section id="providers" title="8. Local service providers">
        <ul>
          <li>Service providers listed in LifeSphere are independent. They are not our employees or agents, and any agreement for their work is between you and them.</li>
          <li>A “verified” badge means we checked specific documents at the time of verification; it is not a guarantee of quality, safety or price. Sponsored listings are labelled, and payment does not affect verification.</li>
          <li>Payments for services are made directly to the provider. We do not take those payments and cannot refund them (see <P slug="refund-policy" />).</li>
          <li>Use your own judgement and take normal precautions before letting anyone into your home.</li>
        </ul>
      </Section>

      <Section id="ai" title="9. AI features">
        <ul>
          <li>AI features are optional. When you use them, the text needed to answer your request is sent to our AI provider for that request only, as described in the <P slug="privacy" />.</li>
          <li>AI can be wrong or incomplete. Check important results — especially dates, amounts and anything about health, money or legal matters — before relying on them. AI answers are not professional advice.</li>
          <li>Items the Smart inbox creates from your documents can be reviewed and undone.</li>
        </ul>
      </Section>

      <Section id="not-emergency" title="10. Not an emergency or medical service">
        <p>
          Check-ins, medicine reminders and the Get help button depend on phones, networks, notifications and the people you chose to respond. Messages can be delayed or fail. LifeSphere does not contact emergency services for you, and nobody at LifeSphere monitors alerts around the clock. <strong>In an emergency, call {LEGAL.emergencyNumber}.</strong> See the <P slug="medical-disclaimer" />.
        </p>
      </Section>

      <Section id="fees" title="11. Fees">
        <p>
          LifeSphere is currently free. If we introduce paid plans, we will show the price and terms before you choose one, and nobody will be moved to a paid plan without agreeing. See the <P slug="refund-policy" />. We will never ask for your bank details, card PIN or OTP.
        </p>
      </Section>

      <Section id="ip" title="12. Our intellectual property">
        <p>
          The Service, its software, design, name and logo belong to {LEGAL.company} or its licensors. You may use the Service only as these Terms allow. You may not copy, reverse engineer, resell or create competing products from it, except as the law permits.
        </p>
      </Section>

      <Section id="third-party" title="13. Third-party services">
        <p>
          Some features use services run by others, such as Google sign-in, your email provider, browser notifications and map or help-line links. Their own terms apply to your use of them, and we are not responsible for their content or availability.
        </p>
      </Section>

      <Section id="availability" title="14. Availability and changes">
        <p>
          We work to keep LifeSphere available and secure, but we do not promise it will be uninterrupted or error-free. We may carry out maintenance, which can briefly interrupt the Service. Keep your own copies of important documents.
        </p>
      </Section>

      <Section id="disclaimers" title="15. Disclaimers">
        <p>
          To the extent the law allows, the Service is provided “as is” and “as available”. We do not give warranties that it will meet every need, and we are not responsible for the actions, content or services of other users or service providers.
        </p>
      </Section>

      <Section id="liability" title="16. Limitation of liability">
        <p>To the extent permitted by law:</p>
        <ul>
          <li>We are not liable for indirect, incidental, special or consequential losses, or for loss of profits, data or goodwill.</li>
          <li>Our total liability to you for all claims relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim, or ₹1,000.</li>
          <li>Nothing in these Terms limits liability that cannot be limited under Indian law, including for fraud or for death or personal injury caused by our negligence, or your rights as a consumer.</li>
        </ul>
      </Section>

      <Section id="indemnity" title="17. Indemnity">
        <p>
          You agree to compensate us for reasonable losses and legal costs arising from your breach of these Terms, your content, or your misuse of the Service, except to the extent they were caused by us.
        </p>
      </Section>

      <Section id="ending" title="18. Ending this agreement">
        <p>
          You may stop using LifeSphere and delete your account at any time from Settings. We may suspend or close accounts as set out in the <P slug="account-termination" />.
        </p>
      </Section>

      <Section id="changes" title="19. Changes to these Terms">
        <p>
          We may update these Terms. For changes that materially affect you, we will tell you in the app or by email at least 15 days before they take effect, unless a change is required sooner by law or to prevent harm. If you continue to use the Service after the changes take effect, the new Terms apply. If you do not agree, you can delete your account.
        </p>
      </Section>

      <Section id="law" title="20. Governing law and disputes">
        <p>
          These Terms are governed by the laws of India. Please contact the <P slug="grievance">Grievance Officer</P> first so we can try to resolve any issue. Subject to that, the courts at {LEGAL.city} have exclusive jurisdiction. This does not take away any right you have to approach a consumer commission or another authority under Indian law.
        </p>
      </Section>

      <Section id="general" title="21. General">
        <ul>
          <li>If any part of these Terms is found unenforceable, the rest stays in effect.</li>
          <li>If we do not enforce a right straight away, we have not given it up.</li>
          <li>You may not transfer your rights under these Terms. We may transfer ours to a successor that continues the Service under equivalent protections, and will tell you if we do.</li>
          <li>These Terms and the policies they refer to are the whole agreement between you and us about the Service.</li>
        </ul>
      </Section>

      <Section id="contact" title="22. Contact">
        <p>
          See <P slug="contact" /> or write to the <P slug="grievance">Grievance Officer</P>.
        </p>
      </Section>
    </Policy>
  );
}
