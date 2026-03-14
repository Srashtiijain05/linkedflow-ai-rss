// LinkedIn Auto Post Script
// Runs via GitHub Actions — no browser needed!

const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN = process.env.LI_TOKEN;
const LI_URN   = process.env.LI_URN   || 'urn:li:person:1772788136593';
const FEED_KEY = process.env.FEED_KEY  || 'tech';

// ── ARTICLE BANK ─────────────────────────────────────────────────────────────
// Rotates daily so posts stay fresh
const ARTICLES = [
  { title: "AI Is Transforming How Businesses Operate in 2026", desc: "73% of enterprises have integrated AI into core workflows, with productivity gains averaging 34% across knowledge workers." },
  { title: "The Skills That Will Matter Most in the Age of AI", desc: "Critical thinking, creativity, and emotional intelligence are the most valuable skills as AI automates routine cognitive tasks." },
  { title: "Why Most Digital Transformations Fail — And How to Fix Yours", desc: "McKinsey reveals 70% of digital transformation initiatives fall short. The key differentiator is leadership alignment, not technology." },
  { title: "The Future of Remote Work: What Leaders Need to Know", desc: "Organizations embracing async-first culture see 28% better retention and significantly higher employee satisfaction." },
  { title: "How Top Startups Are Building Products Users Love", desc: "The most successful startups share one trait: obsessive focus on solving a real problem for a specific user before scaling." },
  { title: "Leadership in Uncertain Times: What the Data Shows", desc: "Transparent communication and psychological safety are the top predictors of team performance across 500 companies." },
  { title: "The Real ROI of Investing in Employee Development", desc: "Companies that invest in learning see 24% higher profit margins and significantly lower turnover than industry peers." },
  { title: "How AI Is Changing the Way We Make Decisions", desc: "Leaders who use AI as a thinking partner — not a replacement — are making faster, more accurate strategic decisions." },
  { title: "Building a Personal Brand That Opens Doors", desc: "Professionals with a strong LinkedIn presence receive 3x more inbound opportunities than those without one." },
  { title: "The Hidden Cost of Meetings Nobody Talks About", desc: "The average knowledge worker spends 31 hours per month in unproductive meetings — that's almost a full work week." },
  { title: "Why Curiosity Is the Most Underrated Leadership Skill", desc: "Leaders who ask more questions than they answer create teams that are 40% more innovative and engaged." },
  { title: "The Data-Driven Case for Work-Life Balance", desc: "Employees who take regular breaks are 30% more productive. Hustle culture is costing companies more than they realize." },
  { title: "How to Build a Network That Actually Helps Your Career", desc: "Quality over quantity — 10 strong relationships outperform 1000 weak connections when it comes to career growth." },
  { title: "What the Best Managers Do Differently", desc: "Great managers don't just set goals — they remove obstacles, provide context, and make their team feel genuinely valued." },
];

// ── POST STYLES ──────────────────────────────────────────────────────────────
const STYLES = ['authority', 'educational', 'opinion'];

// Pick based on day of week so it varies
const dayOfWeek = new Date().getDay();
const hourOfDay = new Date().getHours();
const style = STYLES[dayOfWeek % STYLES.length];

// Pick article based on day + hour to avoid repeating
const articleIdx = (dayOfWeek * 2 + (hourOfDay > 12 ? 1 : 0)) % ARTICLES.length;
const article = ARTICLES[articleIdx];

// ── GENERATE POST ────────────────────────────────────────────────────────────
function generatePost(article, style) {
  const { title, desc } = article;

  const hooks = {
    authority:   "Most people don't know this yet — here is a quick breakdown:",
    educational: "I studied this for weeks so you don't have to. Here's what I found:",
    opinion:     "Hot take: the conventional wisdom here is completely wrong.",
  };

  const hashtags = {
    tech:       "#Tech #Innovation #DigitalTransformation #FutureOfWork #AI",
    ai:         "#AI #ArtificialIntelligence #MachineLearning #GenAI #FutureOfTech",
    leadership: "#Leadership #Management #BusinessStrategy #ProfessionalGrowth",
    business:   "#Business #Entrepreneurship #Leadership #Innovation #Success",
  };

  const tags = hashtags[FEED_KEY] || hashtags.tech;

  const post = `${hooks[style]}

${title}

${desc}

The professionals who thrive won't be the ones who worked harder. They'll be the ones who understood this shift first.

What's your take on this?

${tags}`;

  return post;
}

// ── POST TO LINKEDIN ─────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) {
      reject(new Error('LI_TOKEN secret not set! Go to GitHub → Settings → Secrets → New secret'));
      return;
    }

    const body = JSON.stringify({
      author: LI_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    });

    const options = {
      hostname: 'api.linkedin.com',
      path:     '/v2/ugcPosts',
      method:   'POST',
      headers: {
        'Authorization':              `Bearer ${LI_TOKEN}`,
        'Content-Type':               'application/json',
        'X-Restli-Protocol-Version':  '2.0.0',
        'Content-Length':             Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          resolve({ success: true, status: res.statusCode, data });
        } else {
          reject(new Error(`LinkedIn API error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 LinkedIn Auto Post starting...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📰 Article: ${article.title}`);
  console.log(`🎨 Style: ${style}`);
  console.log(`👤 URN: ${LI_URN}`);

  const postText = generatePost(article, style);
  console.log('\n📝 Post preview:');
  console.log('─'.repeat(50));
  console.log(postText);
  console.log('─'.repeat(50));

  try {
    const result = await postToLinkedIn(postText);
    console.log('\n✅ Posted successfully!', result);
  } catch (err) {
    console.error('\n❌ Failed to post:', err.message);
    process.exit(1);
  }
}

main();
