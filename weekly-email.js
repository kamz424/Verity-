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

  reviewsArray.forEach(review => {
    const text = String(review.comment || '').toLowerCase();
    if (!text) return;

    themes.allTexts.push(text);

    // Extract themes from REAL reviews only
    if (text.includes('filthy') || text.includes('dirty') || text.includes('stains') || text.includes('clean'))
      themes.negative.push('Cleanliness issues');
    if (text.includes('cockroach') || text.includes('bug') || text.includes('pest'))
      themes.negative.push('Pest infestation');
    if (text.includes('wait') || text.includes('hours') || text.includes('ignored') || text.includes('delay'))
      themes.negative.push('Service delays');
    if (text.includes('rude') || text.includes('staff') || text.includes('unfriendly'))
      themes.negative.push('Staff issues');

    // Positive themes (if any)
    if (text.includes('clean') && !text.includes('dirty'))
      themes.positive.push('Cleanliness');
    if (text.includes('friendly') || text.includes('helpful'))
      themes.positive.push('Good service');
  });

  // FIX: was "…new Set(…)" (Unicode ellipsis) – must be "...new Set(...)" (spread operator)
  themes.positive = [...new Set(themes.positive)];
  themes.negative = [...new Set(themes.negative)];
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
  const hasHalf    = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  let html = '';
  for (let i = 0; i < fullStars;  i++) html += '<span style="color:#fbbf24;font-size:20px;">★</span>';
  if (hasHalf)                          html += '<span style="color:#fbbf24;font-size:20px;">⯪</span>';
  for (let i = 0; i < emptyStars; i++) html += '<span style="color:#d1d5db;font-size:20px;">★</span>';
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
        <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">📊 Monitor Incoming Reviews</div>
        <div style="font-size:13px;color:#6b7280;">Set up alerts to be notified as soon as new reviews arrive.</div>
      </div>`;
  }
  const actions = [];
  if (topNegatives.some(t => t.includes('Cleanliness')))
    actions.push({ icon: '🧹', title: 'Address Cleanliness',  body: 'Schedule a deep-clean audit and review housekeeping checklists.' });
  if (topNegatives.some(t => t.includes('Service')))
    actions.push({ icon: '⏱️', title: 'Reduce Wait Times',    body: 'Review staffing levels during peak hours and streamline check-in.' });
  if (topNegatives.some(t => t.includes('Staff')))
    actions.push({ icon: '🎓', title: 'Staff Training',       body: 'Schedule a refresher on guest-facing communication standards.' });
  if (topNegatives.some(t => t.includes('Pest')))
    actions.push({ icon: '🐛', title: 'Pest Control',         body: 'Contact a licensed pest control service immediately.' });
  if (actions.length === 0)
    actions.push({ icon: '⭐', title: 'Maintain Standards',   body: 'Great week — keep up the consistency and encourage guests to leave reviews.' });

  return actions.map(a => `
    <div style="background:#fff;border-radius:12px;padding:20px;border:1px solid #e5e7eb;">
      <div style="font-size:14px;font-weight:600;color:#111827;margin-bottom:8px;">${a.icon} ${esc(a.title)}</div>
      <div style="font-size:13px;color:#6b7280;">${esc(a.body)}</div>
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
