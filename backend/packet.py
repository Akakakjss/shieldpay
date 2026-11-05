"""A real PDF; quoted evidence is data, never markup or an action."""
from io import BytesIO
from pathlib import Path
import unicodedata
from fastapi import HTTPException
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_NAME = "ShieldPayDejaVuMono"
pdfmetrics.registerFont(TTFont(FONT_NAME, str(Path(__file__).parent / "assets" / "fonts" / "DejaVuSansMono.ttf")))
pdfmetrics.registerFontFamily(FONT_NAME, normal=FONT_NAME, bold=FONT_NAME, italic=FONT_NAME, boldItalic=FONT_NAME)
from xml.sax.saxutils import escape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Preformatted


def assert_packet_text_supported(case):
    """Check bundled font coverage and restrict text to scripts without shaping.

    Combining marks, direction controls and scripts requiring shaping are rejected
    even when the font has a glyph. This is not general Unicode support.
    """
    analysis = case["analysis"]
    fields = [case[k] for k in ("id", "order_id", "reason")]
    fields += [analysis[k] for k in ("provider", "packet_hash", "recommendation", "summary")]
    for claim in analysis["claims"]:
        fields.extend(claim["source_ids"])
        fields.extend((claim["text"], claim["quote"]))
    for key in ("gaps", "contradictions", "limitations"):
        fields.extend(analysis[key])
    for source in case["sources"]:
        if source["order_id"] == case["order_id"]:
            fields.extend(source[k] for k in ("id", "title", "occurred_at", "sha256", "text"))
    for value in fields:
        for char in str(value):
            code = ord(char)
            in_safe_range = (0x20 <= code <= 0x024F or 0x0370 <= code <= 0x052F
                             or 0x2000 <= code <= 0x206F)
            category = unicodedata.category(char)
            supported = (in_safe_range and category[0] not in "CMZ"
                         and code in pdfmetrics.getFont(FONT_NAME).face.charWidths)
            if char == " ":
                supported = True
            if char != "\n" and not supported:
                raise HTTPException(status_code=422, detail=(
                    f"PDF packet cannot safely render U+{code:04X}. "
                    "This packet format cannot preserve it; retain the original evidence and use another evidence format."
                ))


def build_pdf(case, mode):
    assert_packet_text_supported(case)
    analysis = case["analysis"]
    output = BytesIO()
    doc = SimpleDocTemplate(output, title="ShieldPay evidence packet", author="ShieldPay",
                            leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    for style in styles.byName.values():
        style.fontName = FONT_NAME
    mono = ParagraphStyle("Evidence", fontName=FONT_NAME, fontSize=7, leading=10, alignment=TA_LEFT)
    story = []
    def para(text, style="BodyText"):
        story.append(Paragraph(escape(str(text)), styles[style]))
        story.append(Spacer(1, 7))
    def raw(text):
        # Preformatted wraps long lines and does not interpret XML from evidence.
        story.append(Preformatted(str(text), mono, maxLineLength=110))
        story.append(Spacer(1, 8))
    para("ShieldPay evidence review packet", "Title")
    para("SYNTHETIC DEMO - NOT REAL MERCHANT EVIDENCE" if mode == "demo" else "SANDBOX ONLY - HUMAN REVIEW REQUIRED", "Heading2")
    para("Case: " + case["id"] + " | Order: " + case["order_id"])
    para("Reason: " + case["reason"])
    para("Analysis provider: " + analysis["provider"] + "; embeddings rank excerpts, deterministic policy checks consistency.")
    para("Packet hash (SHA256 content manifest):")
    raw(analysis["packet_hash"])
    para(analysis["recommendation"] + ": " + analysis["summary"], "Heading2")
    for claim in analysis["claims"]:
        para("[" + ", ".join(claim["source_ids"]) + "] " + claim["text"])
        raw(claim["quote"])
    for heading, values in [("Gaps", analysis["gaps"]), ("Contradictions", analysis["contradictions"]), ("Limitations", analysis["limitations"])]:
        para(heading, "Heading2")
        for value in values or ["None identified by deterministic checks; human validation still required."]:
            para(value)
    para("Scoped source manifest and original text", "Heading2")
    for source in sorted(case["sources"], key=lambda s:s["id"]):
        if source["order_id"] != case["order_id"]:
            continue
        para(source["id"] + " | " + source["title"], "Heading3")
        para("Occurred at: " + source["occurred_at"])
        raw("SHA256: " + source["sha256"])
        raw(source["text"])
    para("This packet is not legal advice, a fraud accusation, a win prediction, or a guarantee of fund release. A local approval is NOT a PayPal submission.")
    doc.build(story)
    return output.getvalue()
