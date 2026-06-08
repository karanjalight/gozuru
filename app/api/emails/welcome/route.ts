import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildWelcomeEmailHtml, buildWelcomeEmailText } from "@/lib/emails/welcome";

type WelcomeEmailPayload = {
  userId?: string;
  email?: string;
  firstName?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WELCOME_EMAIL_WINDOW_MS = 15 * 60 * 1000;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? "Gozuru <onboarding@resend.dev>";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gozuru.com";

export async function POST(request: NextRequest) {
  try {
    if (!resendApiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 500 });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase service role configuration is missing." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as WelcomeEmailPayload;
    const userId = body.userId?.trim();
    const email = body.email?.trim().toLowerCase() ?? "";
    const firstName = body.firstName?.trim();

    if (!userId || !email || !emailPattern.test(email)) {
      return NextResponse.json({ error: "A valid user id and email are required." }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData.user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const authEmail = userData.user.email?.trim().toLowerCase() ?? "";
    if (authEmail !== email) {
      return NextResponse.json({ error: "Email does not match user." }, { status: 403 });
    }

    const createdAt = userData.user.created_at ? new Date(userData.user.created_at).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > WELCOME_EMAIL_WINDOW_MS) {
      return NextResponse.json({ error: "Welcome email is only available for new signups." }, { status: 403 });
    }

    const resend = new Resend(resendApiKey);
    const emailParams = { firstName, siteUrl };

    const { error: sendError } = await resend.emails.send({
      from: resendFromEmail,
      to: [email],
      subject: "Welcome to Gozuru",
      html: buildWelcomeEmailHtml(emailParams),
      text: buildWelcomeEmailText(emailParams),
    });

    if (sendError) {
      console.error("Failed to send welcome email:", sendError);
      return NextResponse.json({ error: "Failed to send welcome email." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Welcome email route failed:", error);
    return NextResponse.json({ error: "Unexpected error while sending welcome email." }, { status: 500 });
  }
}
