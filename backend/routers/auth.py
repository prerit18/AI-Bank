from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: EmailStr


@router.post("/login", response_model=schemas.CustomerResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.email == body.email).first()
    if not customer:
        raise HTTPException(status_code=404, detail="No account found with that email")
    if customer.status != models.CustomerStatus.active:
        raise HTTPException(status_code=403, detail="Account is not active")
    return customer
