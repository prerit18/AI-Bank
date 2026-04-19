"""
Fraud rule engine.

evaluate(context, rules) → (action, matched_rule | None)

Action precedence: block > review > flag
"""
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from models import FraudRule, FraudRuleAction


PRECEDENCE = {
    FraudRuleAction.block: 3,
    FraudRuleAction.review: 2,
    FraudRuleAction.flag: 1,
}

OPERATORS = {
    "gt":  lambda a, b: a > b,
    "gte": lambda a, b: a >= b,
    "lt":  lambda a, b: a < b,
    "lte": lambda a, b: a <= b,
    "eq":  lambda a, b: a == b,
    "neq": lambda a, b: a != b,
}


def _eval_condition(condition: dict, context: dict) -> bool:
    ctype = condition.get("type", "simple")

    if ctype == "and":
        return all(_eval_condition(c, context) for c in condition["conditions"])

    if ctype == "or":
        return any(_eval_condition(c, context) for c in condition["conditions"])

    # simple
    field = condition["field"]
    operator = condition["operator"]
    threshold = condition["value"]
    actual = context.get(field)

    if actual is None:
        return False

    op_fn = OPERATORS.get(operator)
    if not op_fn:
        return False

    try:
        return op_fn(float(actual), float(threshold))
    except (TypeError, ValueError):
        return str(actual) == str(threshold)


def build_context(
    amount: Decimal,
    account,
    beneficiary,
    velocity: dict,
    db,
) -> dict:
    from models import Transaction, TransactionType

    balance = float(account.balance)
    amount_f = float(amount)

    # Days since account was created
    account_age_days = (datetime.utcnow() - account.created_at).days

    # Days since beneficiary was added
    beneficiary_added_days_ago = (datetime.utcnow() - beneficiary.created_at).days

    # First payment ever to this beneficiary?
    prior_payments = (
        db.query(Transaction)
        .filter(
            Transaction.beneficiary_id == beneficiary.beneficiary_id,
            Transaction.transaction_type == TransactionType.payment,
        )
        .count()
    )
    is_new_beneficiary = prior_payments == 0

    now = datetime.now(timezone.utc)

    ctx = {
        "amount": amount_f,
        "is_new_beneficiary": is_new_beneficiary,
        "beneficiary_added_days_ago": beneficiary_added_days_ago,
        "is_external_beneficiary": not beneficiary.is_internal,
        "amount_pct_of_balance": (amount_f / balance * 100) if balance > 0 else 100,
        "account_age_days": account_age_days,
        "hour_of_day": now.hour,
        "day_of_week": now.weekday(),
        **velocity,
    }
    return ctx


def evaluate(context: dict, rules: list[FraudRule]) -> tuple[FraudRuleAction | None, FraudRule | None]:
    best_action: FraudRuleAction | None = None
    best_rule: FraudRule | None = None

    for rule in sorted(rules, key=lambda r: r.priority):
        try:
            condition = json.loads(rule.condition)
        except (json.JSONDecodeError, TypeError):
            continue

        if _eval_condition(condition, context):
            if best_action is None or PRECEDENCE[rule.action] > PRECEDENCE[best_action]:
                best_action = rule.action
                best_rule = rule

    return best_action, best_rule
