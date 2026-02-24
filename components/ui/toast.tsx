"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type ToastVariant = "success" | "error" | "info" | "destructive"

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
}

type ToastFunction = 
  | ((message: string, variant?: ToastVariant) => void)
  | ((options: ToastOptions) => void)

interface ToastContextType {
  toast: ToastFunction
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Array<{ id: string; message: string; variant: ToastVariant }>>([])

  const toast = React.useCallback<ToastFunction>((messageOrOptions: string | ToastOptions, variant?: ToastVariant) => {
    const id = Math.random().toString(36).substring(7)
    
    let message: string
    let toastVariant: ToastVariant = "info"
    
    if (typeof messageOrOptions === "string") {
      // Old format: toast(message, variant)
      message = messageOrOptions
      toastVariant = variant || "info"
    } else {
      // New format: toast({ title, description, variant })
      const options = messageOrOptions
      message = options.description || options.title || ""
      toastVariant = options.variant || "info"
      if (options.title && options.description) {
        message = `${options.title}: ${options.description}`
      }
    }
    
    // Map "destructive" to "error" for consistency
    if (toastVariant === "destructive") {
      toastVariant = "error"
    }
    
    setToasts((prev) => [...prev, { id, message, variant: toastVariant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
              className={cn(
              "rounded-lg px-4 py-3 shadow-lg text-white min-w-[300px] animate-in slide-in-from-bottom-5",
              {
                "bg-green-600": toast.variant === "success",
                "bg-red-600": toast.variant === "error" || toast.variant === "destructive",
                "bg-blue-600": toast.variant === "info",
              }
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within ToastProvider")
  }
  return context
}
