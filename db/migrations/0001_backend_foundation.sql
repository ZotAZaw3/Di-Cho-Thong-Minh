-- 0001_backend_foundation: bù các chỗ schema gốc còn thiếu để làm 49 API + API mở rộng.
-- Xem "Thay đổi database" trong kế hoạch triển khai backend.

-- ---------------------------------------------------------------------------
-- 1. Người dùng: nối với Supabase Auth, thêm username / ảnh / ngôn ngữ
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN auth_user_id uuid,
  ADD COLUMN username character varying(60),
  ADD COLUMN avatar_url text,
  ADD COLUMN language character varying(10) DEFAULT 'vi' NOT NULL,
  ADD COLUMN deleted_at timestamp with time zone;

ALTER TABLE public.users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
CREATE UNIQUE INDEX users_email_lower_key ON public.users (lower((email)::text));
CREATE UNIQUE INDEX users_username_lower_key ON public.users (lower((username)::text)) WHERE username IS NOT NULL;

-- Tài khoản đăng nhập khi chạy AUTH_DRIVER=local (dev, test, demo không cần Supabase).
-- Khi AUTH_DRIVER=supabase bảng này để trống: mật khẩu do Supabase Auth giữ.
CREATE TABLE public.auth_local_accounts (
  auth_user_id uuid DEFAULT gen_random_uuid() NOT NULL,
  email character varying(254) NOT NULL,
  password_hash text NOT NULL,
  email_confirmed_at timestamp with time zone,
  verify_code character varying(6),
  verify_code_expires_at timestamp with time zone,
  token_version integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT auth_local_accounts_pkey PRIMARY KEY (auth_user_id)
);
CREATE UNIQUE INDEX auth_local_accounts_email_lower_key ON public.auth_local_accounts (lower((email)::text));

-- ---------------------------------------------------------------------------
-- 2. Nhóm: mỗi người chỉ ở một nhóm đang hoạt động
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX group_members_one_active_group ON public.group_members (user_id) WHERE left_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Danh mục: tên không trùng (không phân biệt hoa thường) trong các mục đang dùng
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX categories_name_lower_key ON public.categories (lower((name)::text)) WHERE is_active;
CREATE UNIQUE INDEX units_name_lower_key ON public.units (lower((name)::text)) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 4. Thực phẩm theo nhóm (quyết định 4): group_id NULL = danh mục chung, có giá trị = món riêng của nhóm
-- ---------------------------------------------------------------------------
ALTER TABLE public.foods
  ADD COLUMN group_id bigint,
  ADD COLUMN created_by bigint;
ALTER TABLE public.foods ADD CONSTRAINT foods_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.family_groups(id);
ALTER TABLE public.foods ADD CONSTRAINT foods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
-- Tài liệu API định danh thực phẩm theo tên, nên tên phải duy nhất trong phạm vi (chung hoặc một nhóm).
ALTER TABLE public.foods DROP CONSTRAINT foods_category_id_name_key;
CREATE UNIQUE INDEX foods_scope_name_key ON public.foods (COALESCE(group_id, 0), lower((name)::text)) WHERE is_active;

-- ---------------------------------------------------------------------------
-- 5. Danh sách mua sắm: giao cho một thành viên, có ghi chú
-- ---------------------------------------------------------------------------
ALTER TABLE public.shopping_lists
  ADD COLUMN assigned_to bigint,
  ADD COLUMN note text;
ALTER TABLE public.shopping_lists ADD CONSTRAINT shopping_lists_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);

-- ---------------------------------------------------------------------------
-- 6. Bữa ăn: một mục có thể là công thức, thực phẩm hoặc chỉ là tên món
--    (tài liệu API gửi foodName, app gửi tên món tự do; schema gốc chỉ cho recipe_id)
-- ---------------------------------------------------------------------------
ALTER TABLE public.meal_plan_items
  ALTER COLUMN recipe_id DROP NOT NULL,
  ALTER COLUMN planned_servings SET DEFAULT 1,
  ADD COLUMN food_id bigint,
  ADD COLUMN title character varying(160),
  ADD COLUMN created_at timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE public.meal_plan_items ADD CONSTRAINT meal_plan_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES public.foods(id);
ALTER TABLE public.meal_plan_items ADD CONSTRAINT meal_plan_items_target_check CHECK (num_nonnulls(recipe_id, food_id, title) >= 1);

-- ---------------------------------------------------------------------------
-- 7. Thông báo đẩy: token thiết bị + outbox nhắc hết hạn
-- ---------------------------------------------------------------------------
CREATE TABLE public.device_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  token text NOT NULL,
  platform character varying(10) DEFAULT 'android' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT device_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT device_tokens_token_key UNIQUE (token),
  CONSTRAINT device_tokens_platform_check CHECK (((platform)::text = ANY ((ARRAY['android'::character varying, 'ios'::character varying, 'web'::character varying])::text[]))),
  CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE INDEX device_tokens_user_id_idx ON public.device_tokens (user_id);

CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  group_id bigint NOT NULL,
  fridge_item_id bigint NOT NULL,
  type character varying(20) NOT NULL,
  notify_date date NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status character varying(12) DEFAULT 'PENDING' NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
  last_error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  -- Chống gửi trùng: chạy lại job trong ngày không tạo thêm dòng.
  CONSTRAINT notifications_dedup_key UNIQUE (fridge_item_id, user_id, type, notify_date),
  CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['EXPIRY_SOON'::character varying, 'EXPIRED'::character varying])::text[]))),
  CONSTRAINT notifications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'RETRY_WAIT'::character varying, 'FCM_ACCEPTED'::character varying, 'CANCELLED'::character varying, 'FAILED'::character varying])::text[]))),
  CONSTRAINT notifications_attempts_check CHECK ((attempts >= 0)),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.family_groups(id),
  CONSTRAINT notifications_fridge_item_id_fkey FOREIGN KEY (fridge_item_id) REFERENCES public.fridge_items(id) ON DELETE CASCADE
);
CREATE INDEX notifications_due_idx ON public.notifications (next_attempt_at) WHERE (status)::text = ANY ((ARRAY['PENDING'::character varying, 'RETRY_WAIT'::character varying])::text[]);

-- ---------------------------------------------------------------------------
-- 8. Log cho API Get logs (quyết định 7)
-- ---------------------------------------------------------------------------
CREATE TABLE public.api_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint,
  method character varying(8) NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  code character varying(20),
  duration_ms integer NOT NULL,
  ip character varying(64),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT api_logs_pkey PRIMARY KEY (id),
  CONSTRAINT api_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE INDEX api_logs_created_at_idx ON public.api_logs (created_at DESC);

-- ---------------------------------------------------------------------------
-- 9. Index cho khóa ngoại và các truy vấn hay dùng
-- ---------------------------------------------------------------------------
CREATE INDEX foods_group_id_idx ON public.foods (group_id);
CREATE INDEX foods_category_id_idx ON public.foods (category_id);
CREATE INDEX fridge_items_group_id_idx ON public.fridge_items (group_id);
CREATE INDEX fridge_items_food_id_idx ON public.fridge_items (food_id);
CREATE INDEX fridge_items_expiring_idx ON public.fridge_items (expires_on) WHERE quantity_base > 0;
CREATE INDEX group_members_group_id_idx ON public.group_members (group_id);
CREATE INDEX inventory_logs_group_time_idx ON public.inventory_logs (group_id, occurred_at);
CREATE INDEX inventory_logs_fridge_item_idx ON public.inventory_logs (fridge_item_id);
CREATE INDEX meal_plan_items_recipe_id_idx ON public.meal_plan_items (recipe_id);
CREATE INDEX meal_plan_items_food_id_idx ON public.meal_plan_items (food_id);
CREATE INDEX recipes_group_id_idx ON public.recipes (group_id);
CREATE INDEX recipe_ingredients_food_id_idx ON public.recipe_ingredients (food_id);
CREATE INDEX shopping_lists_group_id_idx ON public.shopping_lists (group_id);
CREATE INDEX shopping_list_items_food_unit_idx ON public.shopping_list_items (food_id, unit_id);
CREATE INDEX tasks_shopping_list_item_id_idx ON public.tasks (shopping_list_item_id);
CREATE INDEX tasks_assigned_to_idx ON public.tasks (assigned_to);

-- ---------------------------------------------------------------------------
-- 10. Bật RLS, không tạo policy: chặn truy cập thẳng bằng anon key.
--     Server kết nối bằng role chủ bảng nên không bị ảnh hưởng.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
