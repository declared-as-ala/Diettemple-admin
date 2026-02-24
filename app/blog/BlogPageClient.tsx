"use client"

import { useMemo, useState } from "react"

interface Article {
  id: string
  title: string
  content: string
  category?: string
  date?: string
  [key: string]: any
}

interface BlogPageClientProps {
  articles?: Article[]
  initialCategory?: string
}

export default function BlogPageClient({ 
  articles = [], 
  initialCategory = "all" 
}: BlogPageClientProps) {
  const [activeCategory, setActiveCategory] = useState(initialCategory)

  // Helper function to check if article matches category
  const articleMatchesCategory = (article: Article, category: string): boolean => {
    if (category === "all") return true
    if (!article.category) return false
    return article.category.toLowerCase().includes(category.toLowerCase())
  }

  // Filter by category (keyword-based)
  // Fix: Ensure articles is always an array before calling filter
  const filteredArticles = useMemo(() => {
    if (!articles || !Array.isArray(articles)) {
      return []
    }
    return articles.filter(a => articleMatchesCategory(a, activeCategory))
  }, [articles, activeCategory])

  // Sort by date (latest first)
  const sortedArticles = useMemo(() => {
    return [...filteredArticles].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
  }, [filteredArticles])

  return (
    <div className="blog-page">
      {/* Category filter */}
      <div className="category-filter">
        <button
          onClick={() => setActiveCategory("all")}
          className={activeCategory === "all" ? "active" : ""}
        >
          All
        </button>
        {/* Add more category buttons as needed */}
      </div>

      {/* Articles list */}
      <div className="articles-list">
        {sortedArticles.length === 0 ? (
          <p>No articles found.</p>
        ) : (
          sortedArticles.map((article) => (
            <article key={article.id} className="article-card">
              <h2>{article.title}</h2>
              <p>{article.content}</p>
              {article.date && <span className="date">{article.date}</span>}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
