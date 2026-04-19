from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

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


def _get_active_account(db: Session, account_id: int, customer_id: int) -> models.Account:
    account = db.query(models.Account).filter(models.Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.customer_id != customer_id:
        raise HTTPException(status_code=403, detail="Account does not belong to this customer")
    if account.status != models.AccountStatus.active:
        raise HTTPException(status_code=400, detail="Account is not active")
    return account


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
    return {"account": account, "transaction": txn}


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

    new_balance = Decimal(str(account.balance)) - body.amount
    account.balance = new_balance

    txn = models.Transaction(
        account_id=account.account_id,
        customer_id=body.customer_id,
        beneficiary_id=body.beneficiary_id,
        transaction_type=models.TransactionType.payment,
        amount=body.amount,
        currency=account.currency,
        description=body.description,
        reference=body.reference,
        status=models.TransactionStatus.completed,
        transaction_date=date.today(),
        balance_after=new_balance,
    )
    db.add(txn)

    # Credit the recipient if this is an internal beneficiary
    if beneficiary.is_internal and beneficiary.internal_account_id:
        recipient_account = db.query(models.Account).filter(
            models.Account.account_id == beneficiary.internal_account_id,
            models.Account.status == models.AccountStatus.active,
        ).first()
        if recipient_account:
            recipient_new_balance = Decimal(str(recipient_account.balance)) + body.amount
            recipient_account.balance = recipient_new_balance
            credit_txn = models.Transaction(
                account_id=recipient_account.account_id,
                customer_id=recipient_account.customer_id,
                transaction_type=models.TransactionType.credit,
                amount=body.amount,
                currency=recipient_account.currency,
                description=f"Transfer from {account.account_number}",
                reference=body.reference,
                status=models.TransactionStatus.completed,
                transaction_date=date.today(),
                balance_after=recipient_new_balance,
            )
            db.add(credit_txn)

    db.commit()
    db.refresh(account)
    db.refresh(txn)
    return {"account": account, "transaction": txn}
