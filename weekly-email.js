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
const location     = item.Location || item.location || '';
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
const themesHtml = commonThemes.length > 0
  ? commonThemes.map((t, i) => `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 0;${i < commonThemes.length - 1 ? 'border-bottom:1px solid #e5e7eb;' : ''}">
      <div style="width:8px;height:8px;border-radius:50%;background-color:#f97316;flex-shrink:0;"></div>
      <span style="font-size:14px;color:#374151;line-height:1.5;">${esc(t)}</span>
    </div>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;">No recurring themes identified this week.</p>';

const positivesHtml = topPositives.length > 0
  ? topPositives.map(t => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;">
      <span style="color:#10b981;font-size:18px;flex-shrink:0;">✓</span>
      <span style="font-size:14px;color:#374151;line-height:1.5;">${esc(t)}</span>
    </div>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;">No positive themes identified this week.</p>';

const negativesHtml = topNegatives.length > 0
  ? topNegatives.map(t => `
    <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 0;">
      <span style="color:#ef4444;font-size:18px;flex-shrink:0;">!</span>
      <span style="font-size:14px;color:#374151;line-height:1.5;">${esc(t)}</span>
    </div>`).join('')
  : '<p style="color:#9ca3af;font-size:14px;">No negative themes identified this week.</p>';

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
        <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">📊 Start Collecting Reviews</div>
        <div style="font-size:13px;color:#6b7280;">No reviews this week. Send a follow-up email to recent guests asking for feedback — even one or two responses will help you understand what's working.</div>
      </div>`;
  }

  const actions = [];
  const criticalCount = reviewsArray.filter(r => (Number(r.rating) || 0) <= 2).length;
  const oneStarCount  = reviewsArray.filter(r => (Number(r.rating) || 0) === 1).length;

  // Helper: extract the count from a theme string like "Cleanliness issues (3)"
  const themeCount = (label) => {
    const match = label.match(/\((\d+)\)/);
    return match ? Number(match[1]) : 1;
  };

  // ── Rating-based action (always fires when there are critical reviews) ─────
  if (criticalCount > 0) {
    const extra = oneStarCount > 0 ? ` (${oneStarCount} gave 1 star)` : '';
    actions.push({ icon: '📞', title: 'Reach Out to Unhappy Guests',
      body: `${criticalCount} guest${criticalCount !== 1 ? 's' : ''} rated you 2 stars or below${extra}. Contact them personally within 24 hours — a genuine apology and offer to make things right can recover the relationship and sometimes even the review.` });
  }

  // ── Theme-based actions (fire based on expanded keyword matching) ──────────
  const negMatch = (keyword) => topNegatives.find(t => t.toLowerCase().includes(keyword.toLowerCase()));

  const cleanTheme = negMatch('Cleanliness');
  if (cleanTheme) {
    const n = themeCount(cleanTheme);
    actions.push({ icon: '🧹', title: 'Fix Cleanliness Standards',
      body: `${n} guest${n !== 1 ? 's' : ''} flagged cleanliness. Walk through every room and shared space today — inspect what guests actually see. Update your housekeeping checklist and add a supervisor sign-off before any room is marked ready.` });
  }

  const serviceTheme = negMatch('Service delay') || negMatch('Service');
  if (serviceTheme) {
    const n = themeCount(serviceTheme);
    actions.push({ icon: '⏱️', title: 'Cut Response & Wait Times',
      body: `${n} guest${n !== 1 ? 's' : ''} mentioned slow service or long waits. Map your busiest hours and make sure staffing matches demand. If check-in is slow, consider a pre-arrival form to speed things up.` });
  }

  const staffTheme = negMatch('Staff');
  if (staffTheme) {
    const n = themeCount(staffTheme);
    actions.push({ icon: '🎓', title: 'Address Staff Behaviour',
      body: `${n} guest${n !== 1 ? 's' : ''} had a poor experience with staff. Hold a short team briefing this week — share specific examples from reviews (without naming guests) and revisit basic hospitality standards. Reinforce what good looks like.` });
  }

  const pestTheme = negMatch('Pest');
  if (pestTheme) {
    actions.push({ icon: '🐛', title: 'Pest Control — Act Immediately',
      body: 'Pest mentions in reviews are reputation killers. Call a licensed pest control service today, not next week. Document everything for compliance and close any affected rooms until cleared.' });
  }

  const noiseTheme = negMatch('Noise');
  if (noiseTheme) {
    const n = themeCount(noiseTheme);
    actions.push({ icon: '🔇', title: 'Reduce Noise Complaints',
      body: `${n} guest${n !== 1 ? 's' : ''} were disturbed by noise. Identify the source — neighbouring rooms, street noise, or internal operations. Implement a quiet-hours policy and communicate it clearly at check-in.` });
  }

  const maintTheme = negMatch('Maintenance');
  if (maintTheme) {
    const n = themeCount(maintTheme);
    actions.push({ icon: '🔧', title: 'Maintenance Walkthrough',
      body: `${n} guest${n !== 1 ? 's' : ''} mentioned broken or malfunctioning items. Do a full property walkthrough today and log everything that needs attention. Prioritise anything that directly affects comfort — heating, hot water, locks.` });
  }

  const valueTheme = negMatch('Value');
  if (valueTheme) {
    actions.push({ icon: '💰', title: 'Justify Your Pricing',
      body: `Guests questioned whether the price matched the experience. Either improve what's included (better toiletries, faster Wi-Fi, welcome drink) or make sure your listing accurately sets expectations so guests aren't surprised.` });
  }

  // ── Rating-level fallback (fires when no themes matched but rating is low) ──
  if (actions.length === 0 && avgRating < 4) {
    actions.push({ icon: '📈', title: 'Investigate What's Dragging Your Rating',
      body: `Your average is ${avgRating.toFixed(1)}/5.0 across ${reviewCount} review${reviewCount !== 1 ? 's' : ''} this week. Read every review carefully and pick the single most common complaint. Fix that one thing before the next report.` });
  }

  // ── Online reputation nudge (fires when rating is below 4) ────────────────
  if (avgRating < 4) {
    actions.push({ icon: '⭐', title: 'Actively Manage Your Online Rating',
      body: `At ${avgRating.toFixed(1)} stars, new guests are choosing competitors. Reply to every negative review within 48 hours — a thoughtful response shows you care and can soften the impact. Then start asking happy guests to share their experience online.` });
  }

  // ── Positive reinforcement (fires when doing well) ─────────────────────────
  if (topPositives.length > 0 && avgRating >= 4) {
    const highlights = topPositives.slice(0, 2).map(t => t.replace(/\s*\(\d+\)$/, '').toLowerCase()).join(' and ');
    actions.push({ icon: '💪', title: 'Double Down on What's Working',
      body: `Guests are consistently praising your ${highlights}. Highlight this in your listing photos and descriptions. Make sure new staff understand exactly what's driving these compliments so the standard doesn't slip.` });
  }

  // ── Final safety net ───────────────────────────────────────────────────────
  if (actions.length === 0) {
    actions.push({ icon: '✅', title: 'Maintain Your Standards',
      body: `${reviewCount} review${reviewCount !== 1 ? 's' : ''} this week with a ${avgRating.toFixed(1)}/5.0 average — solid performance. Stay visible: walk the property daily, chat with guests, and catch small issues before they make it into a review.` });
  }

  return actions.map(a => `
    <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;margin-bottom:10px;">
      <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">${a.icon} ${esc(a.title)}</div>
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
  <tr><td style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);padding:40px 40px 32px;">
    <div style="font-size:13px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Verity Insight</div>
    <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;">Weekly Ops Briefing</div>
    <div style="font-size:15px;color:#94a3b8;">${esc(businessName)}${location ? ' · ' + esc(location) : ''}</div>
    <div style="font-size:13px;color:#64748b;margin-top:6px;">Week ending ${dateDisplay}</div>
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
        <div style="margin-top:4px;">${starDisplay}</div>
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
    <div style="font-size:12px;color:#9ca3af;">This report was generated automatically by <strong style="color:#f97316;">Verity</strong> · Revelation Marketing</div>
    <div style="font-size:11px;color:#d1d5db;margin-top:6px;">You are receiving this because you are a Verity subscriber.</div>
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
