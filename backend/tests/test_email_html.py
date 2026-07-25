import base64
from pathlib import Path

from app.core.config import settings
from app.services import email_template_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier

# 1x1 transparentes PNG
_PNG_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


async def test_render_html_enthaelt_organisation_und_text(db):
    await config_service.set(db, "organisation_name", "Freiwillige Feuerwehr Test")
    html = await email_template_service.render_html(db, "Testbetreff", "Erste Zeile\nZweite Zeile")
    assert "Freiwillige Feuerwehr Test" in html
    assert "Testbetreff" in html
    assert "Erste Zeile" in html
    assert "Zweite Zeile" in html


async def test_render_html_ohne_logo_konfiguration_kein_img_tag(db):
    await config_service.set(db, "logo_url", "")
    html = await email_template_service.render_html(db, "Betreff", "Inhalt")
    assert "<img" not in html


async def test_render_html_mit_logo_und_basis_url_enthaelt_absolute_url(db):
    await config_service.set(db, "logo_url", "/uploads/logo.png")
    await config_service.set(db, "oeffentliche_basis_url", "https://fw.beispiel.de")
    html = await email_template_service.render_html(db, "Betreff", "Inhalt")
    assert 'src="https://fw.beispiel.de/uploads/logo.png"' in html


async def test_render_html_escaped_nutzereingaben(db):
    """autoescape muss greifen, damit z. B. ein Organisationsname mit
    spitzen Klammern keine fremde Mail-HTML einschleusen kann."""
    await config_service.set(db, "organisation_name", "<script>alert(1)</script>")
    html = await email_template_service.render_html(db, "Betreff", "Inhalt")
    assert "<script>" not in html
    assert "&lt;script&gt;" in html


async def test_versenden_baut_multipart_mit_html_alternative(db, monkeypatch):
    gesendete_nachricht = {}

    async def fake_send(message, **kwargs):
        gesendete_nachricht["message"] = message

    monkeypatch.setattr("app.services.notifier.email.aiosmtplib.send", fake_send)
    await config_service.set(db, "organisation_name", "Test-Wehr")

    notifier = EmailNotifier()
    await notifier._versenden(db, "Betreff", "Hallo Welt", empfaenger_liste=["a@example.org"])

    message = gesendete_nachricht["message"]
    assert message.is_multipart()
    html_parts = [p for p in message.walk() if p.get_content_type() == "text/html"]
    text_parts = [p for p in message.walk() if p.get_content_type() == "text/plain"]
    assert len(html_parts) == 1
    assert len(text_parts) == 1
    assert "Test-Wehr" in html_parts[0].get_content()
    assert "Hallo Welt" in text_parts[0].get_content()


async def test_render_html_mit_code_zeigt_grossen_block(db):
    html = await email_template_service.render_html(db, "Login-Code", "Nur 10 Minuten gültig.", code="123456")
    # Code steht im groß gestylten Block …
    assert "123456" in html
    assert "font-size:40px" in html
    # … ohne Code kein großer Block.
    ohne = await email_template_service.render_html(db, "Betreff", "Inhalt")
    assert "font-size:40px" not in ohne


async def test_versenden_mit_code_html_gross_plaintext_fallback(db, monkeypatch):
    gesendete = {}

    async def fake_send(message, **kwargs):
        gesendete["message"] = message

    monkeypatch.setattr("app.services.notifier.email.aiosmtplib.send", fake_send)
    await EmailNotifier()._versenden(
        db, "Login-Code", "Nur 10 Minuten gültig.", empfaenger_liste=["a@example.org"], code="123456"
    )

    message = gesendete["message"]
    html = [p for p in message.walk() if p.get_content_type() == "text/html"][0].get_content()
    text = [p for p in message.walk() if p.get_content_type() == "text/plain"][0].get_content()
    assert "123456" in html and "font-size:40px" in html
    assert "123456" in text  # Fallback für Text-Clients


def test_lokales_logo_png_nur_fuer_vorhandenes_png():
    # SVG / leer -> None
    assert email_template_service.lokales_logo_png("") is None
    assert email_template_service.lokales_logo_png("/uploads/logo.svg") is None
    assert email_template_service.lokales_logo_png("/uploads/fehlt.png") is None
    # vorhandenes PNG -> bytes
    pfad = Path(settings.upload_dir) / "testlogo_unit.png"
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_bytes(_PNG_BYTES)
    try:
        assert email_template_service.lokales_logo_png("/uploads/testlogo_unit.png") == _PNG_BYTES
    finally:
        pfad.unlink(missing_ok=True)


async def test_versenden_bettet_logo_inline_ein(db, monkeypatch):
    gesendete = {}

    async def fake_send(message, **kwargs):
        gesendete["message"] = message

    monkeypatch.setattr("app.services.notifier.email.aiosmtplib.send", fake_send)

    pfad = Path(settings.upload_dir) / "testlogo_mail.png"
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_bytes(_PNG_BYTES)
    await config_service.set(db, "logo_url", "/uploads/testlogo_mail.png")
    try:
        await EmailNotifier()._versenden(db, "Betreff", "Text", empfaenger_liste=["a@example.org"])
    finally:
        pfad.unlink(missing_ok=True)

    message = gesendete["message"]
    bild_parts = [p for p in message.walk() if p.get_content_type() == "image/png"]
    assert len(bild_parts) == 1
    assert bild_parts[0].get("Content-ID") == "<logo>"
    html_part = [p for p in message.walk() if p.get_content_type() == "text/html"][0]
    assert 'src="cid:logo"' in html_part.get_content()
