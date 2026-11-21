import { z } from 'zod';

// Kiểu dữ liệu dùng chung cho body/query của các API.
// App và tài liệu API đặt tên trường khác nhau (vd. foodName / name, assignToUsername / assignedTo),
// nên mỗi schema nhận cả hai qua withAliases(): tên theo tài liệu là chính, tên app dùng là bí danh.

/** Chuỗi bắt buộc, đã trim, không rỗng. */
export const text = (max = 160) => z.string({ error: 'phải là chuỗi' }).trim().min(1, 'không được để trống').max(max);

/** Chuỗi không bắt buộc; '' được coi như không gửi. */
export const optText = (max = 160) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().trim().max(max).optional());

/** Id dạng số, nhận cả "12" (form-data, query) lẫn 12. */
export const id = z.coerce.number({ error: 'phải là số' }).int('phải là số nguyên').positive('phải lớn hơn 0');

/** Số lượng > 0. Nhận 2, "2", "1,5", "10 quả" (lấy phần số đầu). */
export const quantity = z.preprocess((v) => {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return v;
  const m = v.trim().replace(',', '.').match(/^\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
}, z.number({ error: 'phải là số' }).positive('phải lớn hơn 0').max(1_000_000));

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Ngày 'YYYY-MM-DD'. Nhận chuỗi ngày, chuỗi ISO có giờ, hoặc timestamp (giây hoặc mili giây).
 * Có giờ thì quy về ngày theo múi giờ Việt Nam.
 */
export const date = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return undefined;
    if (typeof v === 'string' && DATE_RE.test(v.trim())) return v.trim();
    let d;
    if (typeof v === 'number' || (typeof v === 'string' && /^\d{9,13}$/.test(v.trim()))) {
      const n = Number(v);
      d = new Date(n < 1e11 ? n * 1000 : n);
    } else if (typeof v === 'string') {
      d = new Date(v);
    } else return v;
    if (Number.isNaN(d.getTime())) return 'invalid';
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  },
  z
    .string({ error: 'phải là ngày YYYY-MM-DD' })
    .regex(DATE_RE, 'phải là ngày YYYY-MM-DD')
    .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'ngày không hợp lệ'),
);

export const email = z.string().trim().toLowerCase().email('email không hợp lệ').max(254);

/** Mật khẩu 6–20 ký tự (sheet kế hoạch, T03.6). */
export const password = z.string({ error: 'phải là chuỗi' }).min(6, 'tối thiểu 6 ký tự').max(20, 'tối đa 20 ký tự');

export const bool = z.preprocess((v) => {
  if (v === 'true' || v === '1' || v === 1) return true;
  if (v === 'false' || v === '0' || v === 0) return false;
  return v;
}, z.boolean());

/**
 * Bọc schema object: nếu trường chính chưa có thì lấy từ bí danh.
 * @param {Record<string, string[]>} aliases { tênChính: [bíDanh1, bíDanh2] }
 */
export function withAliases(aliases, shape) {
  return z.preprocess((input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
    const out = { ...input };
    for (const [main, names] of Object.entries(aliases)) {
      if (out[main] !== undefined && out[main] !== '') continue;
      for (const name of names) {
        if (input[name] !== undefined && input[name] !== '') {
          out[main] = input[name];
          break;
        }
      }
    }
    return out;
  }, z.object(shape));
}

// Đường dẫn lỗi "không có trường nào để sửa"; validate() đổi thành mã riêng của API (00204, 00252, 00302).
export const NEED_ONE = '_needOne';

/** API sửa: phải có ít nhất một trường trong `fields`. */
export const needOne = (schema, fields) =>
  schema.refine((v) => fields.some((f) => v[f] !== undefined), {
    message: `Cần ít nhất một trong các trường: ${fields.join(', ')}`,
    path: [NEED_ONE],
  });

/** Mảng; form-data gửi mảng dưới dạng chuỗi JSON. */
export const jsonArray = (schema, max = 50) =>
  z.preprocess((v) => {
    if (typeof v !== 'string') return v;
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }, z.array(schema).max(max));

export const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
};

// ----- Giá trị liệt kê: nhận mã tiếng Anh hoặc nhãn tiếng Việt app đang hiển thị -----

const normalize = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');

function enumFrom(map, label) {
  return z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return undefined;
    return map[normalize(v)] ?? v;
  }, z.enum([...new Set(Object.values(map))], { error: `${label} không hợp lệ` }));
}

const STORAGE = {
  fridge: 'fridge', 'tu lanh': 'fridge', 'ngan mat': 'fridge',
  freezer: 'freezer', 'ngan da': 'freezer', 'ngan dong': 'freezer', 'tu dong': 'freezer',
  pantry: 'pantry', 'tu bep': 'pantry', 'ke bep': 'pantry', 'ben ngoai': 'pantry',
};
export const STORAGE_LABELS = { fridge: 'Tủ lạnh', freezer: 'Ngăn đông', pantry: 'Tủ bếp' };
export const storageLocation = enumFrom(STORAGE, 'nơi bảo quản');

const MEAL = {
  breakfast: 'breakfast', sang: 'breakfast', 'bua sang': 'breakfast',
  lunch: 'lunch', trua: 'lunch', 'bua trua': 'lunch',
  dinner: 'dinner', toi: 'dinner', 'bua toi': 'dinner',
};
export const MEAL_LABELS = { breakfast: 'Bữa sáng', lunch: 'Bữa trưa', dinner: 'Bữa tối' };
export const mealType = enumFrom(MEAL, 'bữa ăn');
export const isMealTypeWord = (v) => typeof v === 'string' && MEAL[normalize(v)] !== undefined;
