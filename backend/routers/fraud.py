import json
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from fraud.engine import build_context, evaluate

router = APIRouter(prefix="/fraud", tags=["fraud"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class RuleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    condition: dict
    action: models.FraudRuleAction
    severity: models.FraudSeverity
    priority: int = 50
    is_active: bool = True
    created_by: str = "analyst"


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    condition: Optional[dict] = None
    action: Optional[models.FraudRuleAction] = None
    severity: Optional[models.FraudSeverity] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


class RuleResponse(BaseModel):
    rule_id: int
    name: str
    description: Optional[str]
    condition: dict
    action: models.FraudRuleAction
    severity: models.FraudSeverity
    priority: int
    is_active: bool
    created_by: str
    hit_count: int
    last_hit_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_rule(cls, rule: models.FraudRule) -> "RuleResponse":
        d = {c.name: getattr(rule, c.name) for c in rule.__table__.columns}
        d["condition"] = json.loads(rule.condition) if isinstance(rule.condition, str) else rule.condition
        return cls(**d)


class AlertResponse(BaseModel):
    alert_id: int
    transaction_id: int
    customer_id: int
    rule_id: int
    rule_name: Optional[str] = None
    action: models.FraudRuleAction
    severity: models.FraudSeverity
    status: models.FraudAlertStatus
    rule_snapshot: Optional[dict]
    context_snapshot: Optional[dict]
    analyst_notes: Optional[str]
    reviewed_by: Optional[str]
    created_at: datetime
    reviewed_at: Optional[datetime]

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_alert(cls, alert: models.FraudAlert) -> "AlertResponse":
        return cls(
            alert_id=alert.alert_id,
            transaction_id=alert.transaction_id,
            customer_id=alert.customer_id,
            rule_id=alert.rule_id,
            rule_name=alert.rule.name if alert.rule else None,
            action=alert.action,
            severity=alert.severity,
            status=alert.status,
            rule_snapshot=json.loads(alert.rule_snapshot) if alert.rule_snapshot else None,
            context_snapshot=json.loads(alert.context_snapshot) if alert.context_snapshot else None,
            analyst_notes=alert.analyst_notes,
            reviewed_by=alert.reviewed_by,
            created_at=alert.created_at,
            reviewed_at=alert.reviewed_at,
        )


class AlertActionRequest(BaseModel):
    analyst_email: str
    notes: Optional[str] = None


class TestRuleRequest(BaseModel):
    condition: dict
    context: dict


# ── Rules ─────────────────────────────────────────────────────────────────────

@router.get("/rules", response_model=List[RuleResponse])
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(models.FraudRule).order_by(models.FraudRule.priority).all()
    return [RuleResponse.from_orm_rule(r) for r in rules]


@router.post("/rules", response_model=RuleResponse, status_code=201)
def create_rule(body: RuleCreate, db: Session = Depends(get_db)):
    rule = models.FraudRule(
        name=body.name,
        description=body.description,
        condition=json.dumps(body.condition),
        action=body.action,
        severity=body.severity,
        priority=body.priority,
        is_active=body.is_active,
        created_by=body.created_by,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return RuleResponse.from_orm_rule(rule)


@router.get("/rules/{rule_id}", response_model=RuleResponse)
def get_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(models.FraudRule).filter(models.FraudRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    return RuleResponse.from_orm_rule(rule)


@router.patch("/rules/{rule_id}", response_model=RuleResponse)
def update_rule(rule_id: int, body: RuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(models.FraudRule).filter(models.FraudRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    updates = body.model_dump(exclude_none=True)
    if "condition" in updates:
        updates["condition"] = json.dumps(updates["condition"])
    for k, v in updates.items():
        setattr(rule, k, v)
    db.commit()
    db.refresh(rule)
    return RuleResponse.from_orm_rule(rule)


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: int, db: Session = Depends(get_db)):
    rule = db.query(models.FraudRule).filter(models.FraudRule.rule_id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.is_active = False
    db.commit()


@router.post("/rules/test")
def test_rule(body: TestRuleRequest):
    from fraud.engine import _eval_condition
    try:
        matched = _eval_condition(body.condition, body.context)
        return {"matched": matched, "context": body.context}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Alerts ────────────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=List[AlertResponse])
def list_alerts(
    status: Optional[models.FraudAlertStatus] = Query(default=None),
    severity: Optional[models.FraudSeverity] = Query(default=None),
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(models.FraudAlert)
    if status:
        q = q.filter(models.FraudAlert.status == status)
    if severity:
        q = q.filter(models.FraudAlert.severity == severity)
    alerts = q.order_by(models.FraudAlert.created_at.desc()).offset(skip).limit(limit).all()
    return [AlertResponse.from_orm_alert(a) for a in alerts]


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(models.FraudAlert).filter(models.FraudAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return AlertResponse.from_orm_alert(alert)


def _resolve_alert(alert_id, new_status, body, db):
    alert = db.query(models.FraudAlert).filter(models.FraudAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = new_status
    alert.reviewed_by = body.analyst_email
    alert.analyst_notes = body.notes
    alert.reviewed_at = datetime.utcnow()
    return alert


@router.patch("/alerts/{alert_id}/approve")
def approve_alert(alert_id: int, body: AlertActionRequest, db: Session = Depends(get_db)):
    alert = _resolve_alert(alert_id, models.FraudAlertStatus.approved, body, db)
    txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == alert.transaction_id).first()
    if txn and txn.status == models.TransactionStatus.pending:
        account = db.query(models.Account).filter(models.Account.account_id == txn.account_id).first()
        new_balance = Decimal(str(account.balance)) - Decimal(str(txn.amount))
        account.balance = new_balance
        txn.status = models.TransactionStatus.completed
        txn.balance_after = new_balance
    db.commit()
    return {"status": "approved", "alert_id": alert_id}


@router.patch("/alerts/{alert_id}/reject")
def reject_alert(alert_id: int, body: AlertActionRequest, db: Session = Depends(get_db)):
    alert = _resolve_alert(alert_id, models.FraudAlertStatus.rejected, body, db)
    txn = db.query(models.Transaction).filter(models.Transaction.transaction_id == alert.transaction_id).first()
    if txn and txn.status == models.TransactionStatus.pending:
        txn.status = models.TransactionStatus.failed
    db.commit()
    return {"status": "rejected", "alert_id": alert_id}


@router.patch("/alerts/{alert_id}/investigate")
def investigate_alert(alert_id: int, body: AlertActionRequest, db: Session = Depends(get_db)):
    alert = _resolve_alert(alert_id, models.FraudAlertStatus.investigating, body, db)
    db.commit()
    return {"status": "investigating", "alert_id": alert_id}


@router.patch("/alerts/{alert_id}/false-positive")
def false_positive_alert(alert_id: int, body: AlertActionRequest, db: Session = Depends(get_db)):
    alert = _resolve_alert(alert_id, models.FraudAlertStatus.false_positive, body, db)
    db.commit()
    return {"status": "false_positive", "alert_id": alert_id}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_alerts = db.query(models.FraudAlert).count()
    open_alerts = db.query(models.FraudAlert).filter(models.FraudAlert.status == models.FraudAlertStatus.open).count()
    by_severity = {}
    for sev in models.FraudSeverity:
        by_severity[sev.value] = db.query(models.FraudAlert).filter(models.FraudAlert.severity == sev).count()
    by_action = {}
    for act in models.FraudRuleAction:
        by_action[act.value] = db.query(models.FraudAlert).filter(models.FraudAlert.action == act).count()
    top_rules = (
        db.query(models.FraudRule)
        .filter(models.FraudRule.hit_count > 0)
        .order_by(models.FraudRule.hit_count.desc())
        .limit(5)
        .all()
    )
    return {
        "total_alerts": total_alerts,
        "open_alerts": open_alerts,
        "by_severity": by_severity,
        "by_action": by_action,
        "top_rules": [{"name": r.name, "hit_count": r.hit_count, "action": r.action} for r in top_rules],
    }
