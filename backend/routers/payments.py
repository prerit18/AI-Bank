import json
from datetime import date, datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from fraud import cache as velocity_cache
from fraud.engine import build_context, evaluate

router = APIRouter(prefix="/payments", tags=["payments"])


class DepositRequest(BaseModel):
    account_id: int
    customer_id: int
    amount: Decimal
    description: str = "Funds added"


class TransferRequest(BaseModel):
    account_id: int
    customer_id: int
    beneficiary_id: int
    amount: Decimal
    reference: str | None = None
    description: str | None = None


class PaymentResponse(BaseModel):
    account: schemas.AccountResponse
    transaction: schemas.TransactionResponse
    fraud_action: str | None = None
    fraud_rule: str | None = None


def _get_active_account(db: Session, account_id: int, customer_id: int) -> models.Account:
    account = db.query(models.Account).filter(models.Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Account does not belong to this customer")
    if account.status != models.AccountStatus.active:
        raise HTTPException(status_code=400, detail="Account is not active")
    return account


def _update_rule_stats(db: Session, rule: models.FraudRule) -> None:
    rule.hit_count = (rule.hit_count or 0) + 1
    rule.last_hit_at = datetime.utcnow()


def _create_alert(db, txn, customer_id, rule, action, context) -> models.FraudAlert:
    alert = models.FraudAlert(
        transaction_id=txn.transaction_id,
        customer_id=customer_id,
        rule_id=rule.rule_id,
        action=action,
        severity=rule.severity,
        status=models.FraudAlertStatus.open,
        rule_snapshot=rule.condition,
        context_snapshot=json.dumps({k: str(v) for k, v in context.items()}),
    )
    db.add(alert)
    return alert


@router.post("/deposit", response_model=PaymentResponse)
def deposit(body: DepositRequest, db: Session = Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be greater than zero")
    account = _get_active_account(db, body.account_id, body.customer_id)
    new_balance = Decimal(str(account.balance)) + body.amount
    account.balance = new_balance
    txn = models.Transaction(
        account_id=account.account_id,
        customer_id=body.customer_id,
        transaction_type=models.TransactionType.credit,
        amount=body.amount,
        currency=account.currency,
        description=body.description,
        status=models.TransactionStatus.completed,
        transaction_date=date.today(),
        balance_after=new_balance,
    )
    db.add(txn)
    db.commit()
    db.refresh(account)
    db.refresh(txn)
    return {"account": account, "transaction": txn, "fraud_action": None, "fraud_rule": None}


@router.post("/transfer", response_model=PaymentResponse)
def transfer(body: TransferRequest, db: Session = Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be greater than zero")
    account = _get_active_account(db, body.account_id, body.customer_id)
    if Decimal(str(account.balance)) < body.amount:
        raise HTTPException(status_code=422, detail="Insufficient funds")
    beneficiary = db.query(models.Beneficiary).filter(
        models.Beneficiary.beneficiary_id == body.beneficiary_id,
        models.Beneficiary.customer_id == body.customer_id,
        models.Beneficiary.status == "active",
    ).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found or inactive")

    txn = models.Transaction(
        account_id=account.account_id,
        customer_id=body.customer_id,
        beneficiary_id=body.beneficiary_id,
        transaction_type=models.TransactionType.payment,
        amount=body.amount,
        currency=account.currency,
        description=body.description,
        reference=body.reference,
        status=models.TransactionStatus.pending,
        transaction_date=date.today(),
    )
    db.add(txn)
    db.flush()

    velocity = velocity_cache.get_velocity(body.customer_id)
    context = build_context(body.amount, account, beneficiary, velocity, db)
    active_rules = (
        db.query(models.FraudRule)
        .filter(models.FraudRule.is_active == True)
        .order_by(models.FraudRule.priority)
        .all()
    )
    action, matched_rule = evaluate(context, active_rules)

    if action == models.FraudRuleAction.block:
        txn.status = models.TransactionStatus.failed
        _update_rule_stats(db, matched_rule)
        _create_alert(db, txn, body.customer_id, matched_rule, action, context)
        db.commit()
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Payment blocked by fraud rule: {matched_rule.name}",
        )

    if action == models.FraudRuleAction.review:
        txn.status = models.TransactionStatus.pending
        _update_rule_stats(db, matched_rule)
        _create_alert(db, txn, body.customer_id, matched_rule, action, context)
        db.commit()
        db.refresh(txn)
        db.refresh(account)
        return {"account": account, "transaction": txn, "fraud_action": "review", "fraud_rule": matched_rule.name}

    new_balance = Decimal(str(account.balance)) - body.amount
    account.balance = new_balance
    txn.status = models.TransactionStatus.completed
    txn.balance_after = new_balance

    if action == models.FraudRuleAction.flag:
        _update_rule_stats(db, matched_rule)
        _create_alert(db, txn, body.customer_id, matched_rule, action, context)

    if beneficiary.is_internal and beneficiary.internal_account_id:
        recipient = db.query(models.Account).filter(
            models.Account.account_id == beneficiary.internal_account_id,
            models.Account.status == models.AccountStatus.active,
        ).first()
        if recipient:
            rec_bal = Decimal(str(recipient.balance)) + body.amount
            recipient.balance = rec_bal
            db.add(models.Transaction(
                account_id=recipient.account_id,
                customer_id=recipient.customer_id,
                transaction_type=models.TransactionType.credit,
                amount=body.amount,
                currency=recipient.currency,
                description=f"Transfer from {account.account_number}",
                reference=body.reference,
                status=models.TransactionStatus.completed,
                transaction_date=date.today(),
                balance_after=rec_bal,
            ))

    velocity_cache.record(body.customer_id, body.amount)
    db.commit()
    db.refresh(account)
    db.refresh(txn)
    return {
        "account": account,
        "transaction": txn,
        "fraud_action": action.value if action else None,
        "fraud_rule": matched_rule.name if matched_rule else None,
    }
