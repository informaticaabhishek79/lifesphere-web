import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Local Services & Consumer Help' };

export default function HelpAndServices() {
  return (
    <GuideArticle
      title="Local Services & Consumer Help"
      summary={
        <p>
          Find trusted local help such as plumbers, tutors or caregivers; track requests you send to providers; and keep a record of purchases, warranties and complaints, with help drafting a complaint letter.
        </p>
      }
    >
      <GuideSection id="services" title="1. Local services">
        <p>Browse or post an open request for local help. Verification labels show what was actually checked by LifeSphere's reviewers — they are not an endorsement, and ID numbers used in checks are never shown publicly.</p>
        <Example title="A leaking kitchen tap">
          <ol>
            <li>Open <strong>Local services</strong> and browse plumbers in your area, or post an open request: "Kitchen tap is leaking".</li>
            <li>Providers serving your area see the request — not your contact details — and can offer to take it.</li>
            <li>Your exact location is shared with a provider only after you accept their offer.</li>
            <li>After the job, you can leave a public review under your display name.</li>
          </ol>
        </Example>
        <p>
          You can also book a request <em>for someone else</em>, e.g. arranging a plumber for a parent — they'll be able to see the request too.
        </p>
      </GuideSection>

      <GuideSection id="requests" title="2. My service requests">
        <p>Track every request you've sent, from requested through accepted, scheduled and completed. If something goes wrong, you can mark it disputed.</p>
      </GuideSection>

      <GuideSection id="provider-portal" title="3. Offering your own services (Provider portal)">
        <p>If you're a plumber, tutor, caregiver or volunteer, create a provider profile to receive requests.</p>
        <Example title="Listing as a tutor">
          <ol>
            <li>Open <strong>Provider portal</strong> and create a profile.</li>
            <li>Add at least one service (e.g. "Maths tuition, Class 9–10") and the areas you cover.</li>
            <li>Submit for review. Listing is free; a verification label is added only after LifeSphere's reviewers check specific documents.</li>
            <li>See open requests from your areas, and offer to take one.</li>
          </ol>
        </Example>
        <p>Services supporting seniors require background screening before they're listed.</p>
      </GuideSection>

      <GuideSection id="consumer" title="4. Consumer help">
        <p>Track a purchase, its warranty and any complaint, with your own evidence and the reference numbers you're given — nothing here reads your email or bank statements; it only keeps what you type in.</p>
        <Example title="A mixer that broke after two weeks">
          <ol>
            <li>Open <strong>Consumer help</strong> and record the case: "Mixer stopped working after 2 weeks", what happened, and what you want — a replacement or a refund.</li>
            <li>Add evidence: photos, the invoice, or a chat screenshot.</li>
            <li>Let the assistant draft a complaint letter from what you've entered, or write your own. Read it carefully and edit it — nothing is sent for you, you copy it and submit it yourself through the official channel.</li>
            <li>LifeSphere shows official complaint channels, like the National Consumer Helpline. Submit there, then save the reference number they give you.</li>
          </ol>
        </Example>
      </GuideSection>

      <GuideSection id="assistant-link" title="5. Ask the Assistant">
        <p>
          For general questions about consumer rights, civic processes, safety or using LifeSphere, open the <strong>Assistant</strong> or read <strong>Guides</strong> for plain-language articles with sources. See <G slug="assistants" />.
        </p>
      </GuideSection>
    </GuideArticle>
  );
}
