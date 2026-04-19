from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardSummary(BaseModel):
    customer: schemas.CustomerResponse
    account: Optional[schemas.AccountResponse]
    recent_transactions: List[schemas.TransactionResponse]


@router.get("/summary/{customer_id}", response_model=DashboardSummary)
def get_summary(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    account = (
        db.query(models.Account)
        .filter(
            models.Account.customer_id == customer_id,
            models.Account.status == models.AccountStatus.active,
        )
        .first()
    )

    recent_transactions = []
    if account:
        recent_transactions = (
            db.query(models.Transaction)
            .filter(models.Transaction.account_id == account.account_id)
            .order_by(models.Transaction.transaction_date.desc(), models.Transaction.created_at.desc())
            .limit(10)
            .all()
        )

    return {
        "customer": customer,
        "account": account,
        "recent_transactions": recent_transactions,
    }
