"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { ToastProvider } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { auth } from "@/lib/auth"
import { api } from "@/lib/api"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Skip auth check for login page
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginPage) {
      const token = auth.getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          const role = payload.role
          if (role === "employee") {
            router.replace("/admin/products")
            return
          }
          if (role === "admin") {
            router.replace("/admin/dashboard")
            return
          }
        } catch {}

        const user = auth.getUser()
        if (user?.role === "employee") {
          router.replace("/admin/products")
          return
        }
        if (user?.role === "admin") {
          router.replace("/admin/dashboard")
          return
        }
      }
      setLoading(false)
      return
    }

    const token = auth.getToken()
    if (!token) {
      setIsAuthenticated(false)
      setLoading(false)
      router.replace("/admin/login")
      return
    }

    try {
      let role: string | undefined
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        role = payload.role
      } catch {}

      if (!role) {
        const storedUser = auth.getUser()
        role = storedUser?.role
      }

      if (role === "admin" || role === "employee") {
        // Employee route guard: only allowed /admin/products and /admin/orders
        if (role === "employee") {
          const isAllowed = pathname.startsWith("/admin/products") || pathname.startsWith("/admin/orders")
          if (!isAllowed) {
            router.replace("/admin/products")
            return
          }
        }
        setIsAuthenticated(true)
        setLoading(false)
        return
      }

      // If role could not be resolved from JWT/storage, verify against backend /auth/me
      api.getMe()
        .then((meData) => {
          const serverRole = meData?.user?.role
          if (serverRole === "admin" || serverRole === "employee") {
            try {
              localStorage.setItem("admin_user", JSON.stringify(meData.user))
            } catch {}
            if (serverRole === "employee") {
              const isAllowed = pathname.startsWith("/admin/products") || pathname.startsWith("/admin/orders")
              if (!isAllowed) {
                router.replace("/admin/products")
                return
              }
            }
            setIsAuthenticated(true)
            setLoading(false)
          } else {
            auth.logout()
          }
        })
        .catch(() => {
          auth.logout()
        })
    } catch {
      auth.logout()
    }
  }, [pathname, isLoginPage, router])

  if (isLoginPage) {
    return <ToastProvider>{children}</ToastProvider>
  }

  if (loading || isAuthenticated === null) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <ToastProvider>
      <div
        className="min-h-screen bg-background"
        style={{ "--admin-sidebar-width": sidebarCollapsed ? "5rem" : "16rem" } as React.CSSProperties}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="min-h-screen transition-[padding] duration-300 lg:pl-[var(--admin-sidebar-width)]">
          <TopBar onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="min-w-0 p-4 sm:p-6 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
