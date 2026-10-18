-- Cây fe/neviadlike_structure mà code agent làm việc trên đó, mỗi dòng một file (npm --prefix fe run push:template nạp bảng này).
-- Tách khỏi source_file: bản template cũ trong source_file (collection "template") giữ nguyên, không còn được đọc.
CREATE TABLE template_file (
    path       TEXT        PRIMARY KEY,
    content    TEXT        NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
