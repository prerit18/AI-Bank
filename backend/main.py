from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from routers import auth, customers, accounts, beneficiaries, transactions, payments, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-Bank API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(accounts.router)
app.include_router(beneficiaries.router)
app.include_router(transactions.router)
app.include_router(payments.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {"status": "ok"}
