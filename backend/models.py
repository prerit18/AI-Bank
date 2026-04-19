from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Boolean, Numeric, Date, DateTime,
    ForeignKey, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum

from database import Base


class AccountType(str, enum.Enum):
    current = "current"
    savings = "savings"
    isa = "isa"
    business = "business"


class AccountStatus(str, enum.Enum):
    active = "active"
    frozen = "frozen"
    closed = "closed"


class TransactionType(str, enum.Enum):
    credit = "credit"
    debit = "debit"
    transfer = "transfer"
    payment = "payment"
    refund = "refund"
    fee = "fee"


class TransactionStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    reversed = "reversed"


class CustomerStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


class Customer(Base):
    __tablename__ = "customers"

    customer_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    postcode = Column(String(10), nullable=True)
    country = Column(String(100), nullable=False, default="United Kingdom")
    date_of_birth = Column(Date, nullable=False)
    status = Column(SAEnum(CustomerStatus), nullable=False, default=CustomerStatus.active)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    accounts = relationship("Account", back_populates="customer", foreign_keys="Account.customer_id")
    beneficiaries = relationship("Beneficiary", back_populates="customer", foreign_keys="Beneficiary.customer_id")
    transactions = relationship("Transaction", back_populates="customer")


class Account(Base):
    __tablename__ = "accounts"

    account_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False, index=True)
    account_number = Column(String(8), unique=True, nullable=False, index=True)
    sort_code = Column(String(6), nullable=False, default="040004")
    account_type = Column(SAEnum(AccountType), nullable=False, default=AccountType.current)
    balance = Column(Numeric(15, 2), nullable=False, default=0.00)
    currency = Column(String(3), nullable=False, default="GBP")
    status = Column(SAEnum(AccountStatus), nullable=False, default=AccountStatus.active)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="accounts", foreign_keys=[customer_id])
    transactions = relationship("Transaction", back_populates="account")


class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    beneficiary_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    account_number = Column(String(20), nullable=False)
    sort_code = Column(String(6), nullable=False)
    bank_id = Column(String(100), nullable=True)
    bank_name = Column(String(255), nullable=True)
    is_internal = Column(Boolean, nullable=False, default=False)
    # Only populated when is_internal=True
    internal_customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    internal_account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=True)
    reference = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="beneficiaries", foreign_keys=[customer_id])
    internal_customer = relationship("Customer", foreign_keys=[internal_customer_id])
    internal_account = relationship("Account", foreign_keys=[internal_account_id])
    transactions = relationship("Transaction", back_populates="beneficiary")


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=False, index=True)
    beneficiary_id = Column(Integer, ForeignKey("beneficiaries.beneficiary_id"), nullable=True, index=True)
    transaction_type = Column(SAEnum(TransactionType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="GBP")
    description = Column(String(500), nullable=True)
    reference = Column(String(255), nullable=True)
    status = Column(SAEnum(TransactionStatus), nullable=False, default=TransactionStatus.pending)
    transaction_date = Column(Date, nullable=False, default=date.today)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    balance_after = Column(Numeric(15, 2), nullable=True)

    account = relationship("Account", back_populates="transactions")
    customer = relationship("Customer", back_populates="transactions")
    beneficiary = relationship("Beneficiary", back_populates="transactions")
