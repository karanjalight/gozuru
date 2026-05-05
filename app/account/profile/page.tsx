"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckCircle2, LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase/client";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  location: string;
  professionalTitle: string;
  yearsOfExperience: string;
  headline: string;
  bio: string;
  skills: string;
  languages: string;
  website: string;
  linkedin: string;
  portfolioUrl: string;
  avatarUrl: string;
};

const profileCompletionFields: Array<keyof ProfileFormState> = [
  "firstName",
  "lastName",
  "professionalTitle",
  "headline",
  "bio",
  "skills",
  "location",
  "languages",
  "portfolioUrl",
];

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    phone: "",
    location: "",
    professionalTitle: "",
    yearsOfExperience: "",
    headline: "",
    bio: "",
    skills: "",
    languages: "",
    website: "",
    linkedin: "",
    portfolioUrl: "",
    avatarUrl: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      firstName: user.metadata.firstName ?? "",
      lastName: user.metadata.lastName ?? "",
      phone: user.metadata.phone ?? "",
      location: user.metadata.location ?? "",
      professionalTitle: user.metadata.professionalTitle ?? "",
      yearsOfExperience: user.metadata.yearsOfExperience ?? "",
      headline: user.metadata.headline ?? "",
      bio: user.metadata.bio ?? "",
      skills: user.metadata.skills ?? "",
      languages: user.metadata.languages ?? "",
      website: user.metadata.website ?? "",
      linkedin: user.metadata.linkedin ?? "",
      portfolioUrl: user.metadata.portfolioUrl ?? "",
      avatarUrl: user.metadata.avatarUrl ?? "",
    });
  }, [user]);

  const completion = useMemo(() => {
    const completed = profileCompletionFields.reduce((sum, key) => {
      return form[key].trim() ? sum + 1 : sum;
    }, 0);
    const percentage = Math.round((completed / profileCompletionFields.length) * 100);
    return { completed, percentage };
  }, [form]);

  const setField = (field: keyof ProfileFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile(form);
      setSuccess("Your profile has been updated successfully.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const onAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      event.target.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("Profile image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploadingAvatar(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setForm((prev) => ({ ...prev, avatarUrl: publicUrl }));
      setSuccess("Profile image uploaded. Click Save profile to apply it.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload profile image.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Profile & portfolio</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Build a complete professional profile so hosts and guests can trust your expertise.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
        <form onSubmit={onSubmit}>
          <Card className="rounded-2xl border-border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">First name</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Last name</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Professional title</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.professionalTitle}
                  onChange={(event) => setField("professionalTitle", event.target.value)}
                  placeholder="Senior Product Designer"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Years of experience</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.yearsOfExperience}
                  onChange={(event) => setField("yearsOfExperience", event.target.value)}
                  placeholder="8+ years"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Headline</label>
              <input
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={form.headline}
                onChange={(event) => setField("headline", event.target.value)}
                placeholder="Helping teams design high-converting travel products"
              />
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Bio</label>
              <textarea
                className="min-h-28 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                value={form.bio}
                onChange={(event) => setField("bio", event.target.value)}
                placeholder="Share your story, achievements, and what travelers can expect from you."
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Skills</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.skills}
                  onChange={(event) => setField("skills", event.target.value)}
                  placeholder="Brand strategy, UX research, facilitation"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Languages</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.languages}
                  onChange={(event) => setField("languages", event.target.value)}
                  placeholder="English, Swahili"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Location</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.location}
                  onChange={(event) => setField("location", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Phone</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.phone}
                  onChange={(event) => setField("phone", event.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Website</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.website}
                  onChange={(event) => setField("website", event.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">LinkedIn</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.linkedin}
                  onChange={(event) => setField("linkedin", event.target.value)}
                  placeholder="https://linkedin.com/in/you"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Portfolio URL</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.portfolioUrl}
                  onChange={(event) => setField("portfolioUrl", event.target.value)}
                  placeholder="https://portfolio.com/you"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Avatar URL</label>
                <input
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={form.avatarUrl}
                  onChange={(event) => setField("avatarUrl", event.target.value)}
                  placeholder="https://images.example.com/avatar.jpg"
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Upload profile picture</label>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar data-size="lg">
                  <AvatarImage src={form.avatarUrl || undefined} alt="Profile picture preview" />
                  <AvatarFallback>
                    {(form.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void onAvatarFileChange(event);
                  }}
                  className="block w-full max-w-xs text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/80"
                  disabled={uploadingAvatar}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or WEBP up to 5MB.
              </p>
            </div>

            {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
            {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}

            <div className="mt-6">
              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? "Saving profile..." : "Save profile"}
              </Button>
            </div>
          </Card>
        </form>

        <Card className="h-fit rounded-2xl border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <Avatar data-size="lg">
              <AvatarImage src={form.avatarUrl || undefined} alt="Profile picture" />
              <AvatarFallback>
                <UserRound className="size-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">
                {(form.firstName || form.lastName)
                  ? `${form.firstName} ${form.lastName}`.trim()
                  : "Your profile"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-semibold">Professional setup</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {completion.completed} of {profileCompletionFields.length} key fields completed.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-orange-600">
              {completion.percentage}% complete
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Checklist</p>
            <ul className="mt-2 space-y-2 text-sm">
              {profileCompletionFields.map((field) => {
                const complete = Boolean(form[field].trim());
                const label = field
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (char) => char.toUpperCase());
                return (
                  <li key={field} className="flex items-center gap-2">
                    <CheckCircle2
                      className={`size-4 ${complete ? "text-emerald-600" : "text-muted-foreground"}`}
                    />
                    <span className={complete ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => router.push("/account/experiences")}
            >
              Back to dashboard
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                logout();
                router.push("/auth/login");
              }}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

