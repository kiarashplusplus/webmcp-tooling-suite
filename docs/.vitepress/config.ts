import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'WebMCP Tooling Suite',
  description: 'The Complete Toolkit for MCP-Ready Feed Discovery, Validation & Trust',

  base: '/webmcp-tooling-suite/docs/',

  // Ignore dead links for pages not yet created
  ignoreDeadLinks: [
    /\/packages\/validator\/(installation|usage|cli)/,
    /\/packages\/signer\/(installation|key-management|signing)/,
    /\/packages\/health-monitor\/(installation|crawling|reports)/,
  ],

  head: [
    ['link', { rel: 'icon', href: '/webmcp-tooling-suite/docs/favicon.svg', type: 'image/svg+xml' }],
    ['link', { rel: 'canonical', href: 'https://kiarashplusplus.github.io/webmcp-tooling-suite/docs/' }],
    ['meta', { name: 'theme-color', content: '#7c3aed' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:site_name', content: 'WebMCP Tooling Suite Documentation' }],
    ['meta', { name: 'og:title', content: 'WebMCP Tooling Suite - MCP Feed Ecosystem Tools for AI Agents' }],
    ['meta', { name: 'og:description', content: 'Complete toolkit for LLMFeed JSON and llms.txt: validator, signer, health monitor, and parser. Ed25519 signatures, RAG utilities, and GitHub Actions for AI agent integrations.' }],
    ['meta', { name: 'og:image', content: 'https://kiarashplusplus.github.io/webmcp-tooling-suite/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'WebMCP Tooling Suite - MCP Feed Ecosystem Tools' }],
    ['meta', { name: 'twitter:description', content: 'Validate, sign, and monitor LLMFeed JSON & llms.txt feeds for AI agent integrations.' }],
    ['meta', { name: 'keywords', content: 'MCP, Model Context Protocol, LLMFeed, llms.txt, llmstxt, AI agents, feed validation, Ed25519 signing, llmfeed.json, WebMCP, RAG, vector database' }],
    ['meta', { name: 'author', content: 'Kiarash Adl' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Packages', link: '/packages/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Playground', link: 'https://kiarashplusplus.github.io/webmcp-tooling-suite/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is WebMCP?', link: '/guide/' },
            { text: 'Why MCP Matters', link: '/guide/why-mcp' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Feed Structure', link: '/guide/feed-structure' },
            { text: 'Trust & Signatures', link: '/guide/trust-signatures' },
            { text: 'Capabilities', link: '/guide/capabilities' },
            { text: 'Discovery', link: '/guide/discovery' },
          ]
        },
        {
          text: 'Workflows',
          items: [
            { text: 'Publishing a Feed', link: '/guide/publishing' },
            { text: 'Validating Feeds', link: '/guide/validating' },
            { text: 'Monitoring Health', link: '/guide/monitoring' },
            { text: 'CI/CD Integration', link: '/guide/ci-cd' },
          ]
        }
      ],
      '/packages/': [
        {
          text: 'Packages Overview',
          items: [
            { text: 'Introduction', link: '/packages/' },
          ]
        },
        {
          text: '@25xcodes/llmfeed-validator',
          items: [
            { text: 'Overview', link: '/packages/validator/' },
            { text: 'Installation', link: '/packages/validator/installation' },
            { text: 'Usage', link: '/packages/validator/usage' },
            { text: 'CLI Reference', link: '/packages/validator/cli' },
          ]
        },
        {
          text: '@25xcodes/llmfeed-signer',
          items: [
            { text: 'Overview', link: '/packages/signer/' },
            { text: 'Installation', link: '/packages/signer/installation' },
            { text: 'Key Management', link: '/packages/signer/key-management' },
            { text: 'Signing Feeds', link: '/packages/signer/signing' },
          ]
        },
        {
          text: '@25xcodes/llmfeed-health-monitor',
          items: [
            { text: 'Overview', link: '/packages/health-monitor/' },
            { text: 'Installation', link: '/packages/health-monitor/installation' },
            { text: 'Crawling', link: '/packages/health-monitor/crawling' },
            { text: 'Reports', link: '/packages/health-monitor/reports' },
          ]
        },
        {
          text: '@25xcodes/llmfeed-action',
          items: [
            { text: 'GitHub Action', link: '/packages/github-action/' },
          ]
        },
        {
          text: '@25xcodes/llmstxt-parser',
          items: [
            { text: 'Overview', link: '/packages/llmstxt-parser/' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Validator API', link: '/api/validator' },
            { text: 'Signer API', link: '/api/signer' },
            { text: 'Health Monitor API', link: '/api/health-monitor' },
            { text: 'LLMS.txt Parser API', link: '/api/llmstxt-parser' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kiarashplusplus/webmcp-tooling-suite' },
      { icon: 'npm', link: 'https://www.npmjs.com/search?q=%4025xcodes%2Fllmfeed' },
    ],

    footer: {
      message: 'Community documentation provided as-is. Not official guidance. Verify before production use.',
      copyright: 'Released under the MIT License. Copyright © 2025-present Kiarash Adl'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/kiarashplusplus/webmcp-tooling-suite/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    lastUpdated: {
      text: 'Updated at',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    }
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true
  },

  lastUpdated: true,
})
