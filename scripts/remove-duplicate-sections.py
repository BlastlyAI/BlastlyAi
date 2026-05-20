#!/usr/bin/env python3
"""Remove the two duplicate scanner callout sections from Home.tsx.
Keep only the hero inline scanner. Also fix the placeholder text."""

content = open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx").read()

# ── 1. Remove SEO Health Scanner Callout section (lines 667-741) ──────────────
seo_section_start = '      {/* ── SEO Health Scanner Callout ── */}\n      <section className="py-16 border-y border-border bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5">'
seo_section_end = '      {/* ── Digital Presence Scanner Callout ── */}'

start_idx = content.find(seo_section_start)
end_idx = content.find(seo_section_end)

if start_idx == -1:
    print("ERROR: Could not find SEO Health Scanner Callout section start")
elif end_idx == -1:
    print("ERROR: Could not find Digital Presence Scanner Callout section end marker")
else:
    # Remove the SEO section (keep the Digital Presence section marker for next step)
    content = content[:start_idx] + content[end_idx:]
    print(f"✓ Removed SEO Health Scanner Callout section")

# ── 2. Remove Digital Presence Scanner Callout section ────────────────────────
dp_section_start = '      {/* ── Digital Presence Scanner Callout ── */}\n      <section className="py-20 bg-gradient-to-b from-transparent to-violet-950/10">'
dp_section_end = '      {/* ── Free Audit CTA ── */}'

start_idx = content.find(dp_section_start)
end_idx = content.find(dp_section_end)

if start_idx == -1:
    print("ERROR: Could not find Digital Presence Scanner Callout section start")
elif end_idx == -1:
    print("ERROR: Could not find Free Audit CTA marker")
else:
    content = content[:start_idx] + content[end_idx:]
    print(f"✓ Removed Digital Presence Scanner Callout section")

# ── 3. Fix the placeholder text in the hero URL input ─────────────────────────
content = content.replace(
    'placeholder="yourwebsite.com.au"',
    'placeholder="Enter your website here, e.g. yourbusiness.com.au"',
    1
)
print("✓ Fixed placeholder text")

# ── 4. Fix the button text to be more inviting ────────────────────────────────
content = content.replace(
    '    <>Scan My Business Free<ArrowRight className="w-4 h-4 ml-2" /></>',
    '    <>Scan My Business Free <ArrowRight className="w-4 h-4 ml-2" /></>',
    1
)

open("/home/ubuntu/promoflow-ai/client/src/pages/Home.tsx", "w").write(content)
print(f"SUCCESS: File now {len(content.splitlines())} lines")
