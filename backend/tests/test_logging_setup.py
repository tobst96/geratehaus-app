import logging

import structlog

from app.core.logging_setup import konfiguriere_logging


def test_structlog_routet_ueber_stdlib_handler():
    """Ohne diese Anbindung würde Sentrys LoggingIntegration nichts von
    structlog-Aufrufen mitbekommen, da sie an stdlib-`logging`-Handlern
    ansetzt, structlog aber standardmäßig komplett daran vorbeiläuft."""
    konfiguriere_logging()

    root_logger = logging.getLogger()
    aufgezeichnet = []
    test_handler = logging.Handler()
    test_handler.emit = lambda record: aufgezeichnet.append(record)
    root_logger.addHandler(test_handler)
    try:
        structlog.get_logger("test_logging_setup").warning("testereignis", schluessel="wert")
    finally:
        root_logger.removeHandler(test_handler)

    assert any("testereignis" in r.getMessage() for r in aufgezeichnet)
    assert any(r.levelno == logging.WARNING for r in aufgezeichnet)
