-- Migration: Add gist URL columns to feeds table
-- Run with: wrangler d1 execute webmcp-directory --file=./migrations/001_add_gist_urls.sql

ALTER TABLE feeds ADD COLUMN gist_raw_url TEXT;
ALTER TABLE feeds ADD COLUMN gist_html_url TEXT;
