-- Bổ sung theo đề bài (IT4788): hộp thư thông báo trong app, cấu hình hệ thống do admin quản lý,
-- công thức yêu thích, tìm kiếm không dấu.

-- Hộp thư thông báo: app đánh dấu đã đọc.
ALTER TABLE public.notifications ADD COLUMN read_at timestamp with time zone;
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- Cấu hình hệ thống (admin sửa qua PUT admin/config/). value lưu dạng jsonb; khóa nào chưa có dòng
-- thì dùng giá trị mặc định trong code / biến môi trường (src/services/settings.service.js).
CREATE TABLE public.app_settings (
  key character varying(60) NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_by bigint,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT app_settings_pkey PRIMARY KEY (key),
  CONSTRAINT app_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Công thức yêu thích: tra theo công thức khi xóa / đếm.
CREATE INDEX IF NOT EXISTS recipe_favorites_recipe_idx ON public.recipe_favorites (recipe_id);

-- Tìm kiếm không dấu ("thit ga" thấy "Thịt gà") mà không cần extension unaccent.
CREATE OR REPLACE FUNCTION public.unaccent_vi(input text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(translate(normalize(input, NFC),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'))
$$;
