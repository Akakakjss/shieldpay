import pytest
from fastapi import HTTPException
from io import BytesIO
from pypdf import PdfReader

from backend.packet import assert_packet_text_supported, build_pdf


def packet_case(text):
    return {
        "id": "CASE-1", "order_id": "ORDER-1", "reason": "Dispute",
        "analysis": {"provider": "test", "packet_hash": "a" * 64,
                     "recommendation": "Review", "summary": "Summary",
                     "claims": [], "gaps": [], "contradictions": [], "limitations": []},
        "sources": [{"id": "SRC-1", "order_id": "ORDER-1", "title": "Evidence",
                     "occurred_at": "2026-01-01", "sha256": "b" * 64, "text": text}],
    }


def test_cjk_source_rejected_instead_of_silent_black_boxes():
    with pytest.raises(HTTPException) as error:
        build_pdf(packet_case("証拠"), "demo")
    assert error.value.status_code == 422
    assert "U+8A3C" in str(error.value.detail)


def test_emoji_is_rejected_by_reusable_preapproval_check():
    with pytest.raises(HTTPException) as error:
        assert_packet_text_supported(packet_case("Delivery 📦"))
    assert error.value.status_code == 422
    assert "U+1F4E6" in str(error.value.detail)


def test_latin_accents_source_and_citation_extract_exactly():
    case = packet_case("Café reçu à Montréal: élève & déjà vu.")
    case["analysis"]["claims"] = [{"source_ids": ["SRC-1"], "text": "Facturé", "quote": "Café reçu"}]
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(build_pdf(case, "demo"))).pages)
    assert case["sources"][0]["text"] in text
    assert "[SRC-1] Facturé" in text
    assert "Café reçu" in text


def test_latin1_repertoire_round_trips_in_source():
    text = "".join(chr(i) for i in range(0xA1, 0x100) if i != 0xAD)
    result = PdfReader(BytesIO(build_pdf(packet_case(text), "demo")))
    extracted = "\n".join(page.extract_text() for page in result.pages)
    assert text in extracted


@pytest.mark.parametrize("field", ["reason", "summary", "claim", "title"])
def test_preapproval_check_covers_non_source_text(field):
    case = packet_case("ordinary evidence")
    if field == "reason":
        case["reason"] = "証拠"
    elif field == "summary":
        case["analysis"]["summary"] = "証拠"
    elif field == "claim":
        case["analysis"]["claims"] = [{"source_ids": ["SRC-1"], "text": "証拠", "quote": "ordinary"}]
    else:
        case["sources"][0]["title"] = "証拠"
    with pytest.raises(HTTPException) as error:
        assert_packet_text_supported(case)
    assert error.value.status_code == 422
