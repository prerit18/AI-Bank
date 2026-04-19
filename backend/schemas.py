from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator

from models import AccountType, AccountStatus, TransactionType, TransactionStatus, CustomerStatus


# ── Customer ──────────────────────────────────────────────────────────────────

class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    country: str = "United Kingdom"
    date_of_birth: date
    status: CustomerStatus = CustomerStatus.active


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    postcode: Optional[str] = None
    country: Optional[str] = None
    status: Optional[CustomerStatus] = None


class CustomerResponse(CustomerBase):
    customer_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Account ───────────────────────────────────────────────────────────────────

class AccountBase(BaseModel):
    customer_id: int
    account_number: str
    sort_code: str = "040004"
    account_type: AccountType = AccountType.current
    balance: Decimal = Decimal("0.00")
    currency: str = "GBP"
    status: AccountStatus = AccountStatus.active

    @field_validator("account_number")
    @classmethod
    def validate_account_number(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 8:
            raise ValueError("Account number must be 8 digits")
        return v

    @field_validator("sort_code")
    @classmethod
    def validate_sort_code(cls, v: str) -> str:
        cleaned = v.replace("-", "")
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError("Sort code must be 6 digits")
        return cleaned


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    status: Optional[AccountStatus] = None
    balance: Optional[Decimal] = None


class AccountResponse(AccountBase):
    account_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Beneficiary ───────────────────────────────────────────────────────────────

class BeneficiaryBase(BaseModel):
    customer_id: int
    name: str
    account_number: str
    sort_code: str
    bank_id: Optional[str] = None
    bank_name: Optional[str] = None
    is_internal: bool = False
    internal_customer_id: Optional[int] = None
    internal_account_id: Optional[int] = None
    reference: Optional[str] = None
    status: str = "active"


class BeneficiaryCreate(BeneficiaryBase):
    pass


class BeneficiaryUpdate(BaseModel):
    name: Optional[str] = None
    reference: Optional[str] = None
    status: Optional[str] = None


class BeneficiaryResponse(BeneficiaryBase):
    beneficiary_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Transaction ───────────────────────────────────────────────────────────────

class TransactionBase(BaseModel):
    account_id: int
    customer_id: int
    beneficiary_id: Optional[int] = None
    transaction_type: TransactionType
    amount: Decimal
    currency: str = "GBP"
    description: Optional[str] = None
    reference: Optional[str] = None
    status: TransactionStatus = TransactionStatus.pending
    transaction_date: date
    balance_after: Optional[Decimal] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    balance_after: Optional[Decimal] = None


class TransactionResponse(TransactionBase):
    transaction_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
