import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Documents & the Smart Inbox' };

export default function Documents() {
  return (
    <GuideArticle
      title="Documents & the Smart Inbox"
      summary={
        <p>
          <strong>Documents</strong> gives you folders for everyday files. The <strong>Smart inbox</strong> goes a step further: put a file into one watched folder, and LifeSphere reads it and files what's inside — tasks, reminders, calendar events, lists, inventory, budget lines and more — automatically.
        </p>
      }
    >
      <GuideSection id="documents" title="1. Documents">
        <p>Create your own folders and upload files or write notes into them. Give a documents agent access to a folder, and it can work only inside it — see <G slug="assistants" />. Deleted items go to a bin and can be restored for a set number of days before they're gone for good.</p>
      </GuideSection>

      <GuideSection id="setup" title="2. Setting up the Smart inbox">
        <p>
          Open <strong>Smart inbox</strong> and choose a folder — on your computer, if you use Chrome or Edge on desktop, or by uploading files directly in the app. LifeSphere creates these subfolders for you:
        </p>
        <table>
          <thead>
            <tr><th>Folder</th><th>What goes in it</th></tr>
          </thead>
          <tbody>
            <tr><td>Tasks</td><td>To-do lists, chores, bills to pay</td></tr>
            <tr><td>Reminders</td><td>Things to be reminded of at a set time</td></tr>
            <tr><td>Calendar</td><td>Appointments, visits, invitations, school and event dates</td></tr>
            <tr><td>Home – Shopping lists</td><td>Grocery and shopping lists</td></tr>
            <tr><td>Home – Inventory</td><td>Appliance bills, warranty cards, service records</td></tr>
            <tr><td>Home – Budget</td><td>Monthly budget sheets</td></tr>
            <tr><td>Home – Household</td><td>Chores, notices, home paperwork</td></tr>
            <tr><td>Family care</td><td>Prescriptions, medicine schedules, check-in times, doctor details</td></tr>
            <tr><td>Community</td><td>Neighbourhood notices, civic problems, things to share with a group</td></tr>
            <tr><td>Help and services</td><td>Emergency details, service bookings, complaints, receipts</td></tr>
            <tr><td>Not sure</td><td>Anything — LifeSphere works out what it is</td></tr>
          </tbody>
        </table>
        <p>A file dropped straight into the main inbox folder, not in a subfolder, is identified automatically too.</p>
      </GuideSection>

      <GuideSection id="examples" title="3. What happens when a file arrives">
        <Example title="A photographed grocery list">
          <p>Take a photo of your handwritten grocery list and save it into "Home - Shopping lists". LifeSphere reads the items and adds any new ones to your shopping list.</p>
        </Example>
        <Example title="A monthly budget spreadsheet">
          <p>Drop your budget spreadsheet into "Home - Budget". LifeSphere reads each category and amount and adds budget lines for the month, without overwriting a category you've already set.</p>
        </Example>
        <Example title="A prescription photo">
          <p>Save a photo of a prescription into "Family care". LifeSphere sets up medicine reminders from it — always without alerting your contacts automatically; you decide separately whether to turn on alerts for a missed dose.</p>
        </Example>
        <p>
          Some things are only <em>suggested</em>, never acted on automatically — a contact to invite, a community post, a service booking, a household note. You review and approve these yourself.
        </p>
      </GuideSection>

      <GuideSection id="undo" title="4. Reviewing and undoing">
        <p>
          Open <strong>Smart inbox</strong> to see everything each file created. Made a mistake, or the reading was wrong? Tap <strong>Undo</strong> on that file — it removes everything that file added. Anything you've changed since then is kept as it is.
        </p>
      </GuideSection>

      <GuideSection id="ai" title="5. About the AI reading">
        <p>
          With your consent, files are read with AI for better accuracy, including photos and PDFs. Without it, a simple built-in reader handles plain text lists and tables, and photos and PDFs wait for you to add them manually. See the <a href="/legal/privacy">Privacy Policy</a> for exactly how this data is used.
        </p>
      </GuideSection>
    </GuideArticle>
  );
}
