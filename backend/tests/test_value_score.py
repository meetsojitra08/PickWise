import pytest
from app.services.value_score import ValueScoreCalculator


def test_percentile_empty_or_singleton():
    assert ValueScoreCalculator.percentile(10.0, []) == 0.5
    assert ValueScoreCalculator.percentile(10.0, [10.0]) == 0.5


def test_percentile_distinct_values():
    values = [10.0, 20.0, 30.0]
    assert ValueScoreCalculator.percentile(10.0, values) == 0.0
    assert ValueScoreCalculator.percentile(20.0, values) == 0.5
    assert ValueScoreCalculator.percentile(30.0, values) == 1.0


def test_percentile_with_ties():
    values = [10.0, 20.0, 20.0, 30.0]
    # Tie for 20: less=1, equal=2 -> (1 + 0.5) / 3 = 1.5 / 3 = 0.5
    assert ValueScoreCalculator.percentile(20.0, values) == 0.5
