"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fr } from "@/lib/i18n/fr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { PageLoader } from "@/components/ui/loading"
import { LayoutGrid, Settings } from "lucide-react"

// Predefined levels (match User.level enum: Intiate, Fighter, Warrior, Champion, Elite)
const PREDEFINED_LEVELS = [
  { name: "Intiate", label: "Initiate", image: "/levels/initiate.png" },
  { name: "Fighter", label: "Fighter", image: "/levels/fighter.png" },
  { name: "Warrior", label: "Warrior", image: "/levels/warrior.png" },
  { name: "Champion", label: "Champion", image: "/levels/champion.png" },
  { name: "Elite", label: "Elite", image: "/levels/elite.png" },
]

function countSessions(template: any): number {
  if (!template?.weeks?.length) return 0
  const days = template.weeks.reduce((sum: number, w: any) => {
    const d = w.days || {}
    return sum + (d.mon?.length || 0) + (d.tue?.length || 0) + (d.wed?.length || 0) + (d.thu?.length || 0) + (d.fri?.length || 0) + (d.sat?.length || 0) + (d.sun?.length || 0)
  }, 0)
  return days
}

export default function LevelTemplatesPage() {
  const { toast } = useToast()
  const [templatesByName, setTemplatesByName] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [settingUp, setSettingUp] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getLevelTemplates({ limit: 20 })
      const list = data.levelTemplates || []
      const map: Record<string, any> = {}
      list.forEach((t: any) => { map[t.name] = t })
      setTemplatesByName(map)
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors du chargement des niveaux", "error")
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const handleSetUp = async (name: string) => {
    setSettingUp(name)
    try {
      const created = await api.createLevelTemplate({
        name,
        description: `${name} level program`,
      })
      toast(fr.messages.levelSetUp, "success")
      if (created?.levelTemplate?._id) {
        window.location.href = `/admin/level-templates/${created.levelTemplate._id}`
      } else {
        load()
      }
    } catch (err: any) {
      toast(err.response?.data?.message || err.message || "Erreur lors de la configuration", "error")
    } finally {
      setSettingUp(null)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Niveaux</h1>
        <p className="text-muted-foreground mt-1">Configurez le plan 5 semaines pour chaque niveau. Les niveaux sont prédéfinis.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PREDEFINED_LEVELS.map((level) => {
          const template = templatesByName[level.name]
          const imageUrl = template?.imageUrl || level.image
          return (
            <Card key={level.name} className="border-border bg-card/50 overflow-hidden">
              <div className="relative h-36 bg-muted/50">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={level.label}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none"
                    }}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center bg-muted/80 backdrop-blur-sm">
                  <span className="text-5xl font-bold text-muted-foreground">{level.label.charAt(0)}</span>
                </div>
                <div className="absolute top-2 right-2">
                  {template ? (
                    <Badge variant={template.isActive !== false ? "default" : "secondary"}>
                      {template.isActive !== false ? "Actif" : "Inactif"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Non configuré</Badge>
                  )}
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{level.label}</CardTitle>
                {template && (
                  <p className="text-sm text-muted-foreground">
                    {countSessions(template)} séances · Modifié le {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString("fr-FR") : "—"}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {template ? (
                  <div className="flex gap-2">
                    <Link href={`/admin/level-templates/${template._id}`} className="flex-1">
                      <Button variant="default" className="w-full" size="sm">
                        <LayoutGrid className="h-4 w-4 mr-2" />
                        Ouvrir le planning
                      </Button>
                    </Link>
                    <Link href={`/admin/level-templates/${template._id}`}>
                      <Button variant="outline" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleSetUp(level.name)}
                    disabled={settingUp !== null}
                  >
                    {settingUp === level.name ? "Configuration…" : "Configurer le niveau"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
