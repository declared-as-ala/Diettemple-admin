"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminConfirmDialog, AdminFormSection, AdminModal, AdminModalFooter } from "@/components/admin"
import { Camera, Eye, EyeOff, KeyRound, MapPin, Trash2, UserRound } from "lucide-react"
import type { ProfileData } from "./types"

type Props = { open: boolean; onOpenChange: (open: boolean) => void; profile: ProfileData; onSaved: () => Promise<void> | void }

export default function ClientProfileModal({ open, onOpenChange, profile, onSaved }: Props) {
  const { toast } = useToast()
  const client = profile.client
  const [saving, setSaving] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [passwordConfirmation, setPasswordConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: "", lastName: "", name: "", email: "", phone: "", dateOfBirth: "", sexe: "", line1: "", line2: "", city: "", region: "", postalCode: "", country: "" })

  useEffect(() => {
    if (!open) return
    setForm({
      firstName: client.firstName || "", lastName: client.lastName || "", name: client.name || "", email: client.email || "", phone: client.phone || "",
      dateOfBirth: client.dateOfBirth?.slice(0, 10) || "", line1: client.address?.line1 || "", line2: client.address?.line2 || "",
      sexe: client.sexe || "", city: client.address?.city || "", region: client.address?.region || "", postalCode: client.address?.postalCode || "", country: client.address?.country || "",
    })
    setPhoto(null); setPassword(""); setPasswordConfirmation(""); setRemovePhoto(false); setPhotoPreview(client.photoUri || null)
  }, [client, open])

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }))
  const save = async () => {
    if (!form.email && !form.phone) { toast("Un email ou un téléphone est requis", "error"); return }
    if (password && password.length < 8) { toast("Le mot de passe doit contenir au moins 8 caractères", "error"); return }
    if (password && password !== passwordConfirmation) { toast("Les mots de passe ne correspondent pas", "error"); return }
    setSaving(true)
    try {
      await api.updateClientProfile(client._id, {
        firstName: form.firstName, lastName: form.lastName, name: form.name || `${form.firstName} ${form.lastName}`.trim(), email: form.email, phone: form.phone,
        dateOfBirth: form.dateOfBirth || null,
        sexe: form.sexe || undefined,
        address: { line1: form.line1, line2: form.line2, city: form.city, region: form.region, postalCode: form.postalCode, country: form.country },
      })
      if (photo) await api.uploadClientPhoto(client._id, photo)
      else if (removePhoto) await api.deleteClientPhoto(client._id)
      if (password) await api.resetClientPassword(client._id, password)
      await onSaved(); onOpenChange(false); toast("Profil client mis à jour", "success")
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Mise à jour impossible", "error")
    } finally { setSaving(false) }
  }

  return (
    <><AdminModal open={open} onOpenChange={onOpenChange} title="Modifier le client" description="Identité, coordonnées, photo et sécurité du compte." icon={<UserRound className="h-5 w-5" />} size="lg" busy={saving} dirty footer={(close) => <AdminModalFooter submitLabel="Enregistrer" loadingLabel="Enregistrement…" loading={saving} onCancel={close} onSubmit={() => password ? setConfirmReset(true) : save()} />}>
      <div className="space-y-5">
        <AdminFormSection title="Identité" icon={<UserRound className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label htmlFor="client-first-name">Prénom</Label><Input id="client-first-name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} /></div>
            <div><Label htmlFor="client-last-name">Nom</Label><Input id="client-last-name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} /></div>
            <div><Label htmlFor="client-display-name">Nom affiché</Label><Input id="client-display-name" value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
            <div><Label htmlFor="client-dob">Date de naissance</Label><Input id="client-dob" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} /></div>
            <div><Label htmlFor="client-sex">Sexe</Label><select id="client-sex" value={form.sexe} onChange={(e) => update("sexe", e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Non renseigné</option><option value="M">Homme</option><option value="F">Femme</option></select></div>
            <div><Label htmlFor="client-email">Email</Label><Input id="client-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
            <div><Label htmlFor="client-phone">Téléphone</Label><Input id="client-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
          </div>
        </AdminFormSection>
        <AdminFormSection title="Adresse" icon={<MapPin className="h-5 w-5" />}>
          <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label>Adresse</Label><Input value={form.line1} onChange={(e) => update("line1", e.target.value)} /></div><div><Label>Complément</Label><Input value={form.line2} onChange={(e) => update("line2", e.target.value)} /></div><div><Label>Ville</Label><Input value={form.city} onChange={(e) => update("city", e.target.value)} /></div><div><Label>Gouvernorat / région</Label><Input value={form.region} onChange={(e) => update("region", e.target.value)} /></div><div><Label>Code postal</Label><Input value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} /></div><div><Label>Pays</Label><Input value={form.country} onChange={(e) => update("country", e.target.value)} /></div></div>
        </AdminFormSection>
        <AdminFormSection title="Photo" description="JPG, PNG ou WebP, maximum 5 Mo." icon={<Camera className="h-5 w-5" />}><div className="flex flex-col gap-3 sm:flex-row sm:items-center">{photoPreview ? <img src={photoPreview} alt="Aperçu du profil" className="h-20 w-20 rounded-2xl border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-muted"><UserRound className="h-8 w-8 text-muted-foreground" /></div>}<div className="flex-1 space-y-2"><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const file = e.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { toast("La photo dépasse 5 Mo", "error"); e.target.value = ""; return } setPhoto(file); setRemovePhoto(false); if (file) setPhotoPreview(URL.createObjectURL(file)) }} />{photoPreview && <Button type="button" variant="outline" size="sm" onClick={() => { setPhoto(null); setPhotoPreview(null); setRemovePhoto(true) }}><Trash2 className="mr-2 h-4 w-4" />Supprimer la photo</Button>}</div></div></AdminFormSection>
        <AdminFormSection title="Sécurité" description="Optionnel. Une réinitialisation déconnecte immédiatement toutes les sessions du client." icon={<KeyRound className="h-5 w-5" />}><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="client-password">Nouveau mot de passe</Label><div className="relative"><Input id="client-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div><div><Label htmlFor="client-password-confirmation">Confirmation</Label><Input id="client-password-confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} /></div></div><p className="mt-2 text-xs text-muted-foreground">Cette action est réservée aux administrateurs.</p></AdminFormSection>
      </div>
    </AdminModal><AdminConfirmDialog open={confirmReset} onOpenChange={setConfirmReset} title="Réinitialiser le mot de passe ?" description="Le client sera déconnecté de toutes ses sessions et devra se reconnecter avec le nouveau mot de passe." confirmLabel="Réinitialiser et enregistrer" loading={saving} onConfirm={save} /></>
  )
}
