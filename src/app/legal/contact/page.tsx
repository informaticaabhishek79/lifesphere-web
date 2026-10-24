import type { Metadata } from 'next';
import { GrievanceCard, P, Policy, Section } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Contact Us' };

export default function Contact() {
  const email = LEGAL.supportEmail ?? LEGAL.grievanceOfficer.email;
  return (
    <Policy
      title="Contact Us"
      summary={
        <p>
          For most things, the quickest route is inside the app: <strong>Privacy &amp; data</strong> for data requests and complaints, and <em>Report</em> on anything that breaks our rules. You can also call us. <strong>In an emergency, call {LEGAL.emergencyNumber}</strong> — we are not an emergency service.
        </p>
      }
    >
      <Section id="company" title="1. Who we are">
        <p>
          {LEGAL.product} is provided by <strong>{LEGAL.company}</strong>, {LEGAL.address}.
        </p>
      </Section>

      <Section id="ways" title="2. How to reach us">
        <table>
          <thead>
            <tr>
              <th>For</th>
              <th>Best way</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Help using LifeSphere</td>
              <td>
                Call {LEGAL.grievanceOfficer.phone}
                {email ? <>, or email {email}</> : null}
              </td>
            </tr>
            <tr><td>Download, correct or delete your data</td><td>In the app: Privacy &amp; data</td></tr>
            <tr><td>Report a post, comment, listing or person</td><td>In the app: <em>Report</em> on the item</td></tr>
            <tr><td>Complaints, appeals, legal or police requests</td><td>The <P slug="grievance">Grievance Officer</P></td></tr>
            <tr><td>A security problem you found</td><td>The Grievance Officer — please don’t share details publicly until we fix it</td></tr>
            <tr><td>Listing your business as a service provider</td><td>In the app: Provider portal</td></tr>
          </tbody>
        </table>
        <p>We reply within 2 working days, and acknowledge complaints within 24 hours.</p>
      </Section>

      <Section id="officer" title="3. Grievance Officer">
        <GrievanceCard />
      </Section>

      <Section id="scams" title="4. Beware of impostors">
        <p>
          We will never ask for your OTP, sign-in code, card PIN, UPI PIN or bank details, or ask you to install a remote-access app. If someone claiming to be from LifeSphere does, hang up and report it to us. You can also report it to the National Cyber Crime Reporting Portal (cybercrime.gov.in, helpline 1930).
        </p>
      </Section>
    </Policy>
  );
}
