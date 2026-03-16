const items = $input.all();
const now = Date.now();

const isTrue = (v) => v === true || v === 'true' || v === 'TRUE' || v === 'True';

// Helper to calculate NEXT send timestamp (called ONCE when email is sent)
const calculateNextSendAt = (stage) => {
  let delayMs;
  if (stage === 'initial') {
    // 2-3 days random for followup_1
    delayMs = (2 + Math.random()) * 24 * 60 * 60 * 1000;
  } else if (stage === 'followup_1') {
    // 5-7 days random for followup_2
    delayMs = (5 + Math.random() * 2) * 24 * 60 * 60 * 1000;
  } else if (stage === 'followup_2') {
    // 7-14 days random for followup_3
    delayMs = (7 + Math.random() * 7) * 24 * 60 * 60 * 1000;
  } else {
    return null;
  }
  return new Date(now + delayMs).toISOString();
};

const initialHtml = (name, biz, flaggedCount) => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f2f2f2">
<tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:3px">
<tr><td style="padding:36px 38px 0 38px">

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">Hi ${name},</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">I ran a restaurant for years. The thing that used to drive me mad was checking Google, seeing a fake review or an unanswered complaint, and knowing customers were reading it and walking straight to the place down the road. So I built v<span style="color:#FF6B35">3</span>rity to fix it — and it worked well enough that I knew other owners needed it too.</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">Tommy, the owner of Rice Bowl Asian House, was one of the first people I brought it to. Same situation as you — reviews not being replied to, a couple of fake ones that had no business being up there. Three weeks in, he went from 4.1 to 4.6 stars without touching a single review himself.</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">I looked at ${biz} and saw the same thing. At least ${flaggedCount} reviews up there that break Google's guidelines and can be removed. A few with no reply. Customers are reading all of it.</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">Here is what v<span style="color:#FF6B35">3</span>rity does for restaurants like ${biz} every day:</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">Every new review gets an automatic reply in your tone of voice within the hour. You get alerted instantly if someone leaves a bad one. Anything that looks like a policy violation gets flagged and reported to Google for removal. And every week you get a full summary of what is being said, what your trends look like, and what needs your attention — all from one dashboard.</p>

<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">Most owners I speak to have no idea this level of control is even possible. Now you do.</p>

</td></tr>
<tr><td style="padding:20px 38px">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff3ee;border-radius:8px;border:1px solid #FF6B35">
<tr><td style="padding:24px">
<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#FF6B35;letter-spacing:1px;text-transform:uppercase">14-Day Free Trial</p>
<p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#1a1a1a">14 days free, no card needed. <a href="https://v3rity.co.uk" style="color:#FF6B35;text-decoration:none;font-weight:600">Start your free trial</a> — or just reply and I will tell you exactly which reviews on ${biz} we would go after first.</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 38px 28px 38px;border-top:1px solid #ebebeb">
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding-top:18px;font-size:14px;line-height:1.9;color:#1a1a1a">
Kamel<br>
<span style="color:#999;font-size:13px">Founder and CEO</span><br>
<span style="font-weight:800;font-size:15px;letter-spacing:-0.3px;color:#1a1a1a">v<span style="color:#FF6B35">3</span>rity</span>
</td></tr>
</table>
<p style="margin:18px 0 0 0;font-size:13px;color:#aaaaaa">ps. those ${flaggedCount} reviews are still live right now. the sooner we flag them the better the chance Google acts on them.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const followup1Html = (name, biz) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa">
<tr><td align="center" style="padding:40px 10px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e5e5">
<tr><td style="padding:32px 40px 0 40px">
<p style="margin:0;font-size:20px;font-weight:900;color:#111;letter-spacing:-0.5px">v<span style="color:#FF6B35">3</span>rity</p>
</td></tr>
<tr><td style="padding:24px 40px 0 40px">
<p style="margin:0;font-size:15px;color:#111;line-height:1.6">Hi ${name},</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">Just following up because this usually gets missed.</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">For restaurants like <strong>${biz}</strong>, the damage normally comes from 2 things:</p>
<ul style="margin:14px 0 0 20px;padding:0;font-size:14px;color:#333;line-height:1.8">
<li>bad or fake reviews sitting there unanswered</li>
<li>good reviews not being replied to, which hurts trust and repeat bookings</li>
</ul>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">v<span style="color:#FF6B35">3</span>rity handles both automatically - replies go out fast, fake reviews get flagged, and you get a clearer picture of what customers are actually saying.</p>
</td></tr>
<tr><td style="padding:28px 40px">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff3ee;border-radius:8px;border:1px solid #FF6B35">
<tr><td style="padding:24px">
<p style="margin:0;font-size:14px;color:#333;line-height:1.6"><strong>This matters because even a small ratings lift can mean more clicks, more trust, and more covers.</strong></p>
<p style="margin:16px 0 0 0">
<a href="https://v3rity.co.uk" style="display:inline-block;background:#FF6B35;color:#fff;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px">Start the 14-day free trial →</a>
</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px 32px 40px">
<p style="margin:0;font-size:13px;color:#666;line-height:1.6">If you want, reply and I'll show you exactly what kind of reviews we'd likely flag for ${biz}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const followup2Html = (name, biz) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa">
<tr><td align="center" style="padding:40px 10px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e5e5">
<tr><td style="padding:32px 40px 0 40px">
<p style="margin:0;font-size:20px;font-weight:900;color:#111;letter-spacing:-0.5px">v<span style="color:#FF6B35">3</span>rity</p>
</td></tr>
<tr><td style="padding:24px 40px 0 40px">
<p style="margin:0;font-size:15px;color:#111;line-height:1.6">Hi ${name},</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">Quick example of why this works:</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7"><strong>Rice Bowl Asian House</strong> used v<span style="color:#FF6B35">3</span>rity to detect fake reviews and automatically respond to every review that came in.</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">The result was simple: fewer missed reviews, stronger trust on their Google profile, and a better rating trend within weeks.</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">That same system would work for <strong>${biz}</strong> without adding more admin for your team.</p>
</td></tr>
<tr><td style="padding:28px 40px">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff3ee;border-radius:8px;border:1px solid #FF6B35">
<tr><td style="padding:24px">
<p style="margin:0;font-size:14px;color:#333;line-height:1.6">You don't need another tool to manage. We set it up for you, and it starts working in the background.</p>
<p style="margin:16px 0 0 0">
<a href="https://v3rity.co.uk" style="display:inline-block;background:#FF6B35;color:white;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px">Try the 14-day free trial →</a>
</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px 32px 40px">
<p style="margin:0;font-size:13px;color:#666;line-height:1.6">Happy to show you what the setup would look like for ${biz}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const followup3Html = (name, biz) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fafafa">
<tr><td align="center" style="padding:40px 10px">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #e5e5e5">
<tr><td style="padding:32px 40px 0 40px">
<p style="margin:0;font-size:20px;font-weight:900;color:#111;letter-spacing:-0.5px">v<span style="color:#FF6B35">3</span>rity</p>
</td></tr>
<tr><td style="padding:24px 40px 0 40px">
<p style="margin:0;font-size:15px;color:#111;line-height:1.6">Hi ${name},</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">Last message from me.</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">If <strong>${biz}</strong> wants to:</p>
<ul style="margin:14px 0 0 20px;padding:0;font-size:14px;color:#333;line-height:1.8">
<li>reply to every Google review faster</li>
<li>catch fake reviews before they hurt trust</li>
<li>understand what customers keep praising or complaining about</li>
</ul>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">that's exactly what v<span style="color:#FF6B35">3</span>rity is built for.</p>
<p style="margin:16px 0 0 0;font-size:15px;color:#333;line-height:1.7">Most owners leave this too long and keep losing bookings to poor review handling. Better to fix it while the profile is still recoverable.</p>
</td></tr>
<tr><td style="padding:28px 40px">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff3ee;border-radius:8px;border:1px solid #FF6B35">
<tr><td style="padding:24px">
<p style="margin:0;font-size:14px;color:#333;line-height:1.6"><strong>14-day free trial. Full setup done for you.</strong></p>
<p style="margin:16px 0 0 0">
<a href="https://v3rity.co.uk" style="display:inline-block;background:#FF6B35;color:white;padding:12px 22px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px">Start free trial →</a>
</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px 32px 40px">
<p style="margin:0;font-size:13px;color:#666;line-height:1.6">If now isn't the right time, no worries. But if you want a quick demo, just reply.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

const results = [];

for (const item of items) {
  const row = item.json;

  // Filter: Only process rows with row_number >= 2
  if (!row.row_number || row.row_number < 2) continue;

  // Skip if no email
  if (!row.Email) continue;

  // Skip if not active
  const status = String(row.Status || '').trim().toLowerCase();
  if (status !== 'active') continue;

  // Skip if already replied
  if (isTrue(row.Replied)) continue;

  const name = row.Name || 'there';
  const email = row.Email;
  const biz = row['Business Name'] || 'your business';
  const rowNumber = row.row_number;
  const flaggedCount = row['Flagged Reviews'] || row['flagged_reviews'] || 3;

  // Use the correct column names from the sheet
  const initialSent   = isTrue(row['initial_sent\n']);
  const followup1Sent = isTrue(row['followup_1_sent\n']);
  const followup2Sent = isTrue(row['followup_2_sent\n']);
  const followup3Sent = isTrue(row['followup_3_sent\n']);
  const nextSendAt    = row['Next Send At'];

  let stage = null;
  let htmlBody = '';
  let nextSendAtTimestamp = null;
  const subject = `${biz} - fake reviews are costing you bookings`;

  // Determine which stage to send
  if (!initialSent) {
    stage = 'initial';
    htmlBody = initialHtml(name, biz, flaggedCount);
    nextSendAtTimestamp = calculateNextSendAt('initial');
  } else if (initialSent && !followup1Sent) {
    if (nextSendAt && now >= new Date(nextSendAt).getTime()) {
      stage = 'followup_1';
      htmlBody = followup1Html(name, biz);
      nextSendAtTimestamp = calculateNextSendAt('followup_1');
    }
  } else if (followup1Sent && !followup2Sent) {
    if (nextSendAt && now >= new Date(nextSendAt).getTime()) {
      stage = 'followup_2';
      htmlBody = followup2Html(name, biz);
      nextSendAtTimestamp = calculateNextSendAt('followup_2');
    }
  } else if (followup2Sent && !followup3Sent) {
    if (nextSendAt && now >= new Date(nextSendAt).getTime()) {
      stage = 'followup_3';
      htmlBody = followup3Html(name, biz);
      nextSendAtTimestamp = null;
    }
  }

  if (stage) {
    results.push({
      json: {
        row_number:    rowNumber,
        name:          name,
        email:         email,
        business_name: biz,
        flagged_count: flaggedCount,
        stage:         stage,
        to:            email,
        subject:       subject,
        htmlBody:      htmlBody,
        nextSendAt:    nextSendAtTimestamp,
        Status:        row.Status,
        Replied:       row.Replied,
        'Thread ID':   row['Thread ID'] || row['thread_id\n'],
        'Last Sent At': row['Last Sent At']
      }
    });
  }
}

// Return ONLY the first eligible lead (ensures only ONE email is sent per execution)
return results.slice(0, 1);
