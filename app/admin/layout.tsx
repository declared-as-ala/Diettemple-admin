"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { ToastProvider } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { auth } from "@/lib/auth"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  // Skip auth check for login page
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false)
      return // Don't check auth on login page
    }

    const checkAuth = () => {
      const authenticated = auth.isAuthenticated()
      setIsAuthenticated(authenticated)
      
      if (!authenticated) {
        router.push("/admin/login")
        setLoading(false)
        return
      }

      const token = auth.getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          const role = payload.role || "admin"
          if (role === "employee") {
            const forbiddenPaths = [
              "/admin/dashboard",
              "/admin/orders",
              "/admin/subscriptions",
              "/admin/assignments",
              "/admin/nutrition-plans",
              "/admin/nutrition-assignments",
              "/admin/landing-videos",
              "/admin/level-home-content",
              "/admin/support",
              "/admin/leads"
            ];
            const isForbidden = forbiddenPaths.some(p => pathname === p || pathname.startsWith(p + "/"));
            if (isForbidden) {
              router.push("/admin/clients")
            }
          }
        } catch {}
      }
      setLoading(false)
    }

    checkAuth()
  }, [router, pathname, isLoginPage])

  // Allow login page to render without auth check
  if (isLoginPage) {
    return <>{children}</>
  }

  if (loading || isAuthenticated === null) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
