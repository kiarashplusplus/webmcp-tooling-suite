-- WebMCP Directory Database Schema
-- Cloudflare D1 (SQLite-compatible)

-- Main feeds table
CREATE TABLE IF NOT EXISTS feeds (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  title TEXT,
  description TEXT,
  feed_type TEXT DEFAULT 'mcp',
  capabilities_count INTEGER DEFAULT 0,
  version TEXT,
  score INTEGER,
  signature_valid INTEGER DEFAULT 0,  -- SQLite uses INTEGER for boolean
  submitted_by TEXT,
  submitted_at INTEGER NOT NULL,
  last_validated INTEGER,
  is_curated INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_feeds_domain ON feeds(domain);
CREATE INDEX IF NOT EXISTS idx_feeds_submitted_at ON feeds(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_score ON feeds(score DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_is_active ON feeds(is_active);
CREATE INDEX IF NOT EXISTS idx_feeds_is_curated ON feeds(is_curated);

-- Seed with curated feeds (scores are NULL - validate to get real score)
INSERT OR IGNORE INTO feeds (id, url, domain, title, description, feed_type, capabilities_count, score, signature_valid, submitted_by, submitted_at, is_curated, is_active)
VALUES 
  ('25x-codes', 'https://25x.codes/.well-known/mcp.llmfeed.json', '25x.codes', '25x.codes', 'AI-powered development tools and services', 'mcp', 5, NULL, 0, 'system', 1733318400000, 1, 1),
  ('wellknownmcp-org', 'https://wellknownmcp.org/.well-known/mcp.llmfeed.json', 'wellknownmcp.org', 'WellKnownMCP', 'The WebMCP specification and reference implementation', 'mcp', 3, NULL, 1, 'system', 1733318400000, 1, 1),
  ('llmca-org', 'https://llmca.org/.well-known/mcp.llmfeed.json', 'llmca.org', 'LLMCA', 'LLM Certification Authority - Trust infrastructure for AI agents', 'mcp', 4, NULL, 1, 'system', 1733318400000, 1, 1),
  ('wellknownmcp-llm-index', 'https://wellknownmcp.org/.well-known/llm-index.llmfeed.json', 'wellknownmcp.org', 'LLM Index', 'Curated index of LLMFeed-enabled sites', 'llm-index', 0, NULL, 0, 'system', 1733318400000, 1, 1);
