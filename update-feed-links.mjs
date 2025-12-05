#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const API_URL = 'https://webmcp-directory.the-safe.workers.dev/api/feeds/index-html';

async function main() {
  try {
    console.log('Fetching feeds from directory API...');
    const response = await fetch(API_URL);
    const data = await response.json();
    
    if (!data.feeds || data.feeds.length === 0) {
      console.warn('No feeds found, skipping update');
      return;
    }
    
    console.log(`Found ${data.feeds.length} feeds`);
    
    const html = readFileSync('index.html', 'utf-8');
    
    // Generate link elements
    const linkElements = data.feeds.map(feed => 
      `    <link rel="feed" type="application/json" href="${feed.url}" 
          data-feed-json-url="${feed.url}" 
          data-feed-type="${feed.feed_type}" 
          data-feed-domain="${feed.domain}" 
          title="${escapeHtml(feed.title || feed.domain)}" />`
    ).join('\n');
    
    // Replace between markers
    const linkStart = '<!-- FEED_LINKS_START -->';
    const linkEnd = '<!-- FEED_LINKS_END -->';
    
    let updated = html;
    if (html.includes(linkStart) && html.includes(linkEnd)) {
      const before = html.substring(0, html.indexOf(linkStart) + linkStart.length);
      const after = html.substring(html.indexOf(linkEnd));
      updated = before + '\n' + linkElements + '\n    ' + after;
    } else {
      console.warn('Feed link markers not found in index.html');
    }
    
    writeFileSync('index.html', updated);
    console.log(`✓ Updated index.html with ${data.feeds.length} feeds`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

main();
