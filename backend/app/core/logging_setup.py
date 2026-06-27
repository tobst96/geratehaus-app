"""Bindet structlog an Pythons Standard-`logging`-Modul an, damit Sentrys
LoggingIntegration (siehe sentry_setup.py) Log-Zeilen sehen kann – ohne diese
Anbindung laufen structlog-Aufrufe komplett an `logging`-Handlern vorbei und
Sentry bekommt nie etwas davon mit, egal welche Integration konfiguriert ist.

Konsolen-Ausgabe bleibt dabei unverändert (gleicher ConsoleRenderer wie
structlogs bisheriger Default), nur der Render-Pfad läuft jetzt über einen
echten `logging.Handler`."""

import logging

import structlog


def konfiguriere_logging() -> None:
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            # format_exc_info hier NICHT – es würde exc_info in einen String
            # umwandeln bevor der stdlib-LogRecord entsteht, sodass Sentry's
            # LoggingIntegration nur Text statt ein echtes Exception-Tupel sieht
            # und Exceptions nicht korrekt gruppieren kann. Der ConsoleRenderer
            # im ProcessorFormatter unten rendert exc_info selbst.
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    handler = logging.StreamHandler()
    handler.setFormatter(
        structlog.stdlib.ProcessorFormatter(processor=structlog.dev.ConsoleRenderer(colors=False))
    )
    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)
