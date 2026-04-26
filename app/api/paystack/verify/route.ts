import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PaystackVerifyResponse = {
  status: boolean;
  message?: string;
  data?: {
    status: string;
    reference: string;
    metadata?: {
      experienceId?: string;
      availabilityId?: string;
      guestsCount?: number;
      guestNote?: string | null;
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

function getSupabaseWithAuth(accessToken: string) {
  return createClient(supabaseUrl as string, supabaseAnonKey as string, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!paystackSecretKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not configured." }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const { reference } = (await request.json()) as { reference?: string };
    if (!reference) {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      },
    );
    const verifyJson = (await verifyResponse.json()) as PaystackVerifyResponse;

    if (!verifyResponse.ok || !verifyJson.status || !verifyJson.data) {
      return NextResponse.json(
        { error: verifyJson.message || "Could not verify payment." },
        { status: 400 },
      );
    }

    if (verifyJson.data.status !== "success") {
      return NextResponse.json({ error: "Payment not successful." }, { status: 400 });
    }

    const metadata = verifyJson.data.metadata;
    const experienceId = metadata?.experienceId;
    const availabilityId = metadata?.availabilityId;
    const guestsCount = Number(metadata?.guestsCount);
    const guestNote = metadata?.guestNote ?? null;

    if (!experienceId || !availabilityId || !Number.isFinite(guestsCount) || guestsCount < 1) {
      return NextResponse.json({ error: "Payment metadata is incomplete." }, { status: 400 });
    }

    const supabase = getSupabaseWithAuth(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message ?? "Not authenticated." }, { status: 401 });
    }

    const { data: bookingId, error: bookingError } = await supabase.rpc("request_experience_booking", {
      p_experience_id: experienceId,
      p_availability_id: availabilityId,
      p_guests_count: guestsCount,
      p_guest_note: guestNote,
    });

    if (bookingError) {
      return NextResponse.json({ error: bookingError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, bookingId, alreadyExists: false, reference: verifyJson.data.reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to verify payment." },
      { status: 500 },
    );
  }
}
