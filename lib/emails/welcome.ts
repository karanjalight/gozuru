type WelcomeEmailParams = {
  firstName?: string;
  siteUrl: string;
};

export function buildWelcomeEmailHtml({ firstName, siteUrl }: WelcomeEmailParams): string {
  const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi there,";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welcome to Gozuru</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 32px 16px;">
                <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#f97316;">Gozuru</p>
                <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;font-weight:700;color:#0f172a;">Welcome to Gozuru</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">${greeting}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">
                  Thanks for creating your account. Gozuru connects curious travelers with knowledgeable local experts,
                  masters, and curators so you can discover the world through real human connection.
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#334155;">
                  Start exploring experiences, connect with hosts, and reward your curiosity.
                </p>
                <a href="${siteUrl}" style="display:inline-block;background-color:#f97316;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:9999px;">
                  Explore Gozuru
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;border-top:1px solid #f1f5f9;">
                <p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#64748b;">
                  Questions? Reply to this email or reach us at
                  <a href="mailto:hello@gozuru.com" style="color:#f97316;text-decoration:none;">hello@gozuru.com</a>.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#94a3b8;">Reward your curiosity.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();
}

export function buildWelcomeEmailText({ firstName, siteUrl }: WelcomeEmailParams): string {
  const greeting = firstName?.trim() ? `Hi ${firstName.trim()},` : "Hi there,";

  return `${greeting}

Welcome to Gozuru!

Thanks for creating your account. Gozuru connects curious travelers with knowledgeable local experts, masters, and curators so you can discover the world through real human connection.

Start exploring experiences, connect with hosts, and reward your curiosity.

Explore Gozuru: ${siteUrl}

Questions? Reach us at hello@gozuru.com.

Reward your curiosity.`;
}
