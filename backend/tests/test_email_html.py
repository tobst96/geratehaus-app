from app.services import email_template_service
from app.services.config_service import config_service
from app.services.notifier.email import EmailNotifier


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
