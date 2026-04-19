from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.post("/", response_model=schemas.TransactionResponse, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.account_id == transaction.account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if account.status != models.AccountStatus.active:
        raise HTTPException(status_code=400, detail="Account is not active")

    customer = db.query(models.Customer).filter(models.Customer.customer_id == transaction.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if transaction.beneficiary_id:
        beneficiary = db.query(models.Beneficiary).filter(
            models.Beneficiary.beneficiary_id == transaction.beneficiary_id
        ).first()
        if not beneficiary:
            raise HTTPException(status_code=404, detail="Beneficiary not found")

    db_transaction = models.Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction


@router.get("/", response_model=List[schemas.TransactionResponse])
def list_transactions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Transaction).offset(skip).limit(limit).all()


@router.get("/account/{account_id}", response_model=List[schemas.TransactionResponse])
def get_account_transactions(
    account_id: int,
    skip: int = 0,
    limit: int = 100,
    transaction_type: Optional[models.TransactionType] = Query(default=None),
    db: Session = Depends(get_db),
):
    account = db.query(models.Account).filter(models.Account.account_id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    query = db.query(models.Transaction).filter(models.Transaction.account_id == account_id)
    if transaction_type:
        query = query.filter(models.Transaction.transaction_type == transaction_type)
    return query.order_by(models.Transaction.transaction_date.desc()).offset(skip).limit(limit).all()


@router.get("/customer/{customer_id}", response_model=List[schemas.TransactionResponse])
def get_customer_transactions(customer_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.customer_id == customer_id)
        .order_by(models.Transaction.transaction_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{transaction_id}", response_model=schemas.TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.transaction_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.patch("/{transaction_id}", response_model=schemas.TransactionResponse)
def update_transaction(transaction_id: int, updates: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.transaction_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction
