import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApproveBody {
  userId?: string;
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireSecret(name: string): string {
  const value = Deno.env.get(name)?.trim() ?? "";
  if (!value) {
    throw new Error(`Missing Edge Function secret: ${name}`);
  }
  return value;
}

async function sendTemporaryPasswordEmail(params: {
  toEmail: string;
  temporaryPassword: string;
}) {
  const gmailUser = requireSecret("GMAIL_USER");
  const gmailAppPassword = requireSecret("GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  const fromEmail =
    Deno.env.get("PASSWORD_RESET_FROM_EMAIL")?.trim() ||
    `Project Tracker <${gmailUser}>`;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  await transporter.sendMail({
    from: fromEmail,
    to: params.toEmail,
    subject: "Project Tracker temporary password",
    text: [
      "An administrator approved your Project Tracker password reset request.",
      "",
      `Temporary password: ${params.temporaryPassword}`,
      "",
      "Sign in with this temporary password, then set a new password immediately before using the application.",
      "",
      "If you did not request this reset, contact an administrator.",
    ].join("\n"),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) {
      return jsonResponse(500, { error: "Supabase environment is not configured." });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Authentication required." });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return jsonResponse(401, { error: "Authentication required." });
    }

    const body = (await req.json().catch(() => ({}))) as ApproveBody;
    const userId = body.userId?.trim();
    if (!userId) {
      return jsonResponse(400, { error: "userId is required." });
    }

    const { data: temporaryPassword, error: resetError } = await supabase.rpc(
      "admin_complete_password_reset",
      { target_user_id: userId },
    );

    if (resetError) {
      return jsonResponse(400, { error: resetError.message });
    }

    if (typeof temporaryPassword !== "string" || temporaryPassword.length !== 16) {
      return jsonResponse(500, { error: "Password reset did not return a valid temporary credential." });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile?.email) {
      return jsonResponse(200, {
        ok: true,
        emailed: false,
        temporaryPassword,
        error: "Temporary password was set, but the user email could not be loaded.",
      });
    }

    try {
      await sendTemporaryPasswordEmail({
        toEmail: profile.email,
        temporaryPassword,
      });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : "Failed to send temporary password email.";
      return jsonResponse(200, {
        ok: true,
        emailed: false,
        email: profile.email,
        temporaryPassword,
        error: message,
      });
    }

    return jsonResponse(200, {
      ok: true,
      emailed: true,
      email: profile.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Password reset approval failed.";
    return jsonResponse(500, { error: message });
  }
});
