"""Sentry-Cron-Monitor-Konfiguration der Scheduler-Jobs: die Toleranz gegen
Deploy-Neustarts (checkin_margin + failure_issue_threshold>1) muss gesetzt sein,
damit ein einzelner verpasster Check-in beim Rebuild kein „Cron failure"-Issue
erzeugt (nur anhaltende Ausfälle sollen alarmieren)."""

from app.jobs import scheduler


def test_monitor_config_toleriert_deploy_neustarts():
    schedule = {"type": "interval", "value": 1, "unit": "minute"}
    cfg = scheduler._monitor_config(schedule)

    # Verspätete Check-ins (Scheduler kurz aus beim Neustart) sind tolerierbar …
    assert cfg["checkin_margin"] >= 1
    # … und ein einzelner Miss erzeugt noch kein Issue (erst mehrere in Folge).
    assert cfg["failure_issue_threshold"] >= 2
    # Erholung nach dem ersten erfolgreichen Check-in.
    assert cfg["recovery_threshold"] == 1
    # Schedule/Timezone werden unverändert durchgereicht.
    assert cfg["schedule"] == schedule
    assert cfg["timezone"] == scheduler.zeit.STANDARD_ZEITZONE
