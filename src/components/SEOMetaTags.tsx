import { useEffect, useState } from 'react'

export function SEOMetaTags() {
  const [currentTab, setCurrentTab] = useState('directory')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash) {
        setCurrentTab(hash)
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  useEffect(() => {
    const tabTitles: Record<string, string> = {
      directory: 'Feed Directory - Universal LLMFeed Analyzer',
      validator: 'Feed Validator - Universal LLMFeed Analyzer',
      discovery: 'Feed Discovery - Universal LLMFeed Analyzer',
      archive: 'Feed Archive - Universal LLMFeed Analyzer',
      rag: 'RAG Preparation - Universal LLMFeed Analyzer'
    }

    const tabDescriptions: Record<string, string> = {
      directory: 'Browse top and latest published LLM feeds with metadata, capabilities, and direct JSON access for AI agents and scrapers.',
      validator: 'Validate LLMFeed JSON structure, verify Ed25519 cryptographic signatures, and ensure schema conformance for secure AI agent integration.',
      discovery: 'Discover and analyze LLMFeed capabilities from any URL. Fetch feeds, inspect metadata, and explore available tools.',
      archive: 'Archive and version LLM feeds with timestamped snapshots. Access historical feed data with stable canonical URLs.',
      rag: 'Prepare LLMFeed data for RAG indexing. Transform capabilities into embeddings for semantic search and vector stores.'
    }

    const title = tabTitles[currentTab] || tabTitles.directory
    const description = tabDescriptions[currentTab] || tabDescriptions.directory

    document.title = title

    let descMeta = document.querySelector('meta[name="description"]')
    if (descMeta) {
      descMeta.setAttribute('content', description)
    }

    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', title)
    }

    let ogDesc = document.querySelector('meta[property="og:description"]')
    if (ogDesc) {
      ogDesc.setAttribute('content', description)
    }

    let twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitle) {
      twitterTitle.setAttribute('content', title)
    }

    let twitterDesc = document.querySelector('meta[name="twitter:description"]')
    if (twitterDesc) {
      twitterDesc.setAttribute('content', description)
    }

    const breadcrumbScript = document.createElement('script')
    breadcrumbScript.type = 'application/ld+json'
    breadcrumbScript.id = 'breadcrumb-structured-data'
    
    const breadcrumbData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: window.location.origin
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: currentTab.charAt(0).toUpperCase() + currentTab.slice(1),
          item: `${window.location.origin}/#${currentTab}`
        }
      ]
    }

    breadcrumbScript.textContent = JSON.stringify(breadcrumbData)

    const existingBreadcrumb = document.getElementById('breadcrumb-structured-data')
    if (existingBreadcrumb) {
      existingBreadcrumb.remove()
    }

    document.head.appendChild(breadcrumbScript)

  }, [currentTab])

  useEffect(() => {
    const robotsMeta = document.createElement('meta')
    robotsMeta.name = 'robots'
    robotsMeta.content = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    
    const existingRobots = document.querySelector('meta[name="robots"]')
    if (!existingRobots) {
      document.head.appendChild(robotsMeta)
    }

    const googlebotMeta = document.createElement('meta')
    googlebotMeta.name = 'googlebot'
    googlebotMeta.content = 'index, follow'
    
    const existingGooglebot = document.querySelector('meta[name="googlebot"]')
    if (!existingGooglebot) {
      document.head.appendChild(googlebotMeta)
    }

    const link = document.createElement('link')
    link.rel = 'canonical'
    link.href = window.location.origin + window.location.pathname
    
    const existingCanonical = document.querySelector('link[rel="canonical"]')
    if (existingCanonical) {
      existingCanonical.remove()
    }
    document.head.appendChild(link)

  }, [])

  return null
}
