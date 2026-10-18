-- Mã nguồn mà agent đọc: mỗi dòng một file, nhóm theo bộ sưu tập ("template" = cây fe/neviadlike_structure; sau này thêm thư viện).
CREATE TABLE source_file (
    collection TEXT        NOT NULL,
    path       TEXT        NOT NULL,
    content    TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, path)
);
