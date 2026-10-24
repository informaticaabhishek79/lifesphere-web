import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Getting Started' };

export default function GettingStarted() {
  return (
    <GuideArticle
      title="Getting Started"
      summary={
        <p>
          You sign in with a one-time code — no password to remember. The first time, LifeSphere asks what you want it for, so it can show you the right features straight away. You can change your mind at any time in Settings.
        </p>
      }
    >
      <GuideSection id="account" title="1. Create an account">
        <ol>
          <li>Open LifeSphere and choose <strong>Mobile number</strong> or <strong>Email</strong>.</li>
          <li>Enter your number or address and tick <strong>I'm creating a new account</strong>.</li>
          <li>Confirm you are 18 or older, and accept the Terms and Privacy Policy.</li>
          <li>Enter the 6-digit code that arrives by SMS, WhatsApp or email.</li>
        </ol>
        <p>You can also sign in with Google where it's offered. There's no password at any point — every sign-in uses a fresh code.</p>
      </GuideSection>

      <GuideSection id="purpose" title="2. What will you use LifeSphere for?">
        <p>New accounts are asked one question, because the full app can feel like a lot at once:</p>
        <ul>
          <li><strong>I look after a parent or relative</strong> — shows check-ins, medicine reminders and help, and hides features you likely won't need yet, like community groups.</li>
          <li><strong>I'd like my family to look out for me</strong> — sets you up as the person being looked after: a big "I'm OK" button, medicines and a help button.</li>
          <li><strong>Just for me</strong> — turns everything on: tasks, home, family care, community and local services.</li>
        </ul>
        <Example title="Looking after your mother from another city">
          <p>
            Choose <em>I look after a parent or relative</em>. LifeSphere guides you to invite her, set a daily check-in time, and add her medicines. Nothing is switched on for her without her agreeing to it — she sees exactly what you're asking to see and can say no to any part of it.
          </p>
        </Example>
        <p>
          You are never locked in. Open <strong>Settings → Features</strong> at any time to turn any part of LifeSphere on or off, or change what your home screen shows.
        </p>
      </GuideSection>

      <GuideSection id="layout" title="3. Finding your way around">
        <p>The menu is grouped to match how people actually use LifeSphere:</p>
        <ul>
          <li><strong>My day</strong> — Tasks, Reminders, Calendar</li>
          <li><strong>Home</strong> — Households, Shopping lists, Home inventory, Budget</li>
          <li><strong>Family care</strong> — Family, Trusted contacts, Sharing, Check-ins, Get help</li>
          <li><strong>Community</strong> — Community, Civic issues</li>
          <li><strong>Help &amp; services</strong> — Local services, My service requests, Consumer help, Assistant, Guides, Provider portal</li>
          <li><strong>Agents</strong> — Voice assistant, My agents, Email, Documents, Smart inbox</li>
          <li><strong>You</strong> — Notifications, Settings, Privacy &amp; data</li>
        </ul>
        <p>A section only appears if you've switched that feature on. See <G slug="settings-and-privacy" /> to show or hide any of them.</p>
      </GuideSection>

      <GuideSection id="first-steps" title="4. A good first five minutes">
        <ol>
          <li>Add your first task or reminder — see <G slug="my-day" />.</li>
          <li>Set your locality and language in Settings, so local groups and services can find you.</li>
          <li>If you're setting this up for family care, invite the first person — see <G slug="family-care" />.</li>
          <li>Turn on <strong>Install the app</strong> from your home screen — see <G slug="mobile-and-offline" />.</li>
        </ol>
      </GuideSection>

      <GuideSection id="security" title="5. Keeping your account secure">
        <p>
          Turn on <strong>two-step verification</strong> in Settings for an extra code from an authenticator app whenever something sensitive happens, like deleting your account. If you ever lose access, recovery codes shown when you set it up let you back in — save them somewhere safe.
        </p>
      </GuideSection>
    </GuideArticle>
  );
}
