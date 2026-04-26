// rss.js — Expanded RSS feeds + full article content fetching
// Run: node rss.js
// Dependencies: npm install rss-parser axios cheerio

const RSSParser = require("rss-parser");
const axios = require("axios");
const cheerio = require("cheerio");

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; LinkedFlowBot/1.0; +https://linkedflow-ai-rss.vercel.app)",
  },
});

// ─────────────────────────────────────────────
// RSS FEED LIST — Organized by category
// ─────────────────────────────────────────────
const RSS_FEEDS = [
  // ── AI & Machine Learning ──
  { url: "https://openai.com/news/rss", label: "OpenAI Blog" },
  { url: "https://www.deepmind.com/blog/rss.xml", label: "DeepMind Blog" },
  { url: "https://blogs.microsoft.com/ai/feed/", label: "Microsoft AI Blog" },
  { url: "https://ai.googleblog.com/feeds/posts/default?alt=rss", label: "Google AI Blog" },
  { url: "https://huggingface.co/blog/feed.xml", label: "Hugging Face Blog" },
  { url: "https://www.anthropic.com/news/rss", label: "Anthropic News" },
  { url: "https://towardsdatascience.com/feed", label: "Towards Data Science" },
  { url: "https://machinelearningmastery.com/feed/", label: "ML Mastery" },
  { url: "https://distill.pub/rss.xml", label: "Distill" },
  { url: "https://paperswithcode.com/latest.rss", label: "Papers With Code" },

  // ── Tech & Startups ──
  { url: "https://techcrunch.com/feed/", label: "TechCrunch" },
  { url: "https://www.theverge.com/rss/index.xml", label: "The Verge" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", label: "Ars Technica" },
  { url: "https://www.wired.com/feed/rss", label: "Wired" },
  { url: "https://www.technologyreview.com/feed/", label: "MIT Technology Review" },
  { url: "https://spectrum.ieee.org/feeds/feed.rss", label: "IEEE Spectrum" },
  { url: "https://venturebeat.com/feed/", label: "VentureBeat" },
  { url: "https://www.fastcompany.com/latest/rss", label: "Fast Company" },
  { url: "https://www.infoq.com/rss/technology/", label: "InfoQ Tech" },
  { url: "https://news.ycombinator.com/rss", label: "Hacker News" },

  // ── Product & Design ──
  { url: "https://www.producthunt.com/feed", label: "Product Hunt" },
  { url: "https://uxdesign.cc/feed", label: "UX Design" },
  { url: "https://medium.com/feed/tag/product-management", label: "Medium – Product" },
  { url: "https://www.nngroup.com/feed/rss/", label: "Nielsen Norman Group" },
  { url: "https://www.smashingmagazine.com/feed/", label: "Smashing Magazine" },

  // ── Business & Leadership ──
  { url: "https://hbr.org/feed", label: "Harvard Business Review" },
  { url: "https://feeds.feedburner.com/entrepreneur/latest", label: "Entrepreneur" },
  { url: "https://www.inc.com/rss/", label: "Inc Magazine" },
  { url: "https://feeds.feedburner.com/FastCompany", label: "Fast Company Alt" },
  { url: "https://www.forbes.com/innovation/feed2/", label: "Forbes Innovation" },

  // ── Cybersecurity ──
  { url: "https://krebsonsecurity.com/feed/", label: "Krebs on Security" },
  { url: "https://www.darkreading.com/rss.xml", label: "Dark Reading" },
  { url: "https://feeds.feedburner.com/TheHackersNews", label: "The Hacker News" },
  { url: "https://www.schneier.com/feed/atom/", label: "Schneier on Security" },

  // ── Finance & Fintech ──
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", label: "CoinDesk" },
  { url: "https://feeds.bloomberg.com/technology/news.rss", label: "Bloomberg Tech" },
  { url: "https://www.finextra.com/rss/headlines.aspx", label: "Finextra" },

  // ── Developer / Engineering ──
  { url: "https://dev.to/feed", label: "DEV.to" },
  { url: "https://stackoverflow.blog/feed/", label: "Stack Overflow Blog" },
  { url: "https://engineering.fb.com/feed/", label: "Meta Engineering" },
  { url: "https://netflixtechblog.com/feed", label: "Netflix Tech Blog" },
  { url: "https://aws.amazon.com/blogs/aws/feed/", label: "AWS Blog" },
  { url: "https://cloud.google.com/blog/rss", label: "Google Cloud Blog" },

  // ── India / Regional ──
  { url: "https://yourstory.com/feed", label: "YourStory" },
  { url: "https://entrackr.com/feed/", label: "Entrackr" },
  { url: "https://www.inc42.com/feed/", label: "Inc42" },
];

// ─────────────────────────────────────────────
// FULL CONTENT FETCHER
// Attempts to scrape the full article body from the article URL.
// Falls back to the RSS summary if scraping fails.
// ─────────────────────────────────────────────
async function fetchFullContent(articleUrl) {
  try {
    const { data: html } = await axios.get(articleUrl, {
      timeout: 12000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(html);

    // Remove clutter
    $("script, style, nav, header, footer, aside, .sidebar, .ads, .advertisement, .cookie-banner, .popup").remove();

    // Try common article selectors in priority order
    const selectors = [
      "article",
      '[class*="article-body"]',
      '[class*="post-body"]',
      '[class*="entry-content"]',
      '[class*="story-body"]',
      '[class*="article-content"]',
      "main",
      ".content",
      "#content",
    ];

    let content = "";
    for (const sel of selectors) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        content = el
          .find("p")
          .map((_, p) => $(p).text().trim())
          .get()
          .filter((t) => t.length > 30)
          .join("\n\n");
        break;
      }
    }

    // Last resort: grab all paragraphs
    if (!content || content.length < 200) {
      content = $("p")
        .map((_, p) => $(p).text().trim())
        .get()
        .filter((t) => t.length > 40)
        .join("\n\n");
    }

    // Cap at ~4000 chars to avoid overwhelming Claude
    return content.slice(0, 4000).trim() || null;
  } catch (err) {
    console.warn(`  ⚠ Full content fetch failed for ${articleUrl}: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────
// MAIN — Fetch all feeds, return enriched items
// ─────────────────────────────────────────────

/**
 * Returns an array of article objects:
 * {
 *   title, link, summary, fullContent, pubDate, feedLabel
 * }
 *
 * @param {number} maxPerFeed   Max articles to pull per feed (default 2)
 * @param {boolean} getFullContent  Whether to scrape full article body (default true)
 */
async function fetchAllFeeds(maxPerFeed = 2, getFullContent = true) {
  const allArticles = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`📡 Fetching: ${feed.label}`);
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, maxPerFeed);

      for (const item of items) {
        const summary =
          item.contentSnippet ||
          item.summary ||
          item.content ||
          item.description ||
          "";

        let fullContent = null;
        if (getFullContent && item.link) {
          console.log(`  🔍 Fetching full article: ${item.title?.slice(0, 60)}...`);
          fullContent = await fetchFullContent(item.link);
        }

        allArticles.push({
          title: item.title || "Untitled",
          link: item.link || "",
          pubDate: item.pubDate || item.isoDate || "",
          feedLabel: feed.label,
          // fullContent is preferred; fall back to RSS summary
          summary: summary.slice(0, 800),
          fullContent: fullContent || summary.slice(0, 800),
        });
      }
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${feed.label}: ${err.message}`);
    }
  }

  console.log(`\n✅ Total articles collected: ${allArticles.length}`);
  return allArticles;
}

module.exports = { fetchAllFeeds };
