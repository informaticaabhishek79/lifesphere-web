import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Voice Assistant, Agents, Email & Smart Inbox' };

export default function Assistants() {
  return (
    <GuideArticle
      title="Voice Assistant, Agents, Email & Smart Inbox"
      summary={
        <p>
          These are the AI-powered features, and every one is optional — nothing here is used unless you turn it on. They use only what you've switched on in Settings → Features, and the voice assistant and the assistant chat only ever <em>read</em> your data; they never change anything.
        </p>
      }
    >
      <GuideSection id="assistant" title="1. Assistant (chat)">
        <p>Ask about consumer rights, civic services, safety or using LifeSphere. Answers come from public guidance with sources, not from your personal data.</p>
        <Example title="A quick question">
          <p>"What's the process to file a consumer complaint for a faulty product in India?" — the Assistant answers with sources you can check, and a link to file one if you want to act on it.</p>
        </Example>
        <p>Conversation history is off by default; turn it on in Settings if you want LifeSphere to remember past chats (kept 30 days, then deleted automatically).</p>
      </GuideSection>

      <GuideSection id="voice" title="2. Voice assistant">
        <p>Ask out loud about your tasks, calendar, lists, budget, family check-ins, complaints or documents — it looks in the right place and answers, reading only the features you've switched on. Great for someone who finds typing harder than speaking.</p>
        <Example title="Checking what's planned today">
          <p>Tap the microphone and ask "What's on my calendar today?" or "How much have I spent on groceries this month?" — it answers from your own data, but never changes anything on its own.</p>
        </Example>
      </GuideSection>

      <GuideSection id="agents" title="3. Agents">
        <p>
          Agents do specific jobs for you, strictly limited to what you give them access to. Every request and every action an agent takes is recorded in its activity log, kept for 90 days.
        </p>
        <ul>
          <li><strong>Email agent:</strong> replies to an email you pick, when you ask. It sees only that one email.</li>
          <li><strong>Documents agent:</strong> works only with files in the folders you give it — everything else stays out of its reach.</li>
        </ul>
        <Example title="A documents agent for receipts">
          <p>
            Create a documents agent, give it access only to a "Receipts" folder, and ask: "List my files", "Summarise the March electricity bill", or "Create a note called Totals with the sum of this month's receipts". It can only see and act inside that one folder.
          </p>
        </Example>
      </GuideSection>

      <GuideSection id="email" title="4. Email">
        <p>
          Connect a Gmail or Outlook mailbox to read your inbox inside LifeSphere and ask an agent to draft a reply to a specific email. LifeSphere asks only for permission to read and send mail; content is fetched when you open an email and is not stored. Nothing is sent until you press Send — you always review the draft first.
        </p>
        <Example title="Replying to a landlord's email">
          <p>
            Open the email, tell the agent "Reply saying I'll pay by Friday and ask for a receipt", review the draft it writes, edit if needed, then send.
          </p>
        </Example>
        <p>Disconnect a mailbox at any time from the Email page — access ends immediately and any agents using it stop.</p>
      </GuideSection>

      <GuideSection id="inbox" title="5. Smart inbox">
        <p>
          Put documents in one watched folder — on your computer, or uploaded in the app — and LifeSphere reads each one and adds what's inside it to the right place: tasks, reminders, calendar, shopping lists, inventory, budget or family care. See <G slug="documents" /> for the full guide.
        </p>
      </GuideSection>
    </GuideArticle>
  );
}
