 "use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/components/auth/AuthProvider";

const sideImage =
  "https://images.pexels.com/photos/3771110/pexels-photo-3771110.jpeg?auto=compress&cs=tinysrgb&w=1600";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const GoogleIcon = (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.6 2.8-4 2.8-6.8 0-.7-.1-1.3-.2-1.9H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.3-4H3.4v2.5C5 19.8 8.2 22 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.7 13.1c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V6.8H3.4C2.8 8 2.5 9.4 2.5 11.2s.3 3.2.9 4.4l3.3-2.5Z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.6c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 2.7 14.6 2 12 2 8.2 2 5 4.2 3.4 6.8l3.3 2.5c.7-2.3 2.8-3.7 5.3-3.7Z"
      />
    </svg>
  );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please provide your first and last name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptTerms) {
      setError("You must accept the terms to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signup(email, password, {
        firstName,
        lastName,
        role: "expert",
      });
      if (result.needsEmailVerification) {
        setSuccessMessage("Account created. Check your email to verify your account.");
      } else {
        router.push("/account/experiences");
      }
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : "Sign up failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left */}
        <div className="flex flex-col items-center justify-center px-6 py-10 sm:px-10">
         

          <div className="w-full max-w-lg rounded-2xl">
          <Link href="/" className="flex items-center gap-1">
            <span className="rounded-full bg-orange-500 px-2 py-1 text-sm font-semibold text-white">
              Go
            </span>
            <span className="text-sm font-semibold tracking-tight">Zuru</span>
          </Link>
            <h1 className="text-3xl lg:mt-10 mt-5 font-bold tracking-tight">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign up to book experts—or host experiences on GOZURU.
            </p>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    First name <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    className="h-10 rounded-xl"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Last name <span className="text-orange-500">*</span>
                  </label>
                  <Input
                    className="h-10 rounded-xl"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Email <span className="text-orange-500">*</span>
                </label>
                <Input
                  type="email"
                  className="h-10 rounded-xl"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Password <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="h-10 rounded-xl pr-10"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Confirm password <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-10 rounded-xl pr-10"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-xl text-muted-foreground transition hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  className="mt-0.5 size-4 rounded border border-input bg-transparent"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  required
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground">
                  I agree to the{" "}
                  <Link href="#" className="underline underline-offset-2">
                    Terms of Use
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </label>
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-full bg-orange-500 text-white hover:bg-orange-600"
                disabled={submitting}
              >
                {submitting ? "Creating account..." : "Sign up"}
              </Button>

              {error ? <p className="text-center text-xs text-red-500">{error}</p> : null}
              {successMessage ? (
                <p className="text-center text-xs text-green-600">{successMessage}</p>
              ) : null}

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  data-icon="inline-start"
                  className="h-10 justify-center gap-2 rounded-full bg-background px-4 shadow-sm transition hover:bg-muted"
                >
                  {GoogleIcon}
                  <span>Google</span>
                </Button>
                
              </div>

              <p className="pt-2 text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-semibold text-orange-500">
                  Log in
                </Link>
              </p>
            </form>
          </div>
        </div>

        {/* Right */}
        <div className="relative hidden overflow-hidden lg:block">
          <Image
            src={sideImage}
            alt="Gozuru background"
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/35 to-black/10" />
          <div className="absolute right-10 top-10 max-w-xs text-right text-white">
            <p className="text-2xl font-semibold leading-tight">
              Reward
              <br />
              your
              <br />
              curiosity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

