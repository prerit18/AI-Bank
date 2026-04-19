from fastapi import FastAPI
from database import Base, engine
from routers import customers, accounts, beneficiaries, transactions

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Bank API", version="1.0.0")

app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(beneficiaries.router)
app.include_router(transactions.router)


@app.get("/health")
def health():
    return {"status": "ok"}
