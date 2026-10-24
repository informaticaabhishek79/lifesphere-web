import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Medical Disclaimer' };

export default function MedicalDisclaimer() {
  return (
    <Policy
      title="Medical Disclaimer"
      summary={
        <p>
          LifeSphere helps families stay in touch and remember things. It is <strong>not</strong> a medical device, a doctor, a pharmacy or an emergency service, and nobody at LifeSphere watches alerts around the clock. <strong>In an emergency, call {LEGAL.emergencyNumber}</strong> (ambulance 108 in most states).
        </p>
      }
    >
      <Section id="not-advice" title="1. Not medical advice">
        <p>
          Nothing in LifeSphere — reminders, check-ins, articles, AI answers or messages from other users — is medical advice, diagnosis or treatment. Always follow the advice of a qualified doctor or pharmacist, and never delay or ignore professional advice because of something you read or were told in LifeSphere.
        </p>
      </Section>

      <Section id="medicines" title="2. Medicine reminders">
        <ul>
          <li>Medicine reminders show what you or your family member entered. We do not check names, doses, timings or interactions.</li>
          <li>Always follow the prescription and the pharmacist’s instructions. If a reminder disagrees with them, the prescription wins — update the reminder.</li>
          <li>Marking a dose as taken records what the person tapped. It does not confirm the medicine was actually taken.</li>
          <li>Reminders can be delayed or missed if a phone is off, silent, offline or has notifications turned off.</li>
        </ul>
      </Section>

      <Section id="checkins" title="3. Check-ins and the Get help button">
        <ul>
          <li>Check-ins and missed-check-in alerts are a way to keep family informed. They are not health monitoring and do not detect falls, illness or emergencies.</li>
          <li>Get help sends an alert only to the trusted contacts you chose. <strong>It does not call emergency services, a hospital or the police.</strong></li>
          <li>Alerts depend on mobile networks, internet access, email, SMS or WhatsApp providers, the contacts’ phones and whether they respond. Any of these can fail or be delayed.</li>
          <li>For anyone with serious health needs, use LifeSphere alongside proper care arrangements, not instead of them.</li>
        </ul>
      </Section>

      <Section id="ai" title="4. AI answers and health information">
        <p>
          AI features and knowledge articles can be incomplete, out of date or wrong, and they cannot examine anyone. Use them for general information only. Do not use them to decide on a diagnosis, a medicine or a dose.
        </p>
      </Section>

      <Section id="providers" title="5. Health-related service providers">
        <p>
          If you find a health-related provider through LifeSphere, such as a nurse, carer or physiotherapist, check their qualifications yourself. Your arrangement is with them, as set out in the <P slug="terms" />. A verification badge confirms only the specific documents we checked.
        </p>
      </Section>

      <Section id="emergency" title="6. In an emergency">
        <ul>
          <li>Call <strong>{LEGAL.emergencyNumber}</strong> (all-India emergency number) or <strong>108</strong> for an ambulance in most states.</li>
          <li>Tele-MANAS mental-health helpline: <strong>14416</strong>.</li>
          <li>Elderline (Ministry of Social Justice) for senior citizens: <strong>14567</strong>.</li>
        </ul>
      </Section>

      <Section id="liability" title="7. Responsibility">
        <p>
          To the extent the law allows, we are not responsible for harm arising from relying on LifeSphere instead of professional medical care or emergency services. See the <P slug="terms" />, sections 10 and 16.
        </p>
      </Section>
    </Policy>
  );
}
