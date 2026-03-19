 "use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sideImage =
  "https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=1600";

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

const MicrosoftIcon = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path fill="#F35325" d="M3 3h8v8H3V3Z" />
    <path fill="#81BC06" d="M13 3h8v8h-8V3Z" />
    <path fill="#05A6F0" d="M3 13h8v8H3v-8Z" />
    <path fill="#FFBA08" d="M13 13h8v8h-8v-8Z" />
  </svg>
);

const FacebookIcon = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      fill="#1877F2"
      d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18 3.9 22.9 9.1 24v-8.5H6V12h3.1V9.3c0-3.1 1.8-4.9 4.7-4.9 1.4 0 2.8.3 2.8.3v3H15.9c-1.5 0-2 .9-2 1.9V12H17l-.5 3.5h-2.6V24C20.1 22.9 24 18 24 12.1Z"
    />
    <path
      fill="#fff"
      d="M16.5 15.5 17 12h-3.1V9.6c0-1 .5-1.9 2-1.9h1.5v-3s-1.4-.3-2.8-.3c-2.9 0-4.7 1.8-4.7 4.9V12H6v3.5h3.1V24c1 .2 2 .3 2.9.3 1 0 2-.1 2.9-.3v-8.5h2.6Z"
    />
  </svg>
);

const AppleIcon = (
  <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
    <path
      fill="currentColor"
      d="M16.7 13.2c0-2 1.6-3 1.6-3-.9-1.3-2.3-1.5-2.8-1.5-1.2-.1-2.3.7-2.9.7-.6 0-1.5-.7-2.5-.7-1.3 0-2.5.8-3.2 1.9-1.3 2.3-.3 5.7.9 7.6.6.9 1.3 1.9 2.3 1.9.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6 1 0 1.7-1 2.3-1.9.7-1.1 1-2.1 1-2.2-.1 0-2-.8-2-3Z"
    />
    <path
      fill="currentColor"
      d="M14.9 6.8c.5-.7.9-1.7.8-2.7-1 .1-2 .7-2.6 1.4-.6.7-.9 1.7-.8 2.6 1 0 2-.6 2.6-1.3Z"
    />
  </svg>
);

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen  grid-cols-1 lg:grid-cols-2">
        {/* Left */}
        <div className="flex flex-col items-center justify-center px-6 py-10 sm:px-10">
          

          <div className="w-full max-w-lg rounded-2xl">
          <Link href="/" className="flex items-center gap-1">
            <span className="rounded-full bg-orange-500 px-2 py-1 text-sm font-semibold text-white">
              Go
            </span>
            <span className="text-sm font-semibold tracking-tight">Zuru</span>
          </Link>
            <h1 className="text-3xl  lg:mt-10 mt-5 font-bold tracking-tight">Welcome Back</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Log in to access your account
            </p>

            <form className="mt-8 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Email <span className="text-orange-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="merchant@mailinator.com"
                  className="h-10 rounded-xl bg-background"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Password <span className="text-orange-500">*</span>
                  </label>
                  <Link
                    href="#"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="h-10 rounded-xl pr-10"
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

              <div className="flex items-center gap-2">
                <input
                  id="remember"
                  type="checkbox"
                  className="size-4 rounded border border-input bg-transparent"
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground">
                  Remember me
                </label>
              </div>

              <Button
                className="h-10 w-full rounded-full bg-transparent text-foreground border border-input hover:bg-muted"
                variant="outline"
              >
                Log in
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-3 text-xs text-muted-foreground">
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
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="font-semibold text-orange-500">
                  Sign up
                </Link>
              </p>

              <p className="text-[11px] text-muted-foreground">
                By continuing, you agree to our{" "}
                <Link href="#" className="underline underline-offset-2">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="#" className="underline underline-offset-2">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>
        </div>

        {/* Right */}
        <div className="relative hidden overflow-hidden lg:block">
          <Image
            src="https://images.pexels.com/photos/28847004/pexels-photo-28847004.jpeg"
            alt="Gozuru background"
            fill
            priority
            className="object-cover"
            sizes="50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/35 to-black/10" />
          <div className="absolute right-10 top-10 max-w-xs text-right text-white">
            <p className="text-2xl font-semibold leading-tight">
              Because
              <br />
              Curiosity
              <br />
              Matters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

