import re

import pytest

from beneviadsystem.service.agent.impl.math_expression import MathExpression


def test_it_computes_the_rutherford_angle_the_scenario_model_got_wrong_by_hand():
    # Với E = 5 MeV và b = 100 fm: mô hình tự nhẩm ra 48,8° nhưng công thức cho 25,6°.
    assert MathExpression.evaluate("2*atan(227.52/(2*5*100))*180/pi") == pytest.approx(25.6, abs=0.05)


def test_it_follows_precedence_associativity_and_unary_minus():
    assert MathExpression.evaluate("2+3*4") == 14.0
    assert MathExpression.evaluate("(2+3)*4") == 20.0
    assert MathExpression.evaluate("2^3^2") == 512.0
    assert MathExpression.evaluate("-2^2") == -4.0
    assert MathExpression.evaluate("10/4-1") == 1.5
    assert MathExpression.evaluate("1e-3*2") == 0.002


@pytest.mark.parametrize("expression, reason", [("2*foo", "foo"), ("2*(3", ")"), ("1/0", "hữu hạn"), ("3,5*2", None), (" ", "rỗng"),
                                                ("sqrt(-1)", "hữu hạn"), ("10^400", "hữu hạn")])
def test_it_rejects_what_it_cannot_compute_with_a_reason(expression, reason):
    with pytest.raises(ValueError, match=None if reason is None else re.escape(reason)):
        MathExpression.evaluate(expression)
