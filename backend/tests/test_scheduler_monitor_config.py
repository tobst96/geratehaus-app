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


def test_ein_minuten_job_toleriert_mehrminuetigen_deploy():
    """Der 1-Minuten-Job verpasst bei einem Container-Neustart mehrere
    AUFEINANDERFOLGENDE Minuten-Check-ins. Die Schwelle muss daher hoch genug sein,
    dass ein ~6-minütiger Deploy kein „Cron failure"-Issue erzeugt (Regression zu
    JAVASCRIPT-2Z)."""
    cfg = scheduler._monitor_config({"type": "interval", "value": 1, "unit": "minute"})
    assert cfg["failure_issue_threshold"] >= 6


def test_langsame_jobs_behalten_strenge_schwelle():
    """Tägliche/stündliche Jobs sollen NICHT gelockert werden – ein einzelner
    verpasster Tageslauf ist bereits ein echtes Problem."""
    taeglich = scheduler._monitor_config({"type": "crontab", "value": "0 3 * * *"})
    assert taeglich["failure_issue_threshold"] == scheduler.FAILURE_ISSUE_THRESHOLD
    viertelstunde = scheduler._monitor_config({"type": "interval", "value": 15, "unit": "minute"})
    assert viertelstunde["failure_issue_threshold"] == scheduler.FAILURE_ISSUE_THRESHOLD
