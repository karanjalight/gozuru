"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Camera,
  CheckCircle2,
  Globe2,
  Link2,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAccountHomePath, useIsClientAccount } from "@/lib/auth/useAccountRole";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

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

const fieldLabels: Record<keyof ProfileFormState, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  location: "Location",
  professionalTitle: "Professional title",
  yearsOfExperience: "Experience",
  headline: "Headline",
  bio: "Bio",
  skills: "Skills",
  languages: "Languages",
  website: "Website",
  linkedin: "LinkedIn",
  portfolioUrl: "Portfolio",
  avatarUrl: "Photo",
};

const inputClassName =
  "h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20";

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground/90">
        {label}
      </label>
      {children}
    </div>
  );
}

function CompletionRing({ percentage }: { percentage: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative mx-auto size-28">
      <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/40"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-orange-500 transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums">{percentage}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Complete
        </span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const { isClient } = useIsClientAccount();
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

  const completionFields = useMemo(() => {
    if (isClient) {
      return ["firstName", "lastName", "phone", "location", "headline", "bio"] as Array<
        keyof ProfileFormState
      >;
    }
    return profileCompletionFields;
  }, [isClient]);

  const completion = useMemo(() => {
    const completed = completionFields.reduce((sum, key) => {
      return form[key].trim() ? sum + 1 : sum;
    }, 0);
    const percentage = Math.round((completed / completionFields.length) * 100);
    return { completed, percentage };
  }, [completionFields, form]);

  const displayName =
    `${form.firstName} ${form.lastName}`.trim() || user?.email?.split("@")[0] || "Your profile";

  const initials =
    `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

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
      setSuccess("Profile saved successfully.");
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
      setSuccess("Photo uploaded. Save your profile to apply the change.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload profile image.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  if (!user) return null;

  const dashboardPath = getAccountHomePath(user.metadata.role);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-8 lg:pt-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-orange-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 left-1/4 size-72 rounded-full bg-orange-400/10 blur-3xl"
        />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <Avatar className="size-24 border-4 border-white/20 shadow-2xl sm:size-28">
                  <AvatarImage src={form.avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-orange-500 text-2xl font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className={cn(
                    "absolute bottom-0 right-0 flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-900 bg-orange-500 text-white shadow-lg transition hover:bg-orange-600",
                    uploadingAvatar && "pointer-events-none opacity-70",
                  )}
                >
                  <Camera className="size-4" />
                  <span className="sr-only">Upload profile photo</span>
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    void onAvatarFileChange(event);
                  }}
                  className="sr-only"
                  disabled={uploadingAvatar}
                />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                  <Sparkles className="size-3.5 text-orange-300" />
                  {isClient ? "Member profile" : "Expert profile"}
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{displayName}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="size-4 shrink-0" />
                  {user.email}
                </p>
                {form.headline ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">{form.headline}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {!isClient ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  onClick={() => router.push("/account/experiences")}
                >
                  Manage experiences
                </Button>
              ) : (
                <Link
                  href="/account/affiliate"
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Affiliate program
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form id="profile-form" onSubmit={onSubmit} className="space-y-6">
          <SectionCard
            icon={UserRound}
            title="Personal details"
            description={
              isClient
                ? "Your name and contact information on Gozuru."
                : "How guests and hosts will identify you on the platform."
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName">
                <input
                  id="firstName"
                  className={inputClassName}
                  value={form.firstName}
                  onChange={(event) => setField("firstName", event.target.value)}
                  required
                />
              </Field>
              <Field label="Last name" htmlFor="lastName">
                <input
                  id="lastName"
                  className={inputClassName}
                  value={form.lastName}
                  onChange={(event) => setField("lastName", event.target.value)}
                  required
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="phone">
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="phone"
                    className={cn(inputClassName, "pl-10")}
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    placeholder="+254 712 345 678"
                  />
                </div>
              </Field>
              <Field label="Location" htmlFor="location">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="location"
                    className={cn(inputClassName, "pl-10")}
                    value={form.location}
                    onChange={(event) => setField("location", event.target.value)}
                    placeholder="Nairobi, Kenya"
                  />
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={Briefcase}
            title={isClient ? "About you" : "Professional profile"}
            description={
              isClient
                ? "Share a little about yourself for a richer Gozuru experience."
                : "Showcase your expertise, story, and what makes your experiences unique."
            }
          >
            {!isClient ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Professional title" htmlFor="professionalTitle">
                  <input
                    id="professionalTitle"
                    className={inputClassName}
                    value={form.professionalTitle}
                    onChange={(event) => setField("professionalTitle", event.target.value)}
                    placeholder="Senior Product Designer"
                  />
                </Field>
                <Field label="Years of experience" htmlFor="yearsOfExperience">
                  <input
                    id="yearsOfExperience"
                    className={inputClassName}
                    value={form.yearsOfExperience}
                    onChange={(event) => setField("yearsOfExperience", event.target.value)}
                    placeholder="8+ years"
                  />
                </Field>
              </div>
            ) : null}

            <Field label="Headline" htmlFor="headline">
              <input
                id="headline"
                className={inputClassName}
                value={form.headline}
                onChange={(event) => setField("headline", event.target.value)}
                placeholder={
                  isClient
                    ? "Curious traveler exploring culture and connection"
                    : "Helping teams design high-converting travel products"
                }
              />
            </Field>

            <Field label="Bio" htmlFor="bio">
              <textarea
                id="bio"
                className={cn(inputClassName, "min-h-32 resize-y py-3")}
                value={form.bio}
                onChange={(event) => setField("bio", event.target.value)}
                placeholder={
                  isClient
                    ? "Tell us a bit about your interests, travel style, or what you love exploring."
                    : "Share your story, achievements, and what travelers can expect from you."
                }
              />
            </Field>

            {!isClient ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Skills" htmlFor="skills">
                  <input
                    id="skills"
                    className={inputClassName}
                    value={form.skills}
                    onChange={(event) => setField("skills", event.target.value)}
                    placeholder="Brand strategy, UX research, facilitation"
                  />
                </Field>
                <Field label="Languages" htmlFor="languages">
                  <input
                    id="languages"
                    className={inputClassName}
                    value={form.languages}
                    onChange={(event) => setField("languages", event.target.value)}
                    placeholder="English, Swahili"
                  />
                </Field>
              </div>
            ) : null}
          </SectionCard>

          {!isClient ? (
            <SectionCard
              icon={Globe2}
              title="Links & portfolio"
              description="Help travelers discover your work and credibility elsewhere."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Website" htmlFor="website">
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="website"
                      className={cn(inputClassName, "pl-10")}
                      value={form.website}
                      onChange={(event) => setField("website", event.target.value)}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </Field>
                <Field label="LinkedIn" htmlFor="linkedin">
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="linkedin"
                      className={cn(inputClassName, "pl-10")}
                      value={form.linkedin}
                      onChange={(event) => setField("linkedin", event.target.value)}
                      placeholder="https://linkedin.com/in/you"
                    />
                  </div>
                </Field>
              </div>
              <Field label="Portfolio URL" htmlFor="portfolioUrl">
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="portfolioUrl"
                    className={cn(inputClassName, "pl-10")}
                    value={form.portfolioUrl}
                    onChange={(event) => setField("portfolioUrl", event.target.value)}
                    placeholder="https://portfolio.com/you"
                  />
                </div>
              </Field>
            </SectionCard>
          ) : null}

          {(error || success) && (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                error
                  ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
              )}
            >
              {error ?? success}
            </div>
          )}

          <div className="hidden lg:block">
            <Button
              type="submit"
              disabled={saving || uploadingAvatar}
              className="h-12 rounded-full bg-orange-500 px-8 text-white hover:bg-orange-600"
            >
              {saving ? "Saving profile..." : "Save profile"}
            </Button>
          </div>
        </form>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-sm">
            <div className="border-b border-border/60 bg-muted/20 px-6 py-5 text-center">
              <p className="text-sm font-semibold">Profile strength</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {completion.completed} of {completionFields.length} essentials complete
              </p>
            </div>
            <div className="px-6 py-8">
              <CompletionRing percentage={completion.percentage} />
              <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
                {completion.percentage >= 80
                  ? "Your profile looks great. You're ready to make a strong impression."
                  : completion.percentage >= 50
                    ? "You're halfway there. A few more details will help you stand out."
                    : "Add more details to build trust and unlock a richer Gozuru experience."}
              </p>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/80 bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold">Completion checklist</p>
            <ul className="mt-4 space-y-3">
              {completionFields.map((field) => {
                const complete = Boolean(form[field].trim());
                return (
                  <li key={field} className="flex items-center gap-3 text-sm">
                    <CheckCircle2
                      className={cn(
                        "size-4 shrink-0",
                        complete ? "text-emerald-500" : "text-muted-foreground/50",
                      )}
                    />
                    <span className={complete ? "text-foreground" : "text-muted-foreground"}>
                      {fieldLabels[field]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="rounded-2xl border-border/80 bg-card p-6 shadow-sm">
            <p className="text-sm font-semibold">Account</p>
            <div className="mt-4 space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl"
                onClick={() => router.push(dashboardPath)}
              >
                Back to dashboard
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-xl text-red-600 hover:text-red-700 dark:text-red-400"
                onClick={() => {
                  logout();
                  router.push("/auth/client/login");
                }}
              >
                <LogOut className="mr-2 size-4" />
                Log out
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* Mobile sticky save */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur-md lg:hidden">
        <Button
          type="submit"
          form="profile-form"
          disabled={saving || uploadingAvatar}
          className="h-12 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
        >
          {saving ? "Saving profile..." : "Save profile"}
        </Button>
      </div>
    </div>
  );
}
