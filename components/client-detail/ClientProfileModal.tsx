"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AdminConfirmDialog, AdminFormSection, AdminModal, AdminModalFooter
} from "@/components/admin"
import {
  Camera, Eye, EyeOff, KeyRound, MapPin, Trash2, UserRound,
  Activity, Flame, Target
} from "lucide-react"
import type { ProfileData } from "./types"

const OBJECTIVE_OPTIONS = [
  "Prise de masse",
  "Perte de poids",
  "Recomposition corporelle",
  "Maintien",
  "Performance",
  "Santé / remise en forme",
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileData
  onSaved: () => Promise<void> | void
}

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

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    sexe: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    taille: "",
    poids: "",
    fitnessLevel: "A",
    objectif: "",
    customObjectif: "",
    dailyCalories: "",
    proteinG: "",
    carbsG: "",
    fatG: "",
  })

  useEffect(() => {
    if (!open) return
    const initialObj = client.objectif || ""
    const isStandardObj = OBJECTIVE_OPTIONS.includes(initialObj)
    const nt = client.nutritionTarget

    setForm({
      firstName: client.firstName || "",
      lastName: client.lastName || "",
      name: client.name || "",
      email: client.email || "",
      phone: client.phone || "",
      dateOfBirth: client.dateOfBirth?.slice(0, 10) || "",
      sexe: client.sexe || "",
      line1: client.address?.line1 || "",
      line2: client.address?.line2 || "",
      city: client.address?.city || "",
      region: client.address?.region || "",
      postalCode: client.address?.postalCode || "",
      country: client.address?.country || "",
      taille: client.taille || "",
      poids: client.poids || "",
      fitnessLevel: client.fitnessLevel || "A",
      objectif: isStandardObj ? initialObj : (initialObj ? "Autre" : ""),
      customObjectif: isStandardObj ? "" : initialObj,
      dailyCalories: nt?.dailyCalories ? String(nt.dailyCalories) : "",
      proteinG: nt?.proteinG ? String(nt.proteinG) : "",
      carbsG: nt?.carbsG ? String(nt.carbsG) : "",
      fatG: nt?.fatG ? String(nt.fatG) : "",
    })

    setPhoto(null)
    setPassword("")
    setPasswordConfirmation("")
    setRemovePhoto(false)
    setPhotoPreview(profile.profileMeta?.photoUri || client.photoUri || null)
  }, [client, profile.profileMeta, open])

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    if (!form.email && !form.phone) {
      toast("Un email ou un téléphone est requis", "error")
      return
    }
    if (password && password.length < 8) {
      toast("Le mot de passe doit contenir au moins 8 caractères", "error")
      return
    }
    if (password && password !== passwordConfirmation) {
      toast("Les mots de passe ne correspondent pas", "error")
      return
    }

    setSaving(true)
    try {
      const resolvedObjectif =
        form.objectif === "Autre"
          ? form.customObjectif.trim()
          : form.objectif.trim()

      const computedName =
        form.name.trim() ||
        `${form.firstName.trim()} ${form.lastName.trim()}`.trim() ||
        client.name ||
        "Client"

      // 1. Update Profile & Body info
      await api.updateClientProfile(client._id, {
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        name: computedName,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth : null,
        sexe: (form.sexe as "M" | "F") || undefined,
        taille: form.taille.trim() || undefined,
        poids: form.poids.trim() || undefined,
        fitnessLevel: (form.fitnessLevel as "A" | "B") || undefined,
        objectif: resolvedObjectif || undefined,
        address: {
          line1: form.line1.trim() || undefined,
          line2: form.line2.trim() || undefined,
          city: form.city.trim() || undefined,
          region: form.region.trim() || undefined,
          postalCode: form.postalCode.trim() || undefined,
          country: form.country.trim() || undefined,
        },
      })

      // 2. Update Nutrition targets
      const ntPayload: {
        dailyCalories?: number
        proteinG?: number
        carbsG?: number
        fatG?: number
      } = {}
      if (form.dailyCalories) ntPayload.dailyCalories = parseInt(form.dailyCalories, 10)
      if (form.proteinG) ntPayload.proteinG = parseInt(form.proteinG, 10)
      if (form.carbsG) ntPayload.carbsG = parseInt(form.carbsG, 10)
      if (form.fatG) ntPayload.fatG = parseInt(form.fatG, 10)

      if (Object.keys(ntPayload).length > 0) {
        await api.setClientNutritionTarget(client._id, ntPayload)
      }

      // 3. Photo operations
      if (photo) {
        await api.uploadClientPhoto(client._id, photo)
      } else if (removePhoto) {
        await api.deleteClientPhoto(client._id)
      }

      // 4. Password reset
      if (password) {
        await api.resetClientPassword(client._id, password)
      }

      await onSaved()
      onOpenChange(false)
      toast("Fiche client mise à jour ✓", "success")
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      toast(e.response?.data?.message || e.message || "Mise à jour impossible", "error")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AdminModal
        open={open}
        onOpenChange={onOpenChange}
        title="Modifier la fiche client"
        description="Identité, données physiques, objectifs nutritionnels, coordonnées et sécurité."
        icon={<UserRound className="h-5 w-5" />}
        size="lg"
        busy={saving}
        dirty
        footer={(close) => (
          <AdminModalFooter
            submitLabel="Enregistrer la fiche"
            loadingLabel="Enregistrement…"
            loading={saving}
            onCancel={close}
            onSubmit={() => (password ? setConfirmReset(true) : save())}
          />
        )}
      >
        <div className="space-y-6">
          {/* Identité */}
          <AdminFormSection title="Identité" icon={<UserRound className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-first-name">Prénom</Label>
                <Input
                  id="client-first-name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="Ex: Jean"
                />
              </div>
              <div>
                <Label htmlFor="client-last-name">Nom</Label>
                <Input
                  id="client-last-name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Ex: Dupont"
                />
              </div>
              <div>
                <Label htmlFor="client-display-name">Nom complet affiché</Label>
                <Input
                  id="client-display-name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="client-dob">Date de naissance</Label>
                <Input
                  id="client-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => update("dateOfBirth", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="client-sex">Sexe</Label>
                <select
                  id="client-sex"
                  value={form.sexe}
                  onChange={(e) => update("sexe", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Non renseigné</option>
                  <option value="M">Homme</option>
                  <option value="F">Femme</option>
                </select>
              </div>
            </div>
          </AdminFormSection>

          {/* Photo */}
          <AdminFormSection
            title="Photo de profil"
            description="JPG, PNG ou WebP, maximum 5 Mo."
            icon={<Camera className="h-4 w-4" />}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Aperçu du profil"
                  className="h-20 w-20 rounded-2xl border object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-muted">
                  <UserRound className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast("La photo dépasse 5 Mo", "error")
                      e.target.value = ""
                      return
                    }
                    setPhoto(file)
                    setRemovePhoto(false)
                    if (file) setPhotoPreview(URL.createObjectURL(file))
                  }}
                />
                {photoPreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhoto(null)
                      setPhotoPreview(null)
                      setRemovePhoto(true)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer la photo
                  </Button>
                )}
              </div>
            </div>
          </AdminFormSection>

          {/* Coordonnées & Contact */}
          <AdminFormSection title="Coordonnées" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="client@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="client-phone">Téléphone</Label>
                <Input
                  id="client-phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+216 XX XXX XXX"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="client-address">Adresse (ligne 1)</Label>
                <Input
                  id="client-address"
                  value={form.line1}
                  onChange={(e) => update("line1", e.target.value)}
                  placeholder="Rue, numéro"
                />
              </div>
              <div>
                <Label htmlFor="client-address2">Complément d'adresse</Label>
                <Input
                  id="client-address2"
                  value={form.line2}
                  onChange={(e) => update("line2", e.target.value)}
                  placeholder="Appartement, bâtiment..."
                />
              </div>
              <div>
                <Label htmlFor="client-city">Ville</Label>
                <Input
                  id="client-city"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Tunis"
                />
              </div>
              <div>
                <Label htmlFor="client-region">Gouvernorat / région</Label>
                <Input
                  id="client-region"
                  value={form.region}
                  onChange={(e) => update("region", e.target.value)}
                  placeholder="Tunis"
                />
              </div>
              <div>
                <Label htmlFor="client-postal">Code postal</Label>
                <Input
                  id="client-postal"
                  value={form.postalCode}
                  onChange={(e) => update("postalCode", e.target.value)}
                  placeholder="1000"
                />
              </div>
              <div>
                <Label htmlFor="client-country">Pays</Label>
                <Input
                  id="client-country"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="Tunisie"
                />
              </div>
            </div>
          </AdminFormSection>

          {/* Données Physiques & Objectif */}
          <AdminFormSection title="Données physiques & Objectif" icon={<Activity className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-taille">Taille (cm)</Label>
                <Input
                  id="client-taille"
                  type="number"
                  value={form.taille}
                  onChange={(e) => update("taille", e.target.value)}
                  placeholder="178"
                />
              </div>
              <div>
                <Label htmlFor="client-poids">Poids actuel (kg)</Label>
                <Input
                  id="client-poids"
                  type="number"
                  step="0.1"
                  value={form.poids}
                  onChange={(e) => update("poids", e.target.value)}
                  placeholder="78.0"
                />
              </div>
              <div>
                <Label htmlFor="client-level">Niveau sportif</Label>
                <select
                  id="client-level"
                  value={form.fitnessLevel}
                  onChange={(e) => update("fitnessLevel", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="A">Niveau A (Débutant / Intermédiaire)</option>
                  <option value="B">Niveau B (Avancé / Athlète)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="client-goal">Objectif personnel</Label>
                <select
                  id="client-goal"
                  value={form.objectif}
                  onChange={(e) => update("objectif", e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionner un objectif</option>
                  {OBJECTIVE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  <option value="Autre">Autre (personnalisé)</option>
                </select>
              </div>
              {form.objectif === "Autre" && (
                <div className="sm:col-span-2">
                  <Label htmlFor="client-custom-goal">Préciser l'objectif personnalisé</Label>
                  <Input
                    id="client-custom-goal"
                    value={form.customObjectif}
                    onChange={(e) => update("customObjectif", e.target.value)}
                    placeholder="Ex: Préparation marathon / Renforcement lombaire"
                  />
                </div>
              )}
            </div>
          </AdminFormSection>

          {/* Objectifs Nutritionnels */}
          <AdminFormSection title="Objectifs nutritionnels" icon={<Flame className="h-4 w-4" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="client-kcal" className="text-xs">Calories (kcal/j)</Label>
                <Input
                  id="client-kcal"
                  type="number"
                  value={form.dailyCalories}
                  onChange={(e) => update("dailyCalories", e.target.value)}
                  placeholder="2200"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="client-prot" className="text-xs">Protéines (g)</Label>
                <Input
                  id="client-prot"
                  type="number"
                  value={form.proteinG}
                  onChange={(e) => update("proteinG", e.target.value)}
                  placeholder="160"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="client-carbs" className="text-xs">Glucides (g)</Label>
                <Input
                  id="client-carbs"
                  type="number"
                  value={form.carbsG}
                  onChange={(e) => update("carbsG", e.target.value)}
                  placeholder="250"
                  className="h-9"
                />
              </div>
              <div>
                <Label htmlFor="client-fat" className="text-xs">Lipides (g)</Label>
                <Input
                  id="client-fat"
                  type="number"
                  value={form.fatG}
                  onChange={(e) => update("fatG", e.target.value)}
                  placeholder="70"
                  className="h-9"
                />
              </div>
            </div>
          </AdminFormSection>

          {/* Sécurité */}
          <AdminFormSection
            title="Sécurité du compte"
            description="Optionnel. Réinitialiser le mot de passe du client."
            icon={<KeyRound className="h-4 w-4" />}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="client-password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="client-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 caractères minimum"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="client-password-confirmation">Confirmation</Label>
                <Input
                  id="client-password-confirmation"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
            </div>
          </AdminFormSection>
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Réinitialiser le mot de passe ?"
        description="Le client sera déconnecté de toutes ses sessions et devra se reconnecter avec le nouveau mot de passe."
        confirmLabel="Réinitialiser et enregistrer"
        loading={saving}
        onConfirm={save}
      />
    </>
  )
}
