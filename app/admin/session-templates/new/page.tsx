"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"

export default function NewSessionTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [creating, setCreating] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.createSessionTemplate({ title: "New Session", items: [] })
        const id = data?.sessionTemplate?._id
        if (id && !cancelled) {
          router.replace(`/admin/session-templates/${id}`)
          return
        }
      } catch (err: any) {
        if (!cancelled) toast(err.response?.data?.message || err.message || "Erreur lors de la création", "error")
      } finally {
        if (!cancelled) setCreating(false)
      }
    })()
    return () => { cancelled = true }
  }, [router, toast])

  return <PageLoader />
}
