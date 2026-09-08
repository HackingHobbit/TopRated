from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "TopRatedCC_Site_Audit_Checklist_Updated_2026-09-07.pdf"

FIXED = True
OPEN = False


sections = [
    (
        "0. Highest Priority - Pricing Integrity",
        [
            (
                FIXED,
                'Sale badges show a fabricated "original price"',
                'Resolved: sale presentation no longer invents a reference price at render time.',
            ),
        ],
    ),
    (
        "1. Hurts Real Purchases",
        [
            (
                FIXED,
                "Guest checkout is unreachable",
                "Resolved: guests can proceed to checkout; sign-in is offered without blocking the purchase path.",
            ),
            (
                FIXED,
                "/cart is a dead 404",
                "Resolved: the standalone cart route exists.",
            ),
            (
                OPEN,
                "No error boundaries anywhere in the app",
                "Still open: add route-level error.tsx and loading.tsx states for graceful failures and loading.",
            ),
            (
                FIXED,
                "Admin Orders can never change status",
                "Resolved: staff can update order status from the admin Orders screen.",
            ),
        ],
    ),
    (
        "2. Visibly Broken / Dead Ends",
        [
            (FIXED, 'Footer "Sealed Products" and "Premium Singles" links are dead', "Resolved: footer links use real shop filters."),
            (FIXED, 'Footer "Merchandise" link is dead', "Resolved: footer points to the real Accessories taxonomy."),
            (FIXED, 'Footer "TCG Cards" -> Pokemon link', "Resolved: footer points to the working TCG filter."),
            (FIXED, "Get Directions does not point at the store", "Resolved: link opens a Google Maps query for the Windsor store address."),
            (FIXED, "Want-list does not survive a page refresh", "Resolved: want-list persists in localStorage."),
            (FIXED, "Editing/toggling a product blanks its Category", "Resolved: updateProduct derives the top-level category from the database category lookup."),
        ],
    ),
    (
        "3. Content Gaps - Trust & Compliance",
        [
            (FIXED, "No Privacy, Terms, Returns, Shipping, or FAQ pages exist", "Resolved: the policies page exists and is linked from the footer."),
            (FIXED, "Placeholder store address and phone number are still live", "Resolved: customer-facing address, phone, directions, and phone link use the real store details."),
            (FIXED, "Confirm support@topratedcards.com is a monitored inbox", "Resolved: support now uses the in-app contact form and admin Messages inbox."),
            (OPEN, "Account -> Settings shows raw internal dev notes to customers", "Still open: confirm the current account settings surface contains no internal development copy."),
            (FIXED, 'Admin "Customers" count includes staff/admin accounts', "Resolved: customer counts and directory queries filter to role = customer."),
            (FIXED, 'Homepage "Coming Next Month" event never resolves', "Resolved: homepage events come from managed data and expire one day after their end date."),
        ],
    ),
    (
        "4. SEO",
        [
            (FIXED, "No robots.txt or sitemap.xml", "Resolved: dynamic /robots.txt and /sitemap.xml routes include public pages and database products."),
            (FIXED, "Every page shares one identical generic title and meta description", "Resolved: public pages have route-specific metadata; product pages use generateMetadata."),
            (FIXED, "No Open Graph/Twitter tags, canonical URLs, or product structured data", "Resolved: canonical URLs, social preview metadata, and Product JSON-LD include price and availability."),
        ],
    ),
    (
        "5. Security Headers",
        [
            (FIXED, "No CSP, X-Frame-Options, Referrer-Policy, or Permissions-Policy", "Resolved: next.config.ts sets CSP, DENY framing, strict-origin referrers, Permissions-Policy, HSTS, and nosniff."),
        ],
    ),
    (
        "6. Accessibility",
        [
            (OPEN, "Several icon-only buttons have no accessible label", "Still open: audit navbar, cart drawer, and toast icon buttons for aria-label coverage."),
            (OPEN, "Muted gray text fails contrast standards", "Still open: raise --text-muted and verify contrast across storefront and admin surfaces."),
            (OPEN, "Admin product-edit form has unlabeled inputs", "Still open: associate each ProductEditModal label with its input using htmlFor/id."),
        ],
    ),
    (
        "7. Content Quality",
        [
            (OPEN, 'Live product name typo: "1000 Peice Marvel Puzzle"', "Still open: correct the product name in the database."),
            (OPEN, "Most of the catalog still shows generic stock photos", "Still open: replace placeholder imagery with verified product photography, prioritizing high-value items."),
        ],
    ),
    (
        "8. Minor / Cleanup",
        [
            (FIXED, "CartDrawer hardcodes its own $300 free-shipping threshold", "Resolved: CartDrawer uses the shared pricing constant."),
            (OPEN, "No loading.tsx anywhere", "Still open: add loading states and skeletons for data-heavy storefront and admin routes."),
        ],
    ),
]


styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "AuditTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=19,
    leading=23,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#111827"),
    spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "AuditSubtitle",
    parent=styles["Normal"],
    fontSize=9,
    leading=12,
    alignment=TA_CENTER,
    textColor=colors.HexColor("#4b5563"),
    spaceAfter=12,
)
section_style = ParagraphStyle(
    "AuditSection",
    parent=styles["Heading2"],
    fontName="Helvetica-Bold",
    fontSize=12,
    leading=15,
    textColor=colors.HexColor("#991b1b"),
    spaceBefore=8,
    spaceAfter=6,
)
item_style = ParagraphStyle(
    "AuditItem",
    parent=styles["Normal"],
    fontSize=9.2,
    leading=12.2,
    leftIndent=8,
    firstLineIndent=-8,
    spaceAfter=5,
    textColor=colors.HexColor("#111827"),
)
note_style = ParagraphStyle(
    "AuditNote",
    parent=styles["Normal"],
    fontSize=8.5,
    leading=11,
    leftIndent=17,
    textColor=colors.HexColor("#4b5563"),
    spaceAfter=7,
)
summary_style = ParagraphStyle(
    "AuditSummary",
    parent=styles["Normal"],
    fontSize=9.5,
    leading=13,
    textColor=colors.HexColor("#111827"),
    backColor=colors.HexColor("#f3f4f6"),
    borderColor=colors.HexColor("#d1d5db"),
    borderWidth=0.5,
    borderPadding=8,
    spaceBefore=10,
)


def footer(canvas, document):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#d1d5db"))
    canvas.line(0.65 * inch, 0.55 * inch, 7.85 * inch, 0.55 * inch)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#6b7280"))
    canvas.drawString(0.65 * inch, 0.36 * inch, "TopRatedCC Full Site Audit - Updated 2026-09-07")
    canvas.drawRightString(7.85 * inch, 0.36 * inch, f"Page {document.page}")
    canvas.restoreState()


def item_markup(is_fixed, title, note):
    if is_fixed:
        status = '<font color="#047857"><b>[X] FIXED</b></font>'
    else:
        status = '<font color="#b91c1c"><b>[ ] OPEN</b></font>'
    return f"{status} {escape(title)}<br/><font color=\"#4b5563\">{escape(note)}</font>"


fixed_count = sum(1 for _, items in sections for is_fixed, _, _ in items if is_fixed)
total_count = sum(len(items) for _, items in sections)

document = BaseDocTemplate(
    str(OUTPUT),
    pagesize=letter,
    rightMargin=0.65 * inch,
    leftMargin=0.65 * inch,
    topMargin=0.6 * inch,
    bottomMargin=0.75 * inch,
    title="TopRatedCC Full Site Audit Checklist - Updated",
    author="Top Rated Cards & Collectibles",
)
document.addPageTemplates([
    PageTemplate(
        id="audit",
        frames=[Frame(document.leftMargin, document.bottomMargin, document.width, document.height, id="normal")],
        onPage=footer,
    )
])

story = [
    Paragraph("TopRatedCC - Full Site Audit Checklist", title_style),
    Paragraph(
        f"Updated 2026-09-07 | Progress: <b>{fixed_count} of {total_count} items fixed</b> | Based on repository verification",
        subtitle_style,
    ),
    Paragraph(
        "[X] FIXED items are confirmed in the current codebase. [ ] OPEN items remain for a future pass. This updated copy supplements the original audit PDF; it does not alter the original file.",
        summary_style,
    ),
]

page_break_before = {2, 4, 6}
for index, (section_title, items) in enumerate(sections):
    if index in page_break_before:
        story.append(PageBreak())
    story.append(Paragraph(escape(section_title), section_style))
    for is_fixed, title, note in items:
        story.append(KeepTogether([Paragraph(item_markup(is_fixed, title, note), item_style)]))

story.extend(
    [
        Paragraph("Remaining Work", section_style),
        Paragraph(
            "The remaining audit items are concentrated in accessibility, error/loading states, product data cleanup, and verified product photography. The new SEO and security-hardening changes are included in the fixed count but are currently uncommitted in the repository.",
            summary_style,
        ),
    ]
)

document.build(story)
print(f"Wrote {OUTPUT}")