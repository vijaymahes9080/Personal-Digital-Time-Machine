import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.infrastructure.agents.privacy_agent import privacy_agent

client = TestClient(app)

def test_privacy_agent_redaction():
    # 1. Test JWT redaction
    jwt_text = "Here is my token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c in my code."
    masked_jwt = privacy_agent.mask_text(jwt_text)
    assert "[REDACTED_JWT_TOKEN]" in masked_jwt
    assert "eyJhbGciOi" not in masked_jwt

    # 2. Test DB Connection redaction
    db_text = "Connect using postgres://user:secretpassword@localhost:5432/chronadb link."
    masked_db = privacy_agent.mask_text(db_text)
    assert "[REDACTED_DATABASE_CONNECTION]" in masked_db
    assert "secretpassword" not in masked_db

    # 3. Test IP & Email redactions
    ip_email_text = "Sent from user@example.com to server 192.168.1.100."
    masked = privacy_agent.mask_text(ip_email_text)
    assert "[REDACTED_EMAIL]" in masked
    assert "[REDACTED_IP]" in masked


def test_agent_api_endpoints():
    # 1. Test Projects Replay
    res_replay = client.get("/api/v1/projects/replay")
    assert res_replay.status_code == 200
    data_replay = res_replay.json()
    assert "project_name" in data_replay
    assert "files_changed" in data_replay
    assert len(data_replay["files_changed"]) >= 1

    # 2. Test Decisions
    res_decisions = client.get("/api/v1/decisions")
    assert res_decisions.status_code == 200
    data_dec = res_decisions.json()
    assert len(data_dec) >= 1
    assert "alternatives" in data_dec[0]

    # 3. Test Predictions
    res_preds = client.get("/api/v1/predictions")
    assert res_preds.status_code == 200
    data_preds = res_preds.json()
    assert "bug_risks" in data_preds
    assert "next_tasks" in data_preds
    assert len(data_preds["bug_risks"]) >= 1

    # 4. Test Evolution
    res_evol = client.get("/api/v1/evolution")
    assert res_evol.status_code == 200
    data_evol = res_evol.json()
    assert "tech_stats" in data_evol
    assert "milestones" in data_evol

    # 5. Test Research Docs
    res_research = client.get("/api/v1/research?q=Transformers")
    assert res_research.status_code == 200
    data_res = res_research.json()
    assert "citations" in data_res
    assert "literature_review" in data_res

    # 6. Test Reflection
    res_reflection = client.get("/api/v1/reflection")
    assert res_reflection.status_code == 200
    data_ref = res_reflection.json()
    assert "focus_score" in data_ref
    assert "achievements" in data_ref

    # 7. Test Analytics
    res_analytics = client.get("/api/v1/analytics")
    assert res_analytics.status_code == 200
    data_ana = res_analytics.json()
    assert "total_coding_hours" in data_ana
    assert "focus_score" in data_ana
    assert "apps_breakdown" in data_ana

    # 8. Test Creative Opportunities
    res_creative = client.get("/api/v1/creative")
    assert res_creative.status_code == 200
    data_cre = res_creative.json()
    assert "duplicates" in data_cre
    assert "innovations" in data_cre

    # 9. Test Brainstorm Endpoint
    res_brainstorm = client.post("/api/v1/creative/brainstorm", json={"topic": "Micro-frontend security"})
    assert res_brainstorm.status_code == 200
    data_brain = res_brainstorm.json()
    assert "title" in data_brain
    assert "description" in data_brain
    assert "reasoning" in data_brain

