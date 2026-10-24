import type { Metadata } from 'next';
import { Example, G, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Home: Households, Lists, Inventory & Budget' };

export default function Home() {
  return (
    <GuideArticle
      title="Home: Households, Lists, Inventory & Budget"
      summary={
        <p>
          A household is a shared space for the people you live with — chores, shopping lists, appliances and a monthly budget. Being in a household never shares your personal tasks or calendar; only what you put in the household itself.
        </p>
      }
    >
      <GuideSection id="households" title="1. Households">
        <Example title="Setting up for your flat">
          <ol>
            <li>Open <strong>Households</strong> and create one, e.g. "Our Flat".</li>
            <li>Invite your flatmates or family by phone or email. Each invite link works once, for that person only.</li>
            <li>Anyone in the household can add shared lists, chores and announcements.</li>
          </ol>
        </Example>
        <p>
          If you leave, you lose access to its lists and chores, but nothing you shared elsewhere is affected. Deleting a household removes its shared lists, chores and announcements for everyone.
        </p>
      </GuideSection>

      <GuideSection id="lists" title="2. Shopping lists">
        <p>Shared, real-time lists for groceries and shopping — add an item from anywhere, and it's there when someone's at the shop.</p>
        <Example title="A weekly grocery run">
          <p>Create a list "Weekly groceries", add items as you think of them during the week, and tick them off as they're bought. Archive the list once it's done, or keep it running.</p>
        </Example>
      </GuideSection>

      <GuideSection id="inventory" title="3. Home inventory">
        <p>Track appliances and fittings with their warranty dates, so you get a reminder before a warranty expires or a service is due.</p>
        <Example title="A new refrigerator">
          <p>Add it with the purchase date and warranty length. LifeSphere reminds you a few days before the warranty runs out. Add a maintenance schedule, e.g. "Service every 6 months", and log what was done each time.</p>
        </Example>
      </GuideSection>

      <GuideSection id="budgets" title="4. Budget">
        <p>A simple monthly plan you fill in yourself — LifeSphere doesn't connect to your bank or read statements. Set a planned amount per category and record what you actually spent.</p>
        <Example title="Planning this month">
          <p>Set "Groceries: ₹12,000", "Electricity: ₹2,500" and so on for the month. As bills come in, add what you spent in each category and see what's left.</p>
        </Example>
        <p>The Smart inbox can also read a budget spreadsheet you drop into its "Home - Budget" folder — see <G slug="documents" />.</p>
      </GuideSection>
    </GuideArticle>
  );
}
