// rss.js — Expanded RSS feeds + full article content fetching — FIXED
// Run: node rss.js
// Dependencies: npm install rss-parser axios cheerio

const RSSParser = require('rss-parser');
const axios     = require('axios');
const cheerio   = require('cheerio');

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; LinkedFlowBot/1.0; +https://linkedflow-ai-rss.vercel.app)',
  },
});

// ── RSS FEEDS ─────────────────────────────────────────────────────────────────
// FIX: Removed dead/unreliable feeds. Verified working feeds kept.
// FIX: Added priority flag — high priority feeds tried first
const RSS_FEEDS = [
  // ── AI & Machine Learning (highest signal) ──
  { url: 'https://openai.com/news/rss',                                      label: 'OpenAI Blog',             priority: 1 },
  { url: 'https://www.deepmind.com/blog/rss.xml',                            label: 'DeepMind Blog',           priority: 1 },
  { url: 'https://huggingface.co/blog/feed.xml',                             label: 'Hugging Face Blog',       priority: 1 },
  { url: 'https://www.anthropic.com/news/rss',                               label: 'Anthropic News',          priority: 1 },
  { url: 'https://paperswithcode.com/latest.rss',                            label: 'Papers With Code',        priority: 1 },
  { url: 'https://blogs.microsoft.com/ai/feed/',                             label: 'Microsoft AI Blog',       priority: 1 },
  { url: 'https://ai.googleblog.com/feeds/posts/default?alt=rss',            label: 'Google AI Blog',          priority: 1 },

  // ── Tech & Startups ──
  { url: 'https://techcrunch.com/feed/',                                     label: 'TechCrunch',              priority: 2 },
  { url: 'https://www.theverge.com/rss/index.xml',                           label: 'The Verge',               priority: 2 },
  { url: 'https://feeds.arstechnica.com/arstechnica/index',                  label: 'Ars Technica',            priority: 2 },
  { url: 'https://www.wired.com/feed/rss',                                   label: 'Wired',                   priority: 2 },
  { url: 'https://www.technologyreview.com/feed/',                           label: 'MIT Technology Review',   priority: 1 },
  { url: 'https://venturebeat.com/feed/',                                    label: 'VentureBeat',             priority: 2 },
  { url: 'https://news.ycombinator.com/rss',                                 label: 'Hacker News',             priority: 2 },

  // ── Developer & Engineering ──
  { url: 'https://dev.to/feed',                                              label: 'DEV.to',                  priority: 2 },
  { url: 'https://stackoverflow.blog/feed/',                                 label: 'Stack Overflow Blog',     priority: 2 },
  { url: 'https://engineering.fb.com/feed/',                                 label: 'Meta Engineering',        priority: 2 },
  { url: 'https://netflixtechblog.com/feed',                                 label: 'Netflix Tech Blog',       priority: 2 },
  { url: 'https://aws.amazon.com/blogs/aws/feed/',                           label: 'AWS Blog',                priority: 2 },

  // ── Business & Leadership ──
  { url: 'https://hbr.org/feed',                                             label: 'Harvard Business Review', priority: 2 },
  { url: 'https://www.inc.com/rss/',                                         label: 'Inc Magazine',            priority: 3 },
  { url: 'https://www.forbes.com/innovation/feed2/',                         label: 'Forbes Innovation',       priority: 3 },

  // ── Product & Design ──
  { url: 'https://www.nngroup.com/feed/rss/',                                label: 'Nielsen Norman Group',    priority: 3 },
  { url: 'https://medium.com/feed/tag/product-management',                   label: 'Medium – Product',        priority: 3 },

  // ── India / Regional ──
  { url: 'https://yourstory.com/feed',                                       label: 'YourStory',               priority: 3 },
  { url: 'https://www.inc42.com/feed/',                                      label: 'Inc42',                   priority: 3 },
  { url: 'https://entrackr.com/feed/',                                       label: 'Entrackr',                priority: 3 },

  // ── Cybersecurity ──
  { url: 'https://krebsonsecurity.com/feed/',                                label: 'Krebs on Security',       priority: 3 },
  { url: 'https://feeds.feedburner.com/TheHackersNews',                      label: 'The Hacker News',         priority: 3 },

  // ── Finance & Fintech ──
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',                  label: 'CoinDesk',                priority: 3 },
  { url: 'https://www.finextra.com/rss/headlines.aspx',                      label: 'Finextra',                priority: 3 },
];

// ── FULL CONTENT FETCHER ──────────────────────────────────────────────────────
async function fetchFullContent(articleUrl) {
  try {
    const { data: html } = await axios.get(articleUrl, {
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
        'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, header, footer, aside, .sidebar, .ads, .advertisement, .cookie-banner, .popup, [class*="related"], [class*="newsletter"], [class*="subscribe"]').remove();

    // Try article selectors in priority order
    const selectors = [
      'article',
      '[class*="article-body"]',
      '[class*="post-body"]',
      '[class*="entry-content"]',
      '[class*="story-body"]',
      '[class*="article-content"]',
      '[class*="post-content"]',
      'main',
      '.content',
      '#content',
    ];

    let content = '';
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        content = el
          .find('p')
          .map((_, p) => $(p).text().trim())
          .get()
          .filter(t => t.length > 30)
          .join('\n\n');
        if (content.length > 300) break;
      }
    }

    // Last resort: all paragraphs
    if (!content || content.length < 200) {
      content = $('p')
        .map((_, p) => $(p).text().trim())
        .get()
        .filter(t => t.length > 40)
        .join('\n\n');
    }

    // FIX: Cap at 5000 chars (was 4000) — gives Claude more context
    // Better content = better posts
    return content.slice(0, 5000).trim() || null;

  } catch (err) {
    console.warn(`  ⚠ Full content fetch failed for ${articleUrl}: ${err.message}`);
    return null;
  }
}

// ── SPAM / LOW QUALITY FILTER ─────────────────────────────────────────────────
// FIX: Pre-filter obvious junk before sending to Claude API
// Saves API calls + improves post quality
function isLowQuality(title, summary) {
  const text = (title + ' ' + summary).toLowerCase();

  const spamWords = [
    'sponsored', 'advertisement', 'buy now', 'click here',
    'limited time', 'coupon', 'discount', 'giveaway', 'prize',
    'promo code', 'flash sale', 'free offer', 'act now',
    'win a', 'you won', 'congratulations you',
  ];

  for (const word of spamWords) {
    if (text.includes(word)) return true;
  }

  // Too short to be meaningful
  if (summary.length < 50) return true;

  return false;
}

// ── MAIN FETCH FUNCTION ───────────────────────────────────────────────────────
/**
 * Returns enriched article objects:
 * { title, link, summary, fullContent, pubDate, feedLabel }
 *
 * FIX: Now sorts by priority (1 = highest) so best feeds are tried first by post.js
 *
 * @param {number}  maxPerFeed      Max articles per feed (default 2)
 * @param {boolean} getFullContent  Whether to scrape full article body (default true)
 */
async function fetchAllFeeds(maxPerFeed = 2, getFullContent = true) {
  const allArticles = [];

  // FIX: Sort feeds by priority — high signal feeds processed first
  const sortedFeeds = [...RSS_FEEDS].sort((a, b) => (a.priority || 3) - (b.priority || 3));

  for (const feed of sortedFeeds) {
    try {
      console.log(`📡 ${feed.label}`);
      const parsed = await parser.parseURL(feed.url);
      const items  = (parsed.items || []).slice(0, maxPerFeed);

      for (const item of items) {
        const summary =
          item.contentSnippet ||
          item.summary        ||
          item.content        ||
          item.description    ||
          '';

        // FIX: Pre-filter junk before fetching full content (saves time + API calls)
        if (isLowQuality(item.title || '', summary)) {
          console.log(`  ⏭ Skipped (low quality): ${item.title?.slice(0, 50)}`);
          continue;
        }

        let fullContent = null;
        if (getFullContent && item.link) {
          console.log(`  📄 ${item.title?.slice(0, 55)}...`);
          fullContent = await fetchFullContent(item.link);
        }

        allArticles.push({
          title:       item.title || 'Untitled',
          link:        item.link  || '',
          pubDate:     item.pubDate || item.isoDate || '',
          feedLabel:   feed.label,
          summary:     summary.slice(0, 800),
          // FIX: fallback chain — fullContent > summary > title
          fullContent: fullContent || summary.slice(0, 800) || item.title || '',
        });
      }

    } catch (err) {
      // FIX: show cleaner error, don't crash the whole run
      console.error(`  ✗ ${feed.label}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total articles collected: ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAllFeeds };
