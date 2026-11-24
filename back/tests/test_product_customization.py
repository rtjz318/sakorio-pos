"""Unit tests for product customization helpers (issue #50)."""

from types import SimpleNamespace

from app import models

from app.product_customization import (
    choice_option_price_cents,
    choice_options_allowed_list,
    choice_options_is_multi,
    customization_price_cents,
    customization_dicts_equal,
)


def test_choice_options_single_list():
    assert choice_options_is_multi(["a", "b"]) is False
    assert choice_options_allowed_list(["a", "b"]) == ["a", "b"]


def test_choice_options_multi_dict():
    opts = {"choices": ["x", "y"], "multi": True, "prices_cents": {"y": 150}}
    assert choice_options_is_multi(opts) is True
    assert choice_options_allowed_list(opts) == ["x", "y"]
    assert choice_option_price_cents(opts, "x") == 0
    assert choice_option_price_cents(opts, "y") == 150


def test_choice_option_price_rejects_invalid_or_negative_values():
    assert choice_option_price_cents({"prices_cents": {"x": -100}}, "x") == 0
    assert choice_option_price_cents({"prices_cents": {"x": "bad"}}, "x") == 0
    assert choice_option_price_cents(["x"], "x") == 0


def test_customization_price_sums_single_and_multi_choices_from_server_metadata():
    questions = [
        SimpleNamespace(
            id=1,
            type=models.ProductQuestionType.choice,
            options={"choices": ["Regular", "Extra"], "prices_cents": {"Extra": 150}},
        ),
        SimpleNamespace(
            id=2,
            type=models.ProductQuestionType.choice,
            options={"choices": ["Egg", "Chashu"], "multi": True, "prices_cents": {"Egg": 100, "Chashu": 250}},
        ),
    ]

    class FakeResult:
        def all(self):
            return questions

    class FakeSession:
        def exec(self, _statement):
            return FakeResult()

    assert customization_price_cents(
        FakeSession(), 3, 99, {"1": "Extra", "2": ["Egg", "Chashu"]}
    ) == 500


def test_customization_dicts_equal_multi_order():
    a = {"1": ["b", "a"]}
    b = {"1": ["a", "b"]}
    assert customization_dicts_equal(a, b) is True


def test_customization_dicts_equal_mismatch():
    assert customization_dicts_equal({"1": "x"}, {"1": "y"}) is False
