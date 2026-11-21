// Tìm theo tên không phân biệt hoa/thường và dấu ("thit ga" thấy "Thịt gà"), dùng hàm SQL unaccent_vi
// (migration 0002). Ký tự % _ và dấu gạch ngược trong từ khóa được escape để tìm đúng nghĩa đen.

/** Giá trị truyền vào tham số tìm kiếm; null = không lọc. */
export const likeQ = (q) => (q ? q.replace(/[\\%_]/g, (c) => `\\${c}`) : null);

/** Điều kiện SQL: cột `col` chứa từ khóa ở tham số $n. */
export const nameMatches = (col, n) => `($${n}::text IS NULL OR unaccent_vi(${col}) LIKE '%' || unaccent_vi($${n}) || '%')`;
