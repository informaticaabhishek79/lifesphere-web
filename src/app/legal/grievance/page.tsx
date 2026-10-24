import type { Metadata } from 'next';
import { GrievanceCard, P, Policy, Section } from '@/components/legal';

export const metadata: Metadata = { title: 'Grievance Officer' };

export default function Grievance() {
  return (
    <Policy
      title="Grievance Officer"
      summary={
        <p>
          If something in LifeSphere has gone wrong for you — your data, content you saw, an account decision or a charge — tell our Grievance Officer. We acknowledge every complaint within 24 hours and resolve it within 15 days. Urgent safety matters are handled first.
        </p>
      }
    >
      <Section id="officer" title="1. Grievance Officer">
        <p>
          Appointed under the Information Technology Act, 2000, the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the Digital Personal Data Protection Act, 2023 and the Consumer Protection (E-Commerce) Rules, 2020.
        </p>
        <div className="mt-4">
          <GrievanceCard />
        </div>
      </Section>

      <Section id="what" title="2. What you can raise">
        <ul>
          <li>How your personal data is collected, used, shared, corrected or deleted, and requests under your data-protection rights.</li>
          <li>Content you believe is unlawful or breaks our <P slug="acceptable-use" />, including content about you posted without consent.</li>
          <li>A suspension, closure or content-removal decision about your account.</li>
          <li>Security concerns, misuse of your account, or someone pretending to be LifeSphere.</li>
          <li>Charges and refunds (see <P slug="refund-policy" />), or any other problem with the Service.</li>
        </ul>
      </Section>

      <Section id="how" title="3. How to file a complaint">
        <ul>
          <li><strong>In the app:</strong> Privacy &amp; data → Grievance. This is the fastest way, and it lets you track progress.</li>
          <li><strong>By phone</strong> to the Grievance Officer, using the details above.</li>
          <li><strong>To report content:</strong> use <em>Report</em> on the post, comment, listing or profile.</li>
        </ul>
        <p>Please include:</p>
        <ul>
          <li>your name and the mobile number or email on your account;</li>
          <li>what happened, and when;</li>
          <li>a link to or description of the content or screen involved; and</li>
          <li>what you would like us to do.</li>
        </ul>
        <p>We may ask you to confirm your identity before acting on a request about an account.</p>
      </Section>

      <Section id="timelines" title="4. Our timelines">
        <table>
          <thead>
            <tr>
              <th>Type of complaint</th>
              <th>What we do</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Every complaint</td><td>Acknowledge within <strong>24 hours</strong>, with a reference number</td></tr>
            <tr><td>General complaints, content complaints and account decisions</td><td>Resolve within <strong>15 days</strong></td></tr>
            <tr><td>Content showing a person’s private areas or nudity, sexual acts, impersonation or morphed images of a person</td><td>Remove or disable access within <strong>24 hours</strong></td></tr>
            <tr><td>Child sexual abuse material or a child in danger</td><td>Act immediately and report to the authorities (see <P slug="child-safety" />)</td></tr>
            <tr><td>Data-protection rights (access, correction, erasure, nomination)</td><td>Complete within <strong>30 days</strong></td></tr>
            <tr><td>Refunds</td><td>Decide within 7 working days</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="appeal" title="5. If you are not satisfied">
        <ul>
          <li><strong>Content and account decisions:</strong> you may appeal to the <strong>Grievance Appellate Committee</strong> set up by the Government of India, at gac.gov.in, within 30 days of our decision.</li>
          <li><strong>Personal data:</strong> after using our grievance process, you may complain to the <strong>Data Protection Board of India</strong>.</li>
          <li><strong>Consumer matters:</strong> you may contact the National Consumer Helpline (1915, consumerhelpline.gov.in) or file with a Consumer Commission through e-Daakhil.</li>
        </ul>
        <p>These options are in addition to any other remedy the law gives you.</p>
      </Section>

      <Section id="authorities" title="6. Requests from authorities">
        <p>
          Government agencies and courts with lawful authority can send orders and requests to the Grievance Officer. We respond as Indian law requires.
        </p>
      </Section>
    </Policy>
  );
}
