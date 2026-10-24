import type { Metadata } from 'next';
import { Example, GuideArticle, GuideSection } from '@/components/guide';

export const metadata: Metadata = { title: 'Community & Civic Issues' };

export default function Community() {
  return (
    <GuideArticle
      title="Community & Civic Issues"
      summary={
        <p>
          Groups for your building, colony or interests, and a place to keep a record of local problems like a broken streetlight or an overflowing bin, along with the complaint reference number once you report it.
        </p>
      }
    >
      <GuideSection id="groups" title="1. Community groups">
        <p>Join a group for your area to see posts from neighbours — announcements, events, recommendations, and lost-and-found. You decide how visible you are: your name can be hidden from public member lists while you still post.</p>
        <Example title="Your apartment block's group">
          <ol>
            <li>Search for or ask to join your building's group — private groups require the admin to approve you.</li>
            <li>Post an announcement, e.g. "Water supply off 2–4 PM tomorrow", or a recommendation for a good electrician nearby.</li>
            <li>React or comment on others' posts.</li>
          </ol>
        </Example>
        <p>Posts that break the group's rules can be hidden or removed by a moderator, with a reason you can see and appeal. Reports are confidential — nobody is told who reported them.</p>
      </GuideSection>

      <GuideSection id="blocking" title="2. Blocking and reporting">
        <p>If someone is bothering you in a group, block them — you stop seeing each other's posts and comments, and they can't contact you. Report content that breaks the rules using Report on the post.</p>
      </GuideSection>

      <GuideSection id="civic" title="3. Civic issues">
        <p>Keep your own record of a local problem — a pothole, a broken streetlight, uncollected garbage — with a photo and location landmark (not a home address), separate from, and before, reporting it officially.</p>
        <Example title="A broken streetlight">
          <ol>
            <li>Open <strong>Civic issues</strong> and record it: what's wrong, a landmark like "near the market gate", and a photo if you have one.</li>
            <li>LifeSphere shows where to report it officially for your area.</li>
            <li>After you report it on the official channel, save the complaint number you're given, so you can track and follow up on it.</li>
            <li>Optionally share it with your neighbourhood group, so others affected know it's already been reported.</li>
          </ol>
        </Example>
      </GuideSection>
    </GuideArticle>
  );
}
