// post.js — LinkedIn Auto Post (Gemini API powered)
require('dotenv').config();
const https   = require('https');
const axios   = require('axios');
const { fetchAllFeeds } = require('./rss');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN = process.env.LI_TOKEN;
const LI_URN   = process.env.LI_URN || 'urn:li:person:1772788136593';

// ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a professional LinkedIn content creator known for writing posts that feel human, specific, and scroll-stopping.

Your job is a 3-step pipeline:

STEP 1 — FILTER
Score the article 1-10:
- Does it have a real insight, data point, or argument? (not just a headline)
- Would a professional stop scrolling for this?
- Is it specific, not generic?
If score is below 6, respond with exactly: SKIP

STEP 2 — EXTRACT (internal, don't show)
Pull out from the article:
- The core argument or finding (1 sentence)
- 1-2 specific facts, numbers, or examples from the content
- The "so what" — why does this matter right now?

STEP 3 — WRITE THE POST
Using what you extracted, write a LinkedIn post:
- Hook: First line must be specific and surprising
- Body: Use the ACTUAL facts/examples from the article
- Structure: Hook → Key insight → Your angle → Takeaway
- Short paragraphs, 2-3 lines max
- End with ONE simple question as CTA
- 3-5 relevant hashtags at the bottom
- 150-250 words total
- Do NOT start with "I"
- Do NOT mention the source or article title in the body

Return ONLY the final post text. No preamble. No label. Just the post.`;

// ── GENERATE POST VIA GEMINI API ──────────────────────────────────────────────
async function generatePost(article) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  GEMINI_API_KEY not set in .env');
    return `${article.title}\n\n${article.fullContent.slice(0, 500)}\n\n#AI #Tech #Innovation`;
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = SYSTEM_PROMPT + `\n\nArticle to process:
Title: ${article.title}
Source: ${article.feedLabel}
Published: ${article.pubDate}

Full Article Content:
${article.fullContent}

Follow the 3-step pipeline. If score < 6, respond with SKIP. Otherwise return only the final LinkedIn post.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return text;
  } catch (err) {
    throw new Error(`Gemini API failed: ${err.message}`);
  }
}

// ── POST TO LINKEDIN ──────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) {
      console.log('\n⚠️  LI_TOKEN not set — post printed above but NOT sent to LinkedIn.');
      resolve({ skipped: true });
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
        'Authorization':             `Bearer ${LI_TOKEN}`,
        'Content-Type':              'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Length':            Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) resolve({ success: true });
        else reject(new Error(`LinkedIn API error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 LinkedIn Auto Post starting...');
  console.log(`📅 Date: ${new Date().toISOString()}`);

  console.log('\n🔑 Config check:');
  console.log(`   GEMINI_API_KEY : ${process.env.GEMINI_API_KEY ? '✅ set' : '❌ MISSING'}`);
  console.log(`   LI_TOKEN       : ${LI_TOKEN ? '✅ set' : '⚠️  not set'}`);
  console.log(`   LI_URN         : ${LI_URN}`);

  console.log('\n📡 Fetching articles from RSS feeds...');
  let feeds = [];
  try {
    feeds = await fetchAllFeeds(2, true);
  } catch (err) {
    console.error('❌ RSS fetch failed:', err.message);
    process.exit(1);
  }

  if (!feeds.length) {
    console.error('❌ No articles fetched.');
    process.exit(1);
  }
  console.log(`✅ ${feeds.length} articles fetched.\n`);

  let postText    = null;
  let usedArticle = null;

  const dayOfWeek = new Date().getDay();
  const hourOfDay = new Date().getHours();
  const startIdx  = (dayOfWeek * 2 + (hourOfDay > 12 ? 1 : 0)) % feeds.length;

  for (let i = 0; i < feeds.length; i++) {
    const idx     = (startIdx + i) % feeds.length;
    const article = feeds[idx];

    console.log(`\n🔍 Trying [${i + 1}/${feeds.length}]: ${article.title.slice(0, 70)}`);
    console.log(`   Source : ${article.feedLabel}`);

    try {
      const result = await generatePost(article);
      if (result.trim().toUpperCase() === 'SKIP') {
        console.log('   ⏭️  Low quality — skipping.');
        continue;
      }
      postText    = result;
      usedArticle = article;
      break;
    } catch (err) {
      console.error(`   ✗ ${err.message}`);
      continue;
    }
  }

  if (!postText) {
    console.error('\n❌ No articles passed quality filter.');
    process.exit(1);
  }

  console.log(`\n✅ Post generated from: ${usedArticle.feedLabel}`);
  console.log('\n📝 FINAL POST:');
  console.log('═'.repeat(60));
  console.log(postText);
  console.log('═'.repeat(60));

  try {
    const result = await postToLinkedIn(postText);
    if (!result.skipped) {
      console.log('\n✅ Posted to LinkedIn successfully!');
    }
  } catch (err) {
    console.error('\n❌ LinkedIn post failed:', err.message);
    process.exit(1);
  }
}

main();
