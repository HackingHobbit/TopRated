from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "TopRatedCC_Site_Audit_Fillable_2026-09-08.pdf"
PAGE_WIDTH, PAGE_HEIGHT = letter
LEFT = 0.65 * inch
RIGHT = 0.65 * inch
TOP = 0.7 * inch
BOTTOM = 0.7 * inch
CONTENT_WIDTH = PAGE_WIDTH - LEFT - RIGHT

SECTIONS = [
    (
        "High Priority",
        [
            (
                "P1",
                "Lint fails on the event admin page",
                "EventsClient calls Date.now() during render. npm run lint currently fails with a React purity error, even though the production build passes.",
            ),
            (
                "P1",
                "Events are not persisted reliably in Supabase",
                "No Supabase migration creates an events table. In Supabase mode, event writes can fall through to data/db.json, which is not reliable persistence on Netlify/serverless hosting.",
            ),
            (
                "P1",
                "Future events are hidden before their start date",
                "The homepage event filter requires the current time to be after the start date, despite the section being labeled Upcoming Events.",
            ),
            (
                "P1",
                "Live event data contains test or stale content",
                "The deployed homepage currently shows Friday Nigh Stuff / Friday night. Replace it with real event content or remove it.",
            ),
            (
                "P1",
                "Checkout inventory updates have a race condition",
                "Checkout reads quantity and later writes a calculated quantity. Concurrent orders can read the same stock and overwrite each other. Use an atomic database decrement and stock check.",
            ),
            (
                "P1",
                "Payment can succeed while order persistence fails",
                "Clover is charged before orders and order_items are inserted. An insert failure could leave a customer charged without a completed order. Add idempotency and reconciliation handling.",
            ),
        ],
    ),
    (
        "Medium Priority",
        [
            (
                "P2",
                "No route-level error or loading states",
                "There are no error.tsx or loading.tsx files. Supabase or checkout failures can produce poor fallback behavior, and data-heavy pages block while loading.",
            ),
            (
                "P2",
                "Footer social buttons are dead links",
                "Facebook, Twitter, and Instagram buttons still point to #. Add the real profiles or remove the buttons.",
            ),
            (
                "P2",
                "Admin inventory renders the full catalog at once",
                "Search and filters exist, but roughly 432 products still render together. Add pagination or virtualization for better admin performance and mobile usability.",
            ),
            (
                "P2",
                "Remote event images use raw img elements",
                "Lint reports image optimization warnings for event images. Replace with next/image where practical, or document the intentional exception for arbitrary remote hosts.",
            ),
        ],
    ),
    (
        "Lower Priority",
        [
            (
                "P3",
                "Supabase product errors produce an empty catalog",
                "A product query failure returns an empty array, which can make the storefront look empty during a Supabase outage. Add a visible outage state or controlled fallback.",
            ),
            (
                "P3",
                "Content Security Policy is functional but permissive",
                "The current CSP uses unsafe-inline and allows all HTTPS image sources. Consider nonce-based scripts and narrower image domains later.",
            ),
            (
                "P3",
                "Project roadmap contains stale historical items",
                "FRONTEND_BACKEND_TODO.md still lists completed work as next up. Refresh or archive the old roadmap so it reflects the current system.",
            ),
        ],
    ),
]

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=19,
    leading=23, alignment=TA_CENTER, textColor=colors.HexColor("#111827"),
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], fontSize=9, leading=12,
    alignment=TA_CENTER, textColor=colors.HexColor("#4b5563"),
)
section_style = ParagraphStyle(
    "Section", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=13, leading=16, textColor=colors.HexColor("#991b1b"),
)
item_style = ParagraphStyle(
    "Item", parent=styles["Normal"], fontSize=9.2, leading=12.2,
    textColor=colors.HexColor("#111827"),
)
info_style = ParagraphStyle(
    "Info", parent=styles["Normal"], fontSize=8.7, leading=11.5,
    textColor=colors.HexColor("#4b5563"),
)


def footer(pdf: canvas.Canvas, page_number: int) -> None:
    pdf.saveState()
    pdf.setStrokeColor(colors.HexColor("#d1d5db"))
    pdf.line(LEFT, 0.52 * inch, PAGE_WIDTH - RIGHT, 0.52 * inch)
    pdf.setFont("Helvetica", 7.5)
    pdf.setFillColor(colors.HexColor("#6b7280"))
    pdf.drawString(LEFT, 0.34 * inch, "TopRatedCC Site Audit - Fillable Checklist - 2026-09-08")
    pdf.drawRightString(PAGE_WIDTH - RIGHT, 0.34 * inch, f"Page {page_number}")
    pdf.restoreState()


def draw_header(pdf: canvas.Canvas, first_page: bool) -> float:
    y = PAGE_HEIGHT - TOP
    if first_page:
        title = Paragraph("TopRatedCC - Site Audit Checklist", title_style)
        _, h = title.wrap(CONTENT_WIDTH, 80)
        title.drawOn(pdf, LEFT, y - h)
        y -= h + 5
        subtitle = Paragraph(
            "Updated 2026-09-08 | Fillable checklist | Check each box as the item is fixed",
            subtitle_style,
        )
        _, h = subtitle.wrap(CONTENT_WIDTH, 40)
        subtitle.drawOn(pdf, LEFT, y - h)
        y -= h + 10
        note = Paragraph(
            "This PDF contains interactive AcroForm checkboxes. Open it in Preview, Acrobat, or another PDF editor to mark items complete. All boxes start unchecked.",
            info_style,
        )
        _, h = note.wrap(CONTENT_WIDTH, 60)
        note.drawOn(pdf, LEFT, y - h)
        y -= h + 15
    return y


def draw_item(pdf: canvas.Canvas, y: float, section_index: int, item_index: int, severity: str, title: str, note: str) -> float:
    title_text = f"<b>{escape(severity)} - {escape(title)}</b>"
    title_para = Paragraph(title_text, item_style)
    _, title_h = title_para.wrap(CONTENT_WIDTH - 28, 80)
    note_para = Paragraph(escape(note), info_style)
    _, note_h = note_para.wrap(CONTENT_WIDTH - 28, 120)
    block_h = title_h + note_h + 13

    if y - block_h < BOTTOM + 12:
        return -1

    field_name = f"audit_section_{section_index + 1}_item_{item_index + 1}"
    pdf.acroForm.checkbox(
        name=field_name,
        x=LEFT,
        y=y - 15,
        size=12,
        buttonStyle="check",
        borderWidth=1,
        borderColor=colors.HexColor("#6b7280"),
        fillColor=colors.white,
        textColor=colors.HexColor("#991b1b"),
        checked=False,
        tooltip=f"Mark fixed: {title}",
    )
    title_para.drawOn(pdf, LEFT + 23, y - title_h)
    note_para.drawOn(pdf, LEFT + 23, y - title_h - note_h - 2)
    return y - block_h


def main() -> None:
    pdf = canvas.Canvas(str(OUTPUT), pagesize=letter)
    pdf.setTitle("TopRatedCC Site Audit Checklist - Fillable")
    pdf.setAuthor("Top Rated Cards & Collectibles")
    page_number = 1
    y = draw_header(pdf, first_page=True)

    for section_index, (section_title, items) in enumerate(SECTIONS):
        section_para = Paragraph(escape(section_title), section_style)
        _, section_h = section_para.wrap(CONTENT_WIDTH, 40)
        if y - section_h - 10 < BOTTOM:
            footer(pdf, page_number)
            pdf.showPage()
            page_number += 1
            y = draw_header(pdf, first_page=False)
        section_para.drawOn(pdf, LEFT, y - section_h)
        y -= section_h + 8

        for item_index, (severity, title, note) in enumerate(items):
            next_y = draw_item(pdf, y, section_index, item_index, severity, title, note)
            if next_y < 0:
                footer(pdf, page_number)
                pdf.showPage()
                page_number += 1
                y = draw_header(pdf, first_page=False)
                section_para.drawOn(pdf, LEFT, y - section_h)
                y -= section_h + 8
                next_y = draw_item(pdf, y, section_index, item_index, severity, title, note)
            y = next_y

    if y - 80 < BOTTOM:
        footer(pdf, page_number)
        pdf.showPage()
        page_number += 1
        y = draw_header(pdf, first_page=False)
    summary = Paragraph(
        "<b>Verified working in the current audit:</b> live robots.txt and sitemap.xml, route-specific SEO metadata, product structured data, security headers, and the Clover product-image refresh. These are listed for context and do not require a checkbox in this action list.",
        info_style,
    )
    _, summary_h = summary.wrap(CONTENT_WIDTH, 90)
    summary.drawOn(pdf, LEFT, y - summary_h - 8)

    footer(pdf, page_number)
    pdf.save()
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
