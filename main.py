"""
FinRelief AI — backend
Real authentication (bcrypt + JWT), SQLite storage, loans/settlement/letters API.

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Docs (auto-generated):
    http://localhost:8000/docs
"""

import os
import datetime
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
import bcrypt
from jose import jwt, JWTError

# ---------------------------------------------------------------------------
# Config — move these to real environment variables / a secrets manager
# before deploying anywhere public. The value below is NOT safe for production.
# ---------------------------------------------------------------------------
SECRET_KEY = os.environ.get("FINRELIEF_SECRET_KEY", "dev-only-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

DATABASE_URL = "sqlite:///./finrelief.db"

# ---------------------------------------------------------------------------
# DB setup
# ---------------------------------------------------------------------------
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

pwd_context = None  # unused, kept only so nothing else needs to change if you re-add passlib later
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    loans = relationship("Loan", back_populates="owner", cascade="all, delete-orphan")
    letters = relationship("Letter", back_populates="owner", cascade="all, delete-orphan")


class Loan(Base):
    __tablename__ = "loans"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    lender = Column(String, nullable=False)
    loan_type = Column(String, default="Personal loan")
    amount = Column(Float, nullable=False)
    emi = Column(Float, nullable=False)
    overdue_days = Column(Integer, default=0)
    income = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="loans")


class Letter(Base):
    __tablename__ = "letters"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    loan_id = Column(Integer, ForeignKey("loans.id"))
    lender = Column(String, nullable=False)
    settlement_pct = Column(Float, nullable=False)
    body = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="letters")


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class LoanIn(BaseModel):
    lender: str
    loan_type: str = "Personal loan"
    amount: float
    emi: float
    overdue_days: int = 0
    income: float


class LoanOut(LoanIn):
    id: int

    class Config:
        from_attributes = True


class LetterIn(BaseModel):
    loan_id: int
    settlement_pct: float


class LetterOut(BaseModel):
    id: int
    loan_id: int
    lender: str
    settlement_pct: float
    body: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="FinRelief AI API")

# NOTE: allow_origins=["*"] is convenient for local prototyping only.
# Restrict this to your real frontend domain before deploying anywhere public.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/auth/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user = User(name=payload.name, email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@app.post("/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": {"id": user.id, "name": user.name, "email": user.email}}


@app.get("/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "name": current_user.name, "email": current_user.email}


@app.get("/loans", response_model=List[LoanOut])
def list_loans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Loan).filter(Loan.owner_id == current_user.id).all()


@app.post("/loans", response_model=LoanOut, status_code=201)
def create_loan(payload: LoanIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = Loan(owner_id=current_user.id, **payload.model_dump())
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@app.get("/loans/{loan_id}", response_model=LoanOut)
def get_loan(loan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.owner_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    return loan


@app.delete("/loans/{loan_id}", status_code=204)
def delete_loan(loan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.owner_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    db.delete(loan)
    db.commit()
    return None


@app.get("/settlement/{loan_id}")
def compute_settlement(loan_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Illustrative scoring only — replace with the real Financial Engine.
    """
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.owner_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    dti = min(100.0, (loan.emi / max(loan.income, 1)) * 100)
    surplus = loan.income - loan.emi - (loan.income * 0.4)
    stress = min(100.0, max(0.0, (dti * 0.5) + (min(loan.overdue_days, 180) / 180 * 40) + (10 if surplus < 0 else 0)))
    settle_pct = min(70.0, max(20.0, 25 + (stress * 0.35)))

    return {
        "loan_id": loan.id,
        "dti": round(dti, 1),
        "surplus": round(surplus, 2),
        "stress_score": round(stress, 1),
        "overdue_days": loan.overdue_days,
        "settlement_pct": round(settle_pct, 1),
        "settlement_amount": round(loan.amount * settle_pct / 100, 2),
        "outstanding_amount": loan.amount,
        "source": "Fallback",  # becomes "AI" once wired to a real model
    }


@app.post("/letters", response_model=LetterOut, status_code=201)
def create_letter(payload: LetterIn, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Generates a placeholder negotiation letter. Swap the body-building logic
    for a real LLM call (e.g. Gemini) using your own API key server-side.
    """
    loan = db.query(Loan).filter(Loan.id == payload.loan_id, Loan.owner_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    amount = round(loan.amount * payload.settlement_pct / 100)
    body = f"""To,
The Manager - Loan Recovery Department
{loan.lender}

Subject: Request for One Time Settlement (OTS) on Loan Account

Dear Sir/Madam,

I am writing regarding my outstanding {loan.loan_type.lower()} with {loan.lender}, currently overdue by {loan.overdue_days} days, with an outstanding balance of Rs. {loan.amount:,.0f}.

Due to a temporary but significant financial constraint, I have been unable to maintain regular EMI payments of Rs. {loan.emi:,.0f}. I would like to propose a One Time Settlement of Rs. {amount:,.0f} (approximately {payload.settlement_pct:.0f}% of the outstanding amount), payable in full within 15 working days of your written approval.

I request that you kindly consider this proposal and, upon settlement, report my account to the credit bureau as "Settled."

Yours sincerely,
{current_user.name}
{current_user.email}
"""

    letter = Letter(owner_id=current_user.id, loan_id=loan.id, lender=loan.lender,
                     settlement_pct=payload.settlement_pct, body=body)
    db.add(letter)
    db.commit()
    db.refresh(letter)
    return letter


@app.get("/letters", response_model=List[LetterOut])
def list_letters(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Letter).filter(Letter.owner_id == current_user.id).order_by(Letter.created_at.desc()).all()


@app.get("/health")
def health():
    return {"status": "ok"}
