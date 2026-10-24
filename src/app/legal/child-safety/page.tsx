import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';
import { LEGAL } from '@/lib/legal';

export const metadata: Metadata = { title: 'Child Safety' };

export default function ChildSafety() {
  return (
    <Policy
      title="Child Safety"
      summary={
        <p>
          LifeSphere accounts are for adults aged 18 and over. We have zero tolerance for any content or behaviour that sexualises, exploits or endangers children. We remove it, close the accounts involved, preserve evidence and report it to the authorities.
        </p>
      }
    >
      <Section id="adults" title="1. Adults only">
        <ul>
          <li>You must confirm you are 18 or older to create an account. We do not offer child accounts.</li>
          <li>If we learn that an account belongs to someone under 18, we will close it and delete its data, except anything we must keep to protect a child or comply with the law.</li>
          <li>If you believe a child is using LifeSphere, tell the <P slug="grievance">Grievance Officer</P>.</li>
        </ul>
      </Section>

      <Section id="family-info" title="2. Information about children in your family">
        <p>
          Parents and guardians may record information about their own children in their organiser or household — for example, a school event or a vaccination reminder. Please:
        </p>
        <ul>
          <li>record only what you need, and share it only with people who need it;</li>
          <li>never post a child’s name, photo, school or location in community spaces;</li>
          <li>never share images of children in states of undress, even innocently.</li>
        </ul>
        <p>Such information is covered by our <P slug="privacy" /> and is never used for advertising or profiling.</p>
      </Section>

      <Section id="prohibited" title="3. What is strictly prohibited">
        <ul>
          <li>Child sexual abuse material (CSAM) in any form, including drawn, edited or AI-generated material, and links to it.</li>
          <li>Sexualising children in words or images, or sexual comments about children.</li>
          <li>Grooming: contacting, befriending or manipulating a child for sexual or exploitative purposes, or asking a child for secrecy, images or a meeting.</li>
          <li>Trafficking, child labour, or selling or advertising anything that exploits children.</li>
          <li>Content that encourages children to harm themselves or others, or bullying and harassing a child.</li>
          <li>Sharing a child’s personal details in order to locate, shame or harm them.</li>
        </ul>
      </Section>

      <Section id="action" title="4. What we do">
        <ul>
          <li>We remove or disable access to such content as fast as possible, and in any case within 24 hours of a report, as the IT Rules, 2021 require.</li>
          <li>We suspend and permanently close the accounts involved, without notice.</li>
          <li>We preserve the relevant records securely and report the matter to law enforcement, as the Protection of Children from Sexual Offences (POCSO) Act, 2012 and the Information Technology Act, 2000 require. This includes the National Cyber Crime Reporting Portal.</li>
          <li>We cooperate with lawful requests from police and child-protection authorities.</li>
        </ul>
        <p>We will never ask you to send us suspected abuse material. Report where it is; do not copy, download or forward it.</p>
      </Section>

      <Section id="report" title="5. How to report">
        <ul>
          <li><strong>In the app:</strong> use <em>Report</em> on the post, comment, listing or profile.</li>
          <li><strong>To us directly:</strong> contact the <P slug="grievance">Grievance Officer</P>. Say it concerns child safety and we will treat it as urgent.</li>
          <li><strong>To the authorities:</strong> the National Cyber Crime Reporting Portal at cybercrime.gov.in or helpline 1930; Childline 1098; or {LEGAL.emergencyNumber} if a child is in immediate danger.</li>
        </ul>
      </Section>
    </Policy>
  );
}
