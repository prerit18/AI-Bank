from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

router = APIRouter(prefix="/beneficiaries", tags=["beneficiaries"])


@router.post("/", response_model=schemas.BeneficiaryResponse, status_code=status.HTTP_201_CREATED)
def create_beneficiary(beneficiary: schemas.BeneficiaryCreate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.customer_id == beneficiary.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if beneficiary.is_internal:
        if not beneficiary.internal_customer_id or not beneficiary.internal_account_id:
            raise HTTPException(
                status_code=400,
                detail="internal_customer_id and internal_account_id are required for internal beneficiaries"
            )
        internal_account = db.query(models.Account).filter(
            models.Account.account_id == beneficiary.internal_account_id,
            models.Account.customer_id == beneficiary.internal_customer_id
        ).first()
        if not internal_account:
            raise HTTPException(status_code=404, detail="Internal account not found")

    db_beneficiary = models.Beneficiary(**beneficiary.model_dump())
    db.add(db_beneficiary)
    db.commit()
    db.refresh(db_beneficiary)
    return db_beneficiary


@router.get("/", response_model=List[schemas.BeneficiaryResponse])
def list_beneficiaries(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Beneficiary).offset(skip).limit(limit).all()


@router.get("/customer/{customer_id}", response_model=List[schemas.BeneficiaryResponse])
def get_customer_beneficiaries(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db.query(models.Beneficiary).filter(models.Beneficiary.customer_id == customer_id).all()


@router.get("/{beneficiary_id}", response_model=schemas.BeneficiaryResponse)
def get_beneficiary(beneficiary_id: int, db: Session = Depends(get_db)):
    beneficiary = db.query(models.Beneficiary).filter(models.Beneficiary.beneficiary_id == beneficiary_id).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    return beneficiary


@router.patch("/{beneficiary_id}", response_model=schemas.BeneficiaryResponse)
def update_beneficiary(beneficiary_id: int, updates: schemas.BeneficiaryUpdate, db: Session = Depends(get_db)):
    beneficiary = db.query(models.Beneficiary).filter(models.Beneficiary.beneficiary_id == beneficiary_id).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        setattr(beneficiary, field, value)
    db.commit()
    db.refresh(beneficiary)
    return beneficiary


@router.delete("/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_beneficiary(beneficiary_id: int, db: Session = Depends(get_db)):
    beneficiary = db.query(models.Beneficiary).filter(models.Beneficiary.beneficiary_id == beneficiary_id).first()
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    db.delete(beneficiary)
    db.commit()
