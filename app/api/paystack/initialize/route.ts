import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resolvePaystackCurrency } from "@/lib/booking/checkout";

type CartCheckoutItem = {
  availabilityId: string;
  guestsCount: number;
};

type InitializePayload = {
  experienceId: string;
  availabilityId?: string;
  guestsCount?: number;
  items?: CartCheckoutItem[];
  guestNote?: string;
};

type ExperienceRow = {
  id: string;
  title: string;
  price_amount: number | null;
  currency: string;
};

type AvailabilityRow = {
  id: string;
  price_amount: number | null;
  currency: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string);

function getSupabaseWithAuth(accessToken: string) {
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Use POST to initialize Paystack checkout." });
}

export async function POST(request: NextRequest) {
  try {
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing auth token. Please log in again." }, { status: 401 });
    }

    const authSupabase = getSupabaseWithAuth(accessToken);
    const { data: authData, error: authError } = await authSupabase.auth.getUser();
    const normalizedEmail = authData.user?.email?.trim().toLowerCase() ?? "";

    if (authError || !normalizedEmail) {
      return NextResponse.json(
        { error: "Could not read logged-in user email. Please sign in again." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as InitializePayload;
    const cartItems: CartCheckoutItem[] = body.items?.length
      ? body.items
      : body.availabilityId && Number.isFinite(Number(body.guestsCount))
        ? [{ availabilityId: body.availabilityId, guestsCount: Number(body.guestsCount) }]
        : [];

    if (!normalizedEmail || !body.experienceId || cartItems.length === 0) {
      return NextResponse.json({ error: "Invalid booking payload." }, { status: 400 });
    }

    for (const item of cartItems) {
      if (!item.availabilityId || !Number.isFinite(item.guestsCount) || item.guestsCount < 1) {
        return NextResponse.json({ error: "Invalid cart item." }, { status: 400 });
      }
    }

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email address for Paystack checkout. Update your account email and retry." },
        { status: 400 },
      );
    }

    const [{ data: experience, error: experienceError }, { data: slots, error: slotError }] =
      await Promise.all([
        supabase
          .from("experiences")
          .select("id,title,price_amount,currency")
          .eq("id", body.experienceId)
          .eq("status", "published")
          .single(),
        supabase.rpc("get_public_upcoming_slots", {
          p_experience_id: body.experienceId,
          p_limit: 50,
        }),
      ]);

    if (experienceError || !experience) {
      const reason = experienceError?.message ?? "Experience not found.";
      return NextResponse.json({ error: reason }, { status: 400 });
    }
    if (slotError) {
      return NextResponse.json({ error: slotError.message }, { status: 400 });
    }

    const exp = experience as ExperienceRow;
    const availabilityById = new Map(
      ((slots ?? []) as AvailabilityRow[]).map((item) => [item.id, item]),
    );

    let chargeAmountMajor = 0;
    let checkoutCurrency = exp.currency;

    for (const item of cartItems) {
      const availability = availabilityById.get(item.availabilityId);
      if (!availability) {
        return NextResponse.json(
          { error: "One or more selected slots are no longer available." },
          { status: 400 },
        );
      }

      const unitPrice = Number(availability.price_amount ?? exp.price_amount);
      const lineTotal = unitPrice * item.guestsCount;
      if (!Number.isFinite(lineTotal) || lineTotal <= 0) {
        return NextResponse.json(
          { error: "Invalid slot amount for checkout. Set a price above 0 on this availability." },
          { status: 400 },
        );
      }
      chargeAmountMajor += lineTotal;
      checkoutCurrency = availability.currency ?? exp.currency;
    }

    const paystackCurrency = resolvePaystackCurrency(checkoutCurrency);
    const amountMinor = Math.round(chargeAmountMajor * 100);
    const appBaseUrl = siteUrl || request.nextUrl.origin;
    const callbackUrl = `${appBaseUrl}/experiences/${body.experienceId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const initResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        amount: amountMinor,
        currency: paystackCurrency,
        callback_url: callbackUrl,
        metadata: {
          experienceId: body.experienceId,
          guestNote: (body.guestNote ?? "").trim() || null,
          cartItemsJson: JSON.stringify(
            cartItems.map((item) => ({
              availabilityId: item.availabilityId,
              guestsCount: item.guestsCount,
            })),
          ),
        },
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const initJson = (await initResponse.json()) as {
      status: boolean;
      message?: string;
      data?: { authorization_url: string; reference: string; access_code?: string };
    };

    if (!initResponse.ok || !initJson.status || !initJson.data?.reference || !initJson.data?.access_code) {
      return NextResponse.json(
        { error: initJson.message || "Failed to initialize Paystack modal transaction." },
        { status: 400 },
      );
    }

    const sessionItems = cartItems.map((item) => ({
      availabilityId: item.availabilityId,
      guestsCount: item.guestsCount,
    }));

    const { error: sessionError } = await authSupabase.rpc("create_checkout_session", {
      p_experience_id: body.experienceId,
      p_paystack_reference: initJson.data.reference,
      p_items: sessionItems,
      p_guest_note: (body.guestNote ?? "").trim() || null,
      p_amount_minor: amountMinor,
      p_currency: checkoutCurrency,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 400 });
    }

    return NextResponse.json({
      authorizationUrl: initJson.data.authorization_url,
      reference: initJson.data.reference,
      accessCode: initJson.data.access_code ?? null,
      amountMinor,
      currency: paystackCurrency,
      itemCount: cartItems.length,
      ticketCount: cartItems.reduce((sum, item) => sum + item.guestsCount, 0),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Paystack request timed out. Please retry." }, { status: 504 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initialize payment." },
      { status: 500 },
    );
  }
}
