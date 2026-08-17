from app.api.v1.gruppenfuehrer_meta import _version_zu_tag


def test_version_zu_tag():
    assert _version_zu_tag("0.4.0b1") == "v0.4.0-beta.1"
    assert _version_zu_tag("0.4.0") == "v0.4.0"
    assert _version_zu_tag("1.2.3a5") == "v1.2.3-alpha.5"
    assert _version_zu_tag("1.2.3rc2") == "v1.2.3-rc.2"
    assert _version_zu_tag("unbekannt") == "main"
    assert _version_zu_tag("komisch") == "main"
