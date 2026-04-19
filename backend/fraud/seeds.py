import json
from sqlalchemy.orm import Session
from models import FraudRule, FraudRuleAction, FraudSeverity

STARTER_RULES = [
    {
        "name": "Large single payment",
        "description": "Blocks payments over £10,000 regardless of context.",
        "condition": {"type": "simple", "field": "amount", "operator": "gt", "value": 10000},
        "action": FraudRuleAction.block,
        "severity": FraudSeverity.critical,
        "priority": 1,
    },
    {
        "name": "Daily send limit exceeded",
        "description": "Blocks if more than £5,000 has been sent in the last 24 hours.",
        "condition": {"type": "simple", "field": "amount_sent_24h", "operator": "gt", "value": 5000},
        "action": FraudRuleAction.block,
        "severity": FraudSeverity.critical,
        "priority": 2,
    },
    {
        "name": "High value to new beneficiary",
        "description": "Holds payments over £1,000 to a beneficiary never paid before.",
        "condition": {
            "type": "and",
            "conditions": [
                {"type": "simple", "field": "amount", "operator": "gt", "value": 1000},
                {"type": "simple", "field": "is_new_beneficiary", "operator": "eq", "value": 1},
            ],
        },
        "action": FraudRuleAction.review,
        "severity": FraudSeverity.high,
        "priority": 10,
    },
    {
        "name": "New account large payment",
        "description": "Holds payments over £500 from accounts less than 30 days old.",
        "condition": {
            "type": "and",
            "conditions": [
                {"type": "simple", "field": "account_age_days", "operator": "lt", "value": 30},
                {"type": "simple", "field": "amount", "operator": "gt", "value": 500},
            ],
        },
        "action": FraudRuleAction.review,
        "severity": FraudSeverity.high,
        "priority": 11,
    },
    {
        "name": "Velocity — 5 payments in 1 hour",
        "description": "Holds further payments if 5 or more have been made in the last hour.",
        "condition": {"type": "simple", "field": "transactions_1h", "operator": "gte", "value": 5},
        "action": FraudRuleAction.review,
        "severity": FraudSeverity.high,
        "priority": 12,
    },
    {
        "name": "New beneficiary same day",
        "description": "Flags payments to a beneficiary added within the last 24 hours.",
        "condition": {"type": "simple", "field": "beneficiary_added_days_ago", "operator": "lt", "value": 1},
        "action": FraudRuleAction.flag,
        "severity": FraudSeverity.medium,
        "priority": 20,
    },
    {
        "name": "More than 80% of balance",
        "description": "Flags payments that would consume over 80% of the account balance.",
        "condition": {"type": "simple", "field": "amount_pct_of_balance", "operator": "gt", "value": 80},
        "action": FraudRuleAction.flag,
        "severity": FraudSeverity.medium,
        "priority": 21,
    },
    {
        "name": "Unusual hours",
        "description": "Flags payments made between midnight and 4am.",
        "condition": {"type": "simple", "field": "hour_of_day", "operator": "lt", "value": 4},
        "action": FraudRuleAction.flag,
        "severity": FraudSeverity.low,
        "priority": 30,
    },
]


def seed_rules(db: Session) -> None:
    existing = db.query(FraudRule).count()
    if existing > 0:
        return
    for r in STARTER_RULES:
        rule = FraudRule(
            name=r["name"],
            description=r["description"],
            condition=json.dumps(r["condition"]),
            action=r["action"],
            severity=r["severity"],
            priority=r["priority"],
            created_by="system",
        )
        db.add(rule)
    db.commit()
