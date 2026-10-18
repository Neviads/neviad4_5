package com.neviad.beneviadsystem.service.agent.impl;

import com.neviad.beneviadsystem.infrastructure.ai.ToolImageSource;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * An independent judge of how a drawn object LOOKS, the part {@code check_object} cannot measure. Two steps, each a call of its own:
 * {@link #criteria} fixes, before any picture exists, what the real object looks like from the scene's view (features, part ratios, view
 * rules); {@link #judge} then reads only the request, those criteria and the pictures of the figure (never the code or the drawer's turns)
 * and reports what it measured and saw. The pass is decided by {@link #decide} in code, not by what the judge says.
 */
public interface DrawObjectJudge {
    record Ratio(String name, double expected) { }

    record Criteria(String view, List<Ratio> ratios, List<String> features, List<String> viewRules) {
        public Criteria {
            ratios = ratios == null ? List.of() : List.copyOf(ratios);
            features = features == null ? List.of() : List.copyOf(features);
            viewRules = viewRules == null ? List.of() : List.copyOf(viewRules);
        }
    }

    record Observed(String name, double observed) { }

    record Feature(String feature, boolean present, String note) { }

    /** What the judge reported on the pictures, before the code decides. */
    record Report(List<Observed> ratios, List<Feature> features, boolean viewOk, List<String> viewProblems, List<String> defects, int score,
                  boolean pass, String summary) {
        public Report {
            ratios = ratios == null ? List.of() : List.copyOf(ratios);
            features = features == null ? List.of() : List.copyOf(features);
            viewProblems = viewProblems == null ? List.of() : List.copyOf(viewProblems);
            defects = defects == null ? List.of() : List.copyOf(defects);
            summary = summary == null ? "" : summary;
        }
    }

    /** The decision: {@code defects} are what the drawer must fix, written with the measured numbers. */
    record Verdict(boolean pass, int score, List<String> defects, String summary) {
        public Verdict {
            defects = defects == null ? List.of() : List.copyOf(defects);
            summary = summary == null ? "" : summary;
        }
    }

    /** Lowest score that can pass, and how far an observed part ratio may stray from the real one. */
    int PASS_SCORE = 7;
    double RATIO_TOLERANCE = 0.3;

    Criteria criteria(DrawObjectAgent.DrawObjectRequest request);

    Verdict judge(DrawObjectAgent.DrawObjectRequest request, Criteria criteria, List<ToolImageSource.Image> images);

    /**
     * The pass, decided in code from what the judge reported: it fails when the score is below {@link #PASS_SCORE}, the view is wrong, two
     * or more features are missing, or a part ratio is more than {@link #RATIO_TOLERANCE} off the real one, whatever the judge's own pass says.
     */
    static Verdict decide(Criteria criteria, Report report) {
        int score = Math.max(1, Math.min(10, report.score()));
        List<String> defects = new ArrayList<>();
        boolean ratioOff = false;
        for (Ratio expected : criteria.ratios()) {
            Observed seen = report.ratios().stream().filter(o -> o.name().equals(expected.name())).findFirst().orElse(null);
            if (seen == null || !(seen.observed() > 0) || !(expected.expected() > 0)) continue;
            double off = Math.abs(seen.observed() / expected.expected() - 1);
            if (off > RATIO_TOLERANCE) {
                ratioOff = true;
                defects.add(String.format(Locale.ROOT, "Tỉ lệ \"%s\" trên hình khoảng %.2f, vật thật khoảng %.2f (lệch %d%%): sửa kích thước bộ phận cho đúng.",
                        expected.name(), seen.observed(), expected.expected(), Math.round(off * 100)));
            }
        }
        if (!report.viewOk()) {
            List<String> problems = report.viewProblems().isEmpty() ? List.of("góc nhìn chưa đúng hay chưa nhất quán") : report.viewProblems();
            for (String problem : problems) defects.add("Góc nhìn (" + criteria.view() + "): " + problem);
        }
        long missing = report.features().stream().filter(f -> !f.present()).count();
        for (Feature f : report.features()) {
            if (!f.present()) defects.add("Thiếu đặc điểm nhận diện: " + f.feature() + (f.note() == null || f.note().isBlank() ? "" : " (" + f.note() + ")") + ".");
        }
        defects.addAll(report.defects());
        boolean pass = report.pass() && score >= PASS_SCORE && report.viewOk() && missing < 2 && !ratioOff;
        return new Verdict(pass, score, defects, report.summary());
    }
}
