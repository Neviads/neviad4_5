package com.neviad.beneviadsystem.service.agent.impl;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MathExpressionTest {
    @Test
    void itComputesTheRutherfordAngleTheScenarioModelGotWrongByHand() {
        // Với E = 5 MeV và b = 100 fm: mô hình tự nhẩm ra 48,8° nhưng công thức cho 25,6°.
        assertThat(MathExpression.evaluate("2*atan(227.52/(2*5*100))*180/pi")).isCloseTo(25.6, org.assertj.core.data.Offset.offset(0.05));
    }

    @Test
    void itFollowsPrecedenceAssociativityAndUnaryMinus() {
        assertThat(MathExpression.evaluate("2+3*4")).isEqualTo(14.0);
        assertThat(MathExpression.evaluate("(2+3)*4")).isEqualTo(20.0);
        assertThat(MathExpression.evaluate("2^3^2")).isEqualTo(512.0);
        assertThat(MathExpression.evaluate("-2^2")).isEqualTo(-4.0);
        assertThat(MathExpression.evaluate("10/4-1")).isEqualTo(1.5);
        assertThat(MathExpression.evaluate("1e-3*2")).isEqualTo(0.002);
    }

    @Test
    void itRejectsWhatItCannotComputeWithAReason() {
        assertThatThrownBy(() -> MathExpression.evaluate("2*foo")).hasMessageContaining("foo");
        assertThatThrownBy(() -> MathExpression.evaluate("2*(3")).hasMessageContaining(")");
        assertThatThrownBy(() -> MathExpression.evaluate("1/0")).hasMessageContaining("hữu hạn");
        assertThatThrownBy(() -> MathExpression.evaluate("3,5*2")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MathExpression.evaluate(" ")).hasMessageContaining("rỗng");
    }
}
