package com.neviad.beneviadsystem.service.agent.impl;

/**
 * A tiny arithmetic evaluator for the numeric examples of a scenario: numbers (dot decimals, e-notation), {@code + - * / ^}, parentheses,
 * the constants {@code pi} and {@code e}, and the functions {@code atan sin cos tan asin acos sqrt exp ln log10 abs}. Angles are in radians.
 * The model writes the expression; the backend computes the number, so the model never has to do the arithmetic in its head.
 */
final class MathExpression {
    private final String text;
    private int position;

    private MathExpression(String text) { this.text = text; }

    /** The value of the expression; an IllegalArgumentException saying what is wrong when it cannot be computed. */
    static double evaluate(String expression) {
        if (expression == null || expression.isBlank()) throw new IllegalArgumentException("biểu thức rỗng");
        MathExpression parser = new MathExpression(expression);
        double value = parser.sum();
        parser.skipSpaces();
        if (parser.position != parser.text.length()) throw new IllegalArgumentException("không hiểu ký tự \"" + parser.text.charAt(parser.position) + "\" ở vị trí " + parser.position);
        if (Double.isNaN(value) || Double.isInfinite(value)) throw new IllegalArgumentException("kết quả không hữu hạn");
        return value;
    }

    private double sum() {
        double value = product();
        for (;;) {
            skipSpaces();
            if (accept('+')) value += product();
            else if (accept('-')) value -= product();
            else return value;
        }
    }

    private double product() {
        double value = unary();
        for (;;) {
            skipSpaces();
            if (accept('*')) value *= unary();
            else if (accept('/')) value /= unary();
            else return value;
        }
    }

    /** The minus sign binds weaker than the power: -2^2 = -4. */
    private double unary() {
        skipSpaces();
        if (accept('-')) return -unary();
        if (accept('+')) return unary();
        return power();
    }

    /** Right associative: 2^3^2 = 2^(3^2); the exponent may carry a sign. */
    private double power() {
        double base = atom();
        skipSpaces();
        if (accept('^')) return Math.pow(base, unary());
        return base;
    }

    private double atom() {
        skipSpaces();
        if (accept('(')) {
            double value = sum();
            skipSpaces();
            if (!accept(')')) throw new IllegalArgumentException("thiếu dấu )");
            return value;
        }
        if (position < text.length() && (Character.isDigit(text.charAt(position)) || text.charAt(position) == '.')) return number();
        if (position < text.length() && Character.isLetter(text.charAt(position))) {
            int start = position;
            while (position < text.length() && (Character.isLetterOrDigit(text.charAt(position)))) position += 1;
            String name = text.substring(start, position).toLowerCase();
            skipSpaces();
            if (accept('(')) {
                double argument = sum();
                skipSpaces();
                if (!accept(')')) throw new IllegalArgumentException("thiếu dấu ) sau " + name);
                return function(name, argument);
            }
            return switch (name) {
                case "pi" -> Math.PI;
                case "e" -> Math.E;
                default -> throw new IllegalArgumentException("không biết \"" + name + "\" (chỉ có pi, e và các hàm atan sin cos tan asin acos sqrt exp ln log10 abs)");
            };
        }
        throw new IllegalArgumentException(position >= text.length() ? "biểu thức kết thúc quá sớm" : "không hiểu ký tự \"" + text.charAt(position) + "\" ở vị trí " + position);
    }

    private double number() {
        int start = position;
        while (position < text.length() && (Character.isDigit(text.charAt(position)) || text.charAt(position) == '.')) position += 1;
        if (position < text.length() && (text.charAt(position) == 'e' || text.charAt(position) == 'E')) {
            int mark = position;
            position += 1;
            if (position < text.length() && (text.charAt(position) == '+' || text.charAt(position) == '-')) position += 1;
            if (position < text.length() && Character.isDigit(text.charAt(position))) {
                while (position < text.length() && Character.isDigit(text.charAt(position))) position += 1;
            } else {
                position = mark;
            }
        }
        String literal = text.substring(start, position);
        try { return Double.parseDouble(literal); }
        catch (NumberFormatException bad) { throw new IllegalArgumentException("số không hợp lệ \"" + literal + "\" (dùng dấu chấm làm dấu thập phân)"); }
    }

    private static double function(String name, double x) {
        return switch (name) {
            case "atan" -> Math.atan(x);
            case "sin" -> Math.sin(x);
            case "cos" -> Math.cos(x);
            case "tan" -> Math.tan(x);
            case "asin" -> Math.asin(x);
            case "acos" -> Math.acos(x);
            case "sqrt" -> Math.sqrt(x);
            case "exp" -> Math.exp(x);
            case "ln" -> Math.log(x);
            case "log10" -> Math.log10(x);
            case "abs" -> Math.abs(x);
            default -> throw new IllegalArgumentException("không có hàm \"" + name + "\" (có atan sin cos tan asin acos sqrt exp ln log10 abs)");
        };
    }

    private boolean accept(char c) {
        if (position < text.length() && text.charAt(position) == c) {
            position += 1;
            return true;
        }
        return false;
    }

    private void skipSpaces() {
        while (position < text.length() && Character.isWhitespace(text.charAt(position))) position += 1;
    }
}
