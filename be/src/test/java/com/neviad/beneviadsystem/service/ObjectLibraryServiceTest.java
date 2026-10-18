package com.neviad.beneviadsystem.service;

import com.neviad.beneviadsystem.domain.model.SourceFile;
import com.neviad.beneviadsystem.infrastructure.persistence.SourceFileRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

public class ObjectLibraryServiceTest {
    public static final String CATALOG = """
            # Danh mục

            ## 1. Giá đỡ và đồ gá

            | Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
            |---|---|---|---|---|---|
            | Giá thí nghiệm | bài treo | — | đáy | P1 | |

            ## 2. Dụng cụ đo (đo lường)

            | Vật | Dùng ở | Bộ phận chuyển động | Điểm neo | Ưu tiên | Tham khảo |
            |---|---|---|---|---|---|
            | Lực kế | bài lực | kim | điểm treo | P1 | |
            """;

    public static String object(String catalog, String title) {
        return "/* OBJECT-META\n{\"catalog\":\"" + catalog + "\",\"title\":\"" + title + "\",\"anchor\":\"điểm treo\",\"size\":{\"width\":0.1,\"height\":0.3},"
                + "\"parts\":[{\"name\":\"needle\",\"label\":\"Kim chỉ\",\"motion\":\"rotate\",\"min\":-10,\"max\":10}],\"points\":[{\"name\":\"hook\"}],"
                + "\"useWhen\":[\"treo vật nặng vào móc\"],\"avoidWhen\":[\"cần cân điện tử có số đọc\"]}\n*/\nfunction makeThing() {}\n";
    }

    /** A library over files held in memory, as the database would hold them. */
    public static ObjectLibraryService library(Map<String, String> objects, String catalog) {
        var repository = new SourceFileRepository(null) {
            @Override public List<SourceFile> findAll(String collection) {
                return collection.equals("objects") ? objects.entrySet().stream().map(e -> new SourceFile(e.getKey(), e.getValue())).toList() : List.of();
            }
            @Override public Optional<SourceFile> find(String collection, String path) {
                if (collection.equals("catalog")) return catalog == null ? Optional.empty() : Optional.of(new SourceFile(path, catalog));
                return Optional.ofNullable(objects.get(path)).map(c -> new SourceFile(path, c));
            }
        };
        return new ObjectLibraryService(new SourceLibraryService(repository), new ObjectMapper());
    }

    private final ObjectLibraryService library = library(Map.of(
            "luc-ke.ts", object("Lực kế", "Lực kế lò xo có kim chỉ"),
            "gia.ts", object("Giá thí nghiệm", "Giá chữ L"),
            "la.ts", object("Vật không có trong danh mục", "Vật lạ")), CATALOG);

    @Test
    void anObjectTakesTheTopicOfItsCatalogueRowAndOneWithoutARowIsOther() {
        assertThat(library.find("luc-ke.ts")).hasValueSatisfying(s -> {
            assertThat(s.topic()).isEqualTo(2);
            assertThat(s.topicTitle()).isEqualTo("Dụng cụ đo");
            assertThat(s.parts()).singleElement().satisfies(p -> assertThat(p.name()).isEqualTo("needle"));
            assertThat(s.points()).containsExactly("hook");
            assertThat(s.width()).isEqualTo(0.1);
            assertThat(s.useWhen()).containsExactly("treo vật nặng vào móc");
            assertThat(s.avoidWhen()).containsExactly("cần cân điện tử có số đọc");
        });
        assertThat(library.find("gia.ts")).hasValueSatisfying(s -> assertThat(s.topic()).isEqualTo(1));
        assertThat(library.find("la.ts")).hasValueSatisfying(s -> assertThat(s.topic()).isEqualTo(ObjectLibraryService.OTHER_TOPIC));
    }

    @Test
    void theIndexHasAHeadingPerTopicInCatalogueOrderAndOneLinePerObjectWithoutAvoidWhen() {
        assertThat(library.index()).isEqualTo("""
                ## Giá đỡ và đồ gá
                - gia.ts | Giá thí nghiệm | Giá chữ L | Dùng khi: treo vật nặng vào móc

                ## Dụng cụ đo
                - luc-ke.ts | Lực kế | Lực kế lò xo có kim chỉ | Dùng khi: treo vật nặng vào móc

                ## Khác
                - la.ts | Vật không có trong danh mục | Vật lạ | Dùng khi: treo vật nặng vào móc
                """);
        assertThat(library(Map.of(), CATALOG).index()).isEmpty();
    }

    @Test
    void withoutTheCatalogueEveryObjectIsInOtherAndAFileWithoutMetaIsSkipped() {
        var bare = library(Map.of("a.ts", object("Lực kế", "x"), "b.ts", "function makeB() {}"), null);

        assertThat(bare.find("a.ts")).hasValueSatisfying(s -> assertThat(s.topic()).isEqualTo(ObjectLibraryService.OTHER_TOPIC));
        assertThat(bare.find("b.ts")).isEmpty();
        assertThat(bare.available()).isTrue();
        assertThat(library(Map.of(), CATALOG).available()).isFalse();
    }
}
