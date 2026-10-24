import type { Metadata } from 'next';
import { P, Policy, Section } from '@/components/legal';

export const metadata: Metadata = { title: 'Refund Policy' };

export default function RefundPolicy() {
  return (
    <Policy
      title="Refund Policy"
      summary={
        <p>
          LifeSphere is free today, and we do not take payments, so there is nothing to refund. If we launch paid plans, you will only be charged after you choose one, and this policy explains how cancellations and refunds will work.
        </p>
      }
    >
      <Section id="today" title="1. LifeSphere is free today">
        <p>
          Every LifeSphere feature is currently free. We do not collect card, UPI or bank details, and we never ask for them by phone, message or email. If anyone asks you to pay “LifeSphere” or to share an OTP or PIN, it is not us — please report it to the <P slug="grievance">Grievance Officer</P>.
        </p>
      </Section>

      <Section id="paid" title="2. If paid plans are introduced">
        <p>If we offer paid plans, such as Family Plus for households or a listing plan for service providers:</p>
        <ul>
          <li>The price, billing period, taxes and what is included will be shown before you pay. Payment will be handled by a regulated payment gateway. We will not store your card details.</li>
          <li>Nobody will be moved from the free plan to a paid plan without choosing it.</li>
          <li>You can cancel at any time from Settings. Cancelling stops the next renewal, and you keep paid features until the end of the period you paid for.</li>
          <li>We will remind you before an annual plan renews.</li>
        </ul>
      </Section>

      <Section id="refunds" title="3. When you can get a refund">
        <ul>
          <li><strong>First purchase:</strong> if you are not satisfied, ask within <strong>7 days</strong> of your first payment for a plan and we will refund it in full.</li>
          <li><strong>Charged in error:</strong> if you were charged twice, charged after cancelling, or charged the wrong amount, we will refund the incorrect amount in full.</li>
          <li><strong>Service failure:</strong> if a paid feature was unavailable for a significant part of your billing period because of a problem on our side, we will refund or credit that part.</li>
          <li>Apart from these cases, payments for a period that has already started are not refundable, but you can cancel so that you are not charged again.</li>
        </ul>
      </Section>

      <Section id="how" title="4. How to ask for a refund">
        <ol>
          <li>Contact the <P slug="grievance">Grievance Officer</P>, or use <P slug="contact">Contact Us</P>, with the email or mobile number on your account, the date and amount, and the transaction ID if you have it.</li>
          <li>We will acknowledge your request within 48 hours and decide within 7 working days.</li>
          <li>Approved refunds are sent back to the original payment method. Depending on your bank or payment provider, they usually arrive within 5–7 working days.</li>
        </ol>
      </Section>

      <Section id="providers" title="5. Payments to service providers">
        <p>
          Money you pay to a local service provider you found through LifeSphere goes directly to that provider. We are not a party to that payment and cannot refund it. Please take it up with the provider first. If that fails, LifeSphere’s consumer tools can help you escalate it, for example to the National Consumer Helpline (1915).
        </p>
      </Section>

      <Section id="rights" title="6. Your consumer rights">
        <p>
          This policy does not limit your rights under the Consumer Protection Act, 2019. If we change this policy, the version in force when you paid applies to that payment. See also the <P slug="terms" />.
        </p>
      </Section>
    </Policy>
  );
}
