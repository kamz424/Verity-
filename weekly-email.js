// ============================================================
// Verity Insight – Weekly Email Code Node (FIXED)
// n8n Code Node – generates HTML email from Google Reviews data
// ============================================================

// Make sure text is a string
const item = $input.first().json;

// ── Get the ACTUAL reviews from the Filter node output ────────
// The Filter node outputs: { reviews: [...], reviewCount: X, avgRating: Y, ... }
const reviews = item.reviews || [];

// Parse reviews if it's a string
// FIX: use reviewsArray consistently for length and calculations
const reviewsArray = typeof reviews === 'string' ? JSON.parse(reviews) : reviews;
const reviewCount  = reviewsArray.length; // Use actual array length, not the property

const avgRating = reviewCount > 0
  ? reviewsArray.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount
  : 0;

// ── Business info from the merged data ───────────────────────
const businessName = item.businessName || 'Grand Hotel';
const rawLocation  = item.Location || item.location || '';
const location     = (rawLocation === 'undefined' || rawLocation === 'null') ? '' : rawLocation;
const ownerEmail   = item.ownerEmail || '';

// ── AI text – ALWAYS cast to string to prevent .split errors ──
// FIX: was `item.text || item.summaryText || ''` without String() cast,
//      causing "text.split is not a function" when the value is not a string.
const aiText = String(item.text || item.summaryText || '');

// ── Analyze ACTUAL reviews only ───────────────────────────────
const analyzeReviews = () => {
  const themes = { positive: [], negative: [], allTexts: [] };
  if (reviewCount === 0) return themes;

  // Track how many reviews mention each theme so we surface real patterns
  const negCounts = {};
  const posCounts = {};

  const negChecks = [
    ['Cleanliness issues',    w => /filthy|dirty|stain|unclean|disgust|gross|filth|mold|mould|smell|odou?r|grimy|grease|dust|grime|germ|unhygienic/.test(w)],
    ['Pest infestation',      w => /cockroach|pest|rodent|mouse|rat|insect|ant|spider|fly|flies|vermin|bug/.test(w)],
    ['Service delays',        w => /wait|waiting|took (too |forever|ages|long)|ignored|delay|slow service|no response|never came|long (time|queue)|understaffed/.test(w)],
    ['Staff behaviour',       w => /rude|unprofessional|unfriendly|disrespectful|attitude|dismissive|unhelpful|condescending|impolite|mean|snarky|horrible staff|terrible staff|bad staff|worst staff|incompetent/.test(w)],
    ['Noise complaints',      w => /nois(y|e)|loud|thin wall|party|music too|disruptive|disturb|couldn.t sleep|kept.*awake/.test(w)],
    ['Maintenance issues',    w => /broken|doesn.t work|not working|out of order|damage|maintenance|needs? (fix|repair)|faulty|leak|drip|mould|crack/.test(w)],
    ['Value concerns',        w => /overpriced|expensive|rip.?off|not worth|waste of money|overcharge|too (pricey|much)/.test(w)],
  ];

  const posChecks = [
    ['Cleanliness',           w => /spotless|immaculate|pristine|sparkling|very clean|super clean/.test(w) || (w.includes('clean') && !/dirty|unclean/.test(w))],
    ['Great staff service',   w => /friendly|helpful|professional|kind|wonderful|amazing staff|great staff|excellent staff|courteous|attentive|warm|welcoming|polite/.test(w)],
    ['Room comfort',          w => /comfortable|cozy|comfy|spacious|lovely room|great room|beautiful room|perfect room|nice room/.test(w)],
    ['Good location',         w => /great location|perfect location|well.?located|convenient|central|close to|easy access/.test(w)],
    ['Good value',            w => /great value|worth (it|every)|affordable|reasonable price|fair price|bang for|good deal/.test(w)],
    ['Food quality',          w => /delicious|great food|amazing food|tasty|excellent (food|meal|breakfast|dinner)/.test(w)],
  ];

  reviewsArray.forEach(review => {
    const text = String(review.comment || '').toLowerCase();
    if (!text) return;
    themes.allTexts.push(text);
    negChecks.forEach(([label, fn]) => { if (fn(text)) negCounts[label] = (negCounts[label] || 0) + 1; });
    posChecks.forEach(([label, fn]) => { if (fn(text)) posCounts[label] = (posCounts[label] || 0) + 1; });
  });

  // Sort by frequency, format as "Theme (N)" so the count is available to actions
  themes.negative = Object.entries(negCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`);
  themes.positive = Object.entries(posCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} (${n})`);
  return themes;
};

const themes = analyzeReviews();

// ── Generate summary from REAL data only ──────────────────────
const generateQuickSummary = () => {
  if (reviewCount === 0)
    return 'No reviews received this week. Monitor incoming feedback to stay updated on guest sentiment.';
  let summary = `${businessName} received ${reviewCount} review${reviewCount !== 1 ? 's' : ''} this week with an average rating of ${avgRating.toFixed(1)}/5.0. `;
  if (avgRating >= 4)      summary += 'Strong performance with positive guest feedback.';
  else if (avgRating >= 3) summary += 'Mixed feedback indicates room for improvement.';
  else                     summary += 'Critical issues detected requiring immediate attention.';
  return summary;
};

// ── Parse AI content – DON'T use if it contradicts real data ──
const parseAIContent = (text) => {
  const data = { commonThemes: [], topPositives: [], topNegatives: [] };
  if (!text || reviewCount === 0) return data;

  // text is already a string (cast above) – safe to call .split
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  let currentSection = null;

  for (const line of lines) {
    if      (line.startsWith('### Common Themes:'))  currentSection = 'themes';
    else if (line.startsWith('### Top Positives:'))  currentSection = 'positives';
    else if (line.startsWith('### Top Negatives:'))  currentSection = 'negatives';
    else if (line.startsWith('###'))                 currentSection = null;
    else if ((line.startsWith('- ') || line.startsWith('• ')) && currentSection) {
      // FIX: was "/**/g" (invalid/empty block comment used as regex) –
      //      must be /\*\*/g to strip markdown bold markers (**)
      const clean = line.slice(2).replace(/\*\*/g, '').trim();
      if (currentSection === 'themes')    data.commonThemes.push(clean);
      else if (currentSection === 'positives') data.topPositives.push(clean);
      else if (currentSection === 'negatives') data.topNegatives.push(clean);
    }
  }
  return data;
};

const aiData = parseAIContent(aiText);

// ── Use REAL analyzed themes, fall back to AI only if empty ───
const commonThemes = themes.negative.length > 0 ? themes.negative
  : (aiData.commonThemes.length > 0 ? aiData.commonThemes : []);
const topPositives = themes.positive.length > 0 ? themes.positive
  : (aiData.topPositives.length > 0 ? aiData.topPositives : []);
const topNegatives = themes.negative.length > 0 ? themes.negative
  : (aiData.topNegatives.length > 0 ? aiData.topNegatives : []);

const quickSummary = generateQuickSummary();

// ── Sentiment ─────────────────────────────────────────────────
const sentiment = (() => {
  if (reviewCount === 0) return { label: 'NO DATA',         score: 0,  color: '#6b7280' };
  if (avgRating >= 4)    return { label: 'POSITIVE',        score: 85, color: '#10b981' };
  if (avgRating >= 3)    return { label: 'MIXED',           score: 60, color: '#f59e0b' };
  return                        { label: 'NEEDS ATTENTION', score: 25, color: '#ef4444' };
})();

// ── Helpers ───────────────────────────────────────────────────
const ratingColor = avgRating < 2 ? '#ef4444' : avgRating < 3.5 ? '#f59e0b' : '#10b981';

const getStarDisplay = (rating) => {
  if (rating === 0) return '<span style="color:#d1d5db;font-size:20px;">☆☆☆☆☆</span>';
  const fullStars  = Math.floor(rating);
  const hasHalf    = (rating - fullStars) >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const full  = '<span style="color:#fbbf24;font-size:20px;line-height:1;display:inline-block;vertical-align:middle;">★</span>';
  const empty = '<span style="color:#d1d5db;font-size:20px;line-height:1;display:inline-block;vertical-align:middle;">★</span>';
  // Half star: left half filled orange, right half gray.
  // Uses nested overflow:hidden — avoids position:absolute which email clients strip.
  const half =
    '<span style="display:inline-block;overflow:hidden;width:11px;vertical-align:middle;">' +
      '<span style="display:inline-block;font-size:20px;line-height:1;color:#fbbf24;white-space:nowrap;">★</span>' +
    '</span>' +
    '<span style="display:inline-block;overflow:hidden;width:11px;vertical-align:middle;">' +
      '<span style="display:inline-block;font-size:20px;line-height:1;color:#d1d5db;white-space:nowrap;margin-left:-11px;">★</span>' +
    '</span>';
  let html = full.repeat(fullStars) + (hasHalf ? half : '') + empty.repeat(emptyStars);
  return html;
};

const starDisplay = getStarDisplay(avgRating);
const dateDisplay = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// FIX: HTML entity escaping was incomplete – & and < were present but > was missing its semicolon
const esc = (s) => String(s || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// ── HTML section builders ─────────────────────────────────────
// Use table rows instead of flex — flex gap is stripped by Gmail and Outlook.
const themesHtml = commonThemes.length > 0
  ? commonThemes.map((t, i) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:12px 0;${i < commonThemes.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : ''}">
      <tr>
        <td width="18" style="vertical-align:middle;padding-right:12px;">
          <div style="width:8px;height:8px;border-radius:50%;background-color:#f97316;"></div>
        </td>
        <td style="font-size:14px;color:#374151;line-height:1.5;vertical-align:middle;">${esc(t)}</td>
      </tr>
    </table>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;margin:0;">No recurring themes identified this week.</p>';

const positivesHtml = topPositives.length > 0
  ? topPositives.map(t => `
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 0;">
      <tr>
        <td width="24" style="vertical-align:top;padding-right:10px;padding-top:1px;">
          <span style="color:#10b981;font-size:16px;font-weight:700;">&#10003;</span>
        </td>
        <td style="font-size:14px;color:#374151;line-height:1.5;vertical-align:top;">${esc(t)}</td>
      </tr>
    </table>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;margin:0;">No positive themes identified this week.</p>';

const negativesHtml = topNegatives.length > 0
  ? topNegatives.map(t => `
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:10px 0;">
      <tr>
        <td width="24" style="vertical-align:top;padding-right:10px;padding-top:1px;">
          <span style="color:#ef4444;font-size:16px;font-weight:700;">!</span>
        </td>
        <td style="font-size:14px;color:#374151;line-height:1.5;vertical-align:top;">${esc(t)}</td>
      </tr>
    </table>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;margin:0;">No negative themes identified this week.</p>';

const insightsHtml = (() => {
  if (reviewCount === 0)
    return '<p style="font-size:14px;color:#6b7280;">Insufficient data this week. Insights will generate once reviews are collected.</p>';
  const lines = [];
  if (avgRating >= 4)
    lines.push('Guest satisfaction is strong. Focus on consistency to maintain your rating.');
  else if (avgRating >= 3)
    lines.push('Your rating sits in the mid-range. Targeted improvements to the issues flagged above could move it significantly.');
  else
    lines.push("Your rating needs urgent attention. Prioritise the action items below before next week's report.");
  if (topNegatives.length > 0)
    lines.push(`The most common concern this week was: <strong>${esc(topNegatives[0])}</strong>. Resolving this single issue will have the greatest impact on your score.`);
  return lines.map(l => `<p style="font-size:14px;color:#4b5563;line-height:1.7;margin:0 0 10px;">${l}</p>`).join('');
})();

const actionsHtml = (() => {
  if (reviewCount === 0) {
    return `
      <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">&#128202; Start Collecting Reviews</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.6;">No reviews this week. Send a follow-up email to recent guests asking for feedback — even one or two responses will help you understand what's working.</div>
      </div>`;
  }

  const actions = [];
  const criticalCount = reviewsArray.filter(r => (Number(r.rating) || 0) <= 2).length;
  const oneStarCount  = reviewsArray.filter(r => (Number(r.rating) || 0) === 1).length;

  const themeCount = (label) => { const m = label.match(/\((\d+)\)/); return m ? Number(m[1]) : 1; };
  const negMatch   = (kw) => topNegatives.find(t => t.toLowerCase().includes(kw.toLowerCase()));

  // ── Priority 1: Unhappy guests (most urgent — always first if any) ─────────
  if (criticalCount > 0) {
    const extra = oneStarCount > 0 ? ` (${oneStarCount} gave 1&#8209;star)` : '';
    actions.push({ icon: '&#128222;', title: 'Reach Out to Unhappy Guests',
      body: `${criticalCount} guest${criticalCount !== 1 ? 's' : ''} rated you 2 stars or below${extra}. Contact them personally within 24 hours — a genuine apology can often turn a bad review around.` });
  }

  // ── Priority 2: Single biggest negative theme only ─────────────────────────
  const topNeg = topNegatives[0];
  if (topNeg && actions.length < 2) {
    const n     = themeCount(topNeg);
    const label = topNeg.replace(/\s*\(\d+\)$/, '');
    // FIX: match against label only (not all topNegatives) to avoid body/title mismatch
    const labelMatch = (kw) => label.toLowerCase().includes(kw.toLowerCase());
    let icon = '&#9888;', body = `${n} guest${n !== 1 ? 's' : ''} flagged this. Review the specific complaints and put a fix in place before next week.`;
    if      (labelMatch('Cleanliness'))   { icon = '&#129529;'; body = `${n} guest${n !== 1 ? 's' : ''} flagged cleanliness issues. Review your cleaning process and add a sign-off checklist before marking anything ready for the next customer.`; }
    else if (labelMatch('Service delay')) { icon = '&#9200;';   body = `${n} guest${n !== 1 ? 's' : ''} experienced long waits. Review staffing during peak hours and look at ways to speed up your service flow.`; }
    else if (labelMatch('Staff'))         { icon = '&#127892;'; body = `${n} guest${n !== 1 ? 's' : ''} had a poor experience with staff. Hold a short team briefing and revisit your customer service standards.`; }
    else if (labelMatch('Pest'))          { icon = '&#128027;'; body = `Pest complaints directly damage your reputation. Contact a licensed pest control service today and address the affected area immediately.`; }
    else if (labelMatch('Noise'))         { icon = '&#128263;'; body = `${n} guest${n !== 1 ? 's' : ''} were disturbed by noise. Investigate the source and put clear measures in place to reduce disruption.`; }
    else if (labelMatch('Maintenance'))   { icon = '&#128295;'; body = `${n} guest${n !== 1 ? 's' : ''} reported broken or faulty items. Do a walkthrough today and prioritise anything affecting the customer experience.`; }
    else if (labelMatch('Value'))         { icon = '&#128176;'; body = `Customers questioned your pricing. Make sure your offer clearly communicates value or consider adjusting expectations in your listing or menu.`; }
    actions.push({ icon, title: `Fix: ${label}`, body });
  }

  // ── Priority 3: Rating nudge or positive reinforcement ────────────────────
  if (actions.length < 3) {
    if (avgRating < 4) {
      actions.push({ icon: '&#11088;', title: 'Manage Your Online Rating',
        body: `At ${avgRating.toFixed(1)} stars you're losing potential bookings. Reply to negative reviews within 48 hours and start asking happy guests to leave a review.` });
    } else if (topPositives.length > 0) {
      const highlight = topPositives[0].replace(/\s*\(\d+\)$/, '').toLowerCase();
      actions.push({ icon: '&#128170;', title: "Keep Up What's Working",
        body: `Guests consistently praise your ${highlight}. Make sure every guest gets that same experience and highlight it in your marketing.` });
    }
  }

  // ── Fallback if still empty ────────────────────────────────────────────────
  if (actions.length === 0) {
    actions.push({ icon: '&#9989;', title: 'Maintain Your Standards',
      body: `${reviewCount} review${reviewCount !== 1 ? 's' : ''} at ${avgRating.toFixed(1)}/5.0 — solid week. Stay consistent and keep engaging with guest feedback.` });
  }

  return actions.map(a => `
    <div style="background:#ffffff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;margin-bottom:10px;">
      <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:8px;">${a.icon} ${esc(a.title)}</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.6;">${a.body}</div>
    </div>`).join('');
})();

// ── Full email HTML ───────────────────────────────────────────
const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Verity Insight – Weekly Report</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:40px 20px;">
<tr><td align="center">
<table width="100%" style="max-width:680px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#f97316 0%,#ea580c 100%);padding:40px 40px 32px;">
    <div style="font-size:13px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;opacity:0.85;">Verity Insight</div>
    <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;">Weekly Ops Briefing</div>
    <div style="font-size:15px;color:#ffffff;opacity:0.9;margin-bottom:0;">${esc(businessName)}${location ? ' &middot; ' + esc(location) : ''}</div>
    <div style="font-size:13px;color:#ffffff;opacity:0.7;margin-top:6px;">Week ending ${dateDisplay}</div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">

    <!-- Stats row (table-based for email client compatibility) -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
    <tr>
      <td width="33%" style="background:#f9fafb;border-radius:16px;padding:24px 16px;text-align:center;border:1px solid #e5e7eb;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Total Reviews</div>
        <div style="font-size:34px;font-weight:800;color:#f97316;line-height:1;margin-bottom:6px;">${reviewCount}</div>
        <div style="font-size:12px;color:#9ca3af;">this week</div>
      </td>
      <td width="4%"></td>
      <td width="33%" style="background:#f9fafb;border-radius:16px;padding:24px 16px;text-align:center;border:1px solid #e5e7eb;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Avg Rating</div>
        <div style="font-size:34px;font-weight:800;color:#f97316;line-height:1;margin-bottom:6px;">${avgRating.toFixed(1)}</div>
        <div style="margin-top:4px;white-space:nowrap;">${starDisplay}</div>
      </td>
      <td width="4%"></td>
      <td width="33%" style="background:#f9fafb;border-radius:16px;padding:24px 16px;text-align:center;border:1px solid #e5e7eb;">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px;">Sentiment</div>
        <div style="font-size:13px;font-weight:700;color:${sentiment.color};margin-bottom:4px;">${sentiment.label}</div>
        <div style="font-size:12px;color:#9ca3af;">${sentiment.score}/100</div>
      </td>
    </tr>
    </table>

    <!-- Rating bar -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #e5e7eb;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-size:14px;font-weight:700;color:#111827;">Rating Distribution</span>
        <span style="background-color:${ratingColor}20;color:${ratingColor};padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;">${avgRating.toFixed(1)}/5.0</span>
      </div>
      <div style="background-color:#e5e7eb;height:10px;border-radius:10px;overflow:hidden;margin-bottom:10px;">
        <div style="height:100%;background-color:${ratingColor};width:${Math.max(0, Math.min(100, (avgRating / 5) * 100)).toFixed(0)}%;border-radius:10px;"></div>
      </div>
      <div style="font-size:12px;color:#9ca3af;text-align:center;">Based on ${reviewCount} customer review${reviewCount !== 1 ? 's' : ''}</div>
    </div>

    <!-- Quick Summary -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px;border:1px solid #e5e7eb;border-left:5px solid ${ratingColor};">
      <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:12px;">📋 Quick Summary</div>
      <div style="font-size:14px;color:#4b5563;line-height:1.7;">${esc(quickSummary)}</div>
    </div>

    <!-- Common Themes -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-size:16px;font-weight:700;color:#f97316;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;">🎯 Common Themes</div>
      ${themesHtml}
    </div>

    <!-- Top Positives -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-size:16px;font-weight:700;color:#10b981;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;">✅ Top Positives</div>
      ${positivesHtml}
    </div>

    <!-- Top Negatives -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-size:16px;font-weight:700;color:#ef4444;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;">⚠️ Top Negatives</div>
      ${negativesHtml}
    </div>

    <!-- Verity Insight -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-size:16px;font-weight:700;color:#8b5cf6;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;">💡 Verity Insight</div>
      ${insightsHtml}
    </div>

    <!-- Actionable Improvements -->
    <div style="background-color:#f9fafb;border-radius:16px;padding:24px;margin-bottom:20px;border:1px solid #e5e7eb;">
      <div style="font-size:16px;font-weight:700;color:#f97316;margin-bottom:16px;padding-bottom:14px;border-bottom:2px solid #e5e7eb;">🚀 Actionable Improvements</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>${actionsHtml}</td>
      </tr></table>
    </div>

  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:28px 40px;border-top:1px solid #e5e7eb;text-align:center;">
    <div style="font-size:12px;color:#9ca3af;">Powered by <strong style="color:#f97316;font-weight:700;letter-spacing:0.5px;">Verity AI</strong></div>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;

// ── Output ────────────────────────────────────────────────────
// FIX: was missing closing "]" on the return array
return [{
  json: {
    subject:        `Weekly Ops Briefing – ${businessName} (${dateDisplay})`,
    emailHtml:      emailHtml,
    pdfHtml:        emailHtml,
    businessName:   businessName,
    location:       location,
    reviewCount:    reviewCount,
    avgRating:      avgRating,
    sentimentLabel: sentiment.label,
    sentimentScore: sentiment.score
  }
}];
