-- 0000_init: schema gốc của Supabase project dichothongminh (đọc ngày 2026-11-02).
-- DB Supabase hiện có đã chứa sẵn các bảng này: scripts/migrate.js tự đánh dấu file này là đã chạy (baseline).


CREATE TABLE public.categories (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying(100) NOT NULL,
  description text,
  is_active boolean DEFAULT true NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_name_check CHECK ((length(btrim((name)::text)) > 0))
);

CREATE TABLE public.family_groups (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying(120) NOT NULL,
  created_by bigint NOT NULL,
  time_zone character varying(64) DEFAULT 'Asia/Ho_Chi_Minh'::character varying NOT NULL,
  archived_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT family_groups_pkey PRIMARY KEY (id),
  CONSTRAINT family_groups_name_check CHECK ((length(btrim((name)::text)) > 0))
);

CREATE TABLE public.food_units (
  food_id bigint NOT NULL,
  unit_id bigint NOT NULL,
  factor_to_base numeric(18,6) NOT NULL,
  CONSTRAINT food_units_pkey PRIMARY KEY (food_id, unit_id),
  CONSTRAINT food_units_factor_to_base_check CHECK ((factor_to_base > (0)::numeric))
);

CREATE TABLE public.foods (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying(160) NOT NULL,
  category_id bigint NOT NULL,
  base_unit_id bigint NOT NULL,
  image_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT foods_pkey PRIMARY KEY (id),
  CONSTRAINT foods_category_id_name_key UNIQUE (category_id, name),
  CONSTRAINT foods_name_check CHECK ((length(btrim((name)::text)) > 0))
);

CREATE TABLE public.fridge_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint NOT NULL,
  food_id bigint NOT NULL,
  quantity_base numeric(18,6) DEFAULT 0 NOT NULL,
  expires_on date,
  acquired_at timestamp with time zone DEFAULT now() NOT NULL,
  storage_location character varying(12) DEFAULT 'fridge'::character varying NOT NULL,
  location_note character varying(160),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT fridge_items_pkey PRIMARY KEY (id),
  CONSTRAINT fridge_items_id_group_id_food_id_key UNIQUE (id, group_id, food_id),
  CONSTRAINT fridge_items_id_group_id_key UNIQUE (id, group_id),
  CONSTRAINT fridge_items_quantity_base_check CHECK ((quantity_base >= (0)::numeric)),
  CONSTRAINT fridge_items_storage_location_check CHECK (((storage_location)::text = ANY ((ARRAY['fridge'::character varying, 'freezer'::character varying, 'pantry'::character varying])::text[])))
);

CREATE TABLE public.group_members (
  group_id bigint NOT NULL,
  user_id bigint NOT NULL,
  group_role character varying(10) NOT NULL,
  joined_at timestamp with time zone DEFAULT now() NOT NULL,
  left_at timestamp with time zone,
  CONSTRAINT group_members_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_check CHECK (((left_at IS NULL) OR (left_at >= joined_at))),
  CONSTRAINT group_members_group_role_check CHECK (((group_role)::text = ANY ((ARRAY['leader'::character varying, 'member'::character varying])::text[])))
);

CREATE TABLE public.inventory_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint NOT NULL,
  fridge_item_id bigint NOT NULL,
  food_id bigint NOT NULL,
  shopping_list_item_id bigint,
  meal_plan_item_id bigint,
  actor_id bigint NOT NULL,
  event_type character varying(12) NOT NULL,
  quantity_base numeric(18,6) NOT NULL,
  total_cost numeric(18,2),
  reason text,
  idempotency_key character varying(100) NOT NULL,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_group_id_idempotency_key_key UNIQUE (group_id, idempotency_key),
  CONSTRAINT inventory_logs_check CHECK (((shopping_list_item_id IS NULL) OR ((event_type)::text = 'purchase'::text))),
  CONSTRAINT inventory_logs_check1 CHECK (((meal_plan_item_id IS NULL) OR ((event_type)::text = 'consume'::text))),
  CONSTRAINT inventory_logs_check2 CHECK (((total_cost IS NULL) OR ((event_type)::text = 'purchase'::text))),
  CONSTRAINT inventory_logs_check3 CHECK ((((event_type)::text <> ALL ((ARRAY['adjust_in'::character varying, 'adjust_out'::character varying])::text[])) OR (length(btrim(COALESCE(reason, ''::text))) > 0))),
  CONSTRAINT inventory_logs_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['purchase'::character varying, 'add'::character varying, 'consume'::character varying, 'discard'::character varying, 'adjust_in'::character varying, 'adjust_out'::character varying])::text[]))),
  CONSTRAINT inventory_logs_idempotency_key_check CHECK ((length(btrim((idempotency_key)::text)) > 0)),
  CONSTRAINT inventory_logs_quantity_base_check CHECK ((quantity_base > (0)::numeric)),
  CONSTRAINT inventory_logs_total_cost_check CHECK (((total_cost IS NULL) OR (total_cost >= (0)::numeric)))
);

CREATE TABLE public.meal_plan_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  meal_plan_id bigint NOT NULL,
  group_id bigint NOT NULL,
  recipe_id bigint NOT NULL,
  planned_servings numeric(10,2) NOT NULL,
  item_status character varying(10) DEFAULT 'planned'::character varying NOT NULL,
  cooked_at timestamp with time zone,
  note text,
  CONSTRAINT meal_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plan_items_id_group_id_key UNIQUE (id, group_id),
  CONSTRAINT meal_plan_items_meal_plan_id_recipe_id_key UNIQUE (meal_plan_id, recipe_id),
  CONSTRAINT meal_plan_items_check CHECK ((((item_status)::text = 'cooked'::text) = (cooked_at IS NOT NULL))),
  CONSTRAINT meal_plan_items_item_status_check CHECK (((item_status)::text = ANY ((ARRAY['planned'::character varying, 'cooked'::character varying, 'cancelled'::character varying])::text[]))),
  CONSTRAINT meal_plan_items_planned_servings_check CHECK ((planned_servings > (0)::numeric))
);

CREATE TABLE public.meal_plans (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint NOT NULL,
  plan_date date NOT NULL,
  meal_type character varying(10) NOT NULL,
  created_by bigint NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT meal_plans_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plans_group_id_plan_date_meal_type_key UNIQUE (group_id, plan_date, meal_type),
  CONSTRAINT meal_plans_id_group_id_key UNIQUE (id, group_id),
  CONSTRAINT meal_plans_meal_type_check CHECK (((meal_type)::text = ANY ((ARRAY['breakfast'::character varying, 'lunch'::character varying, 'dinner'::character varying])::text[])))
);

CREATE TABLE public.recipe_favorites (
  user_id bigint NOT NULL,
  recipe_id bigint NOT NULL,
  saved_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT recipe_favorites_pkey PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE public.recipe_ingredients (
  recipe_id bigint NOT NULL,
  food_id bigint NOT NULL,
  unit_id bigint NOT NULL,
  quantity numeric(18,6) NOT NULL,
  is_optional boolean DEFAULT false NOT NULL,
  note text,
  CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (recipe_id, food_id),
  CONSTRAINT recipe_ingredients_quantity_check CHECK ((quantity > (0)::numeric))
);

CREATE TABLE public.recipes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint,
  created_by bigint NOT NULL,
  title character varying(160) NOT NULL,
  description text,
  steps text NOT NULL,
  base_servings numeric(10,2) NOT NULL,
  prep_minutes integer DEFAULT 0 NOT NULL,
  cook_minutes integer DEFAULT 0 NOT NULL,
  image_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT recipes_pkey PRIMARY KEY (id),
  CONSTRAINT recipes_base_servings_check CHECK ((base_servings > (0)::numeric)),
  CONSTRAINT recipes_cook_minutes_check CHECK ((cook_minutes >= 0)),
  CONSTRAINT recipes_prep_minutes_check CHECK ((prep_minutes >= 0))
);

CREATE TABLE public.shopping_list_items (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  shopping_list_id bigint NOT NULL,
  food_id bigint NOT NULL,
  unit_id bigint NOT NULL,
  quantity numeric(18,6) NOT NULL,
  purchased_quantity_base numeric(18,6) DEFAULT 0 NOT NULL,
  item_status character varying(10) DEFAULT 'active'::character varying NOT NULL,
  note text,
  added_by bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shopping_list_items_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_list_items_shopping_list_id_food_id_key UNIQUE (shopping_list_id, food_id),
  CONSTRAINT shopping_list_items_item_status_check CHECK (((item_status)::text = ANY ((ARRAY['active'::character varying, 'cancelled'::character varying])::text[]))),
  CONSTRAINT shopping_list_items_purchased_quantity_base_check CHECK ((purchased_quantity_base >= (0)::numeric)),
  CONSTRAINT shopping_list_items_quantity_check CHECK ((quantity > (0)::numeric))
);

CREATE TABLE public.shopping_lists (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  group_id bigint NOT NULL,
  title character varying(160) NOT NULL,
  shopping_date date NOT NULL,
  list_status character varying(10) DEFAULT 'active'::character varying NOT NULL,
  created_by bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT shopping_lists_pkey PRIMARY KEY (id),
  CONSTRAINT uq_shopping_lists_id_group UNIQUE (id, group_id),
  CONSTRAINT shopping_lists_list_status_check CHECK (((list_status)::text = ANY ((ARRAY['active'::character varying, 'archived'::character varying])::text[])))
);

CREATE TABLE public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  shopping_list_item_id bigint NOT NULL,
  assigned_by bigint NOT NULL,
  assigned_to bigint NOT NULL,
  task_status character varying(12) DEFAULT 'todo'::character varying NOT NULL,
  due_at timestamp with time zone,
  completed_at timestamp with time zone,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_check CHECK ((((task_status)::text = 'done'::text) = (completed_at IS NOT NULL))),
  CONSTRAINT tasks_task_status_check CHECK (((task_status)::text = ANY ((ARRAY['todo'::character varying, 'in_progress'::character varying, 'done'::character varying, 'cancelled'::character varying])::text[])))
);

CREATE TABLE public.units (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  code character varying(20) NOT NULL,
  name character varying(60) NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  CONSTRAINT units_pkey PRIMARY KEY (id),
  CONSTRAINT units_code_key UNIQUE (code),
  CONSTRAINT units_code_check CHECK ((length(btrim((code)::text)) > 0))
);

CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  full_name character varying(120) NOT NULL,
  email character varying(254) NOT NULL,
  system_role character varying(10) DEFAULT 'user'::character varying NOT NULL,
  account_status character varying(10) DEFAULT 'active'::character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_account_status_check CHECK (((account_status)::text = ANY ((ARRAY['active'::character varying, 'blocked'::character varying])::text[]))),
  CONSTRAINT users_email_check CHECK ((length(btrim((email)::text)) > 0)),
  CONSTRAINT users_full_name_check CHECK ((length(btrim((full_name)::text)) > 0)),
  CONSTRAINT users_system_role_check CHECK (((system_role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying])::text[])))
);

-- Khóa ngoại (thêm sau khi tạo đủ bảng)
ALTER TABLE public.family_groups ADD CONSTRAINT family_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public.food_units ADD CONSTRAINT food_units_food_id_fkey FOREIGN KEY (food_id) REFERENCES foods(id);
ALTER TABLE public.food_units ADD CONSTRAINT food_units_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id);
ALTER TABLE public.foods ADD CONSTRAINT foods_base_unit_id_fkey FOREIGN KEY (base_unit_id) REFERENCES units(id);
ALTER TABLE public.foods ADD CONSTRAINT foods_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id);
ALTER TABLE public.fridge_items ADD CONSTRAINT fridge_items_food_id_fkey FOREIGN KEY (food_id) REFERENCES foods(id);
ALTER TABLE public.fridge_items ADD CONSTRAINT fridge_items_group_id_fkey FOREIGN KEY (group_id) REFERENCES family_groups(id);
ALTER TABLE public.group_members ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES family_groups(id);
ALTER TABLE public.group_members ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES users(id);
ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_fridge_item_id_group_id_food_id_fkey FOREIGN KEY (fridge_item_id, group_id, food_id) REFERENCES fridge_items(id, group_id, food_id);
ALTER TABLE public.inventory_logs ADD CONSTRAINT inventory_logs_meal_plan_item_id_group_id_fkey FOREIGN KEY (meal_plan_item_id, group_id) REFERENCES meal_plan_items(id, group_id);
ALTER TABLE public.meal_plan_items ADD CONSTRAINT meal_plan_items_meal_plan_id_group_id_fkey FOREIGN KEY (meal_plan_id, group_id) REFERENCES meal_plans(id, group_id);
ALTER TABLE public.meal_plan_items ADD CONSTRAINT meal_plan_items_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
ALTER TABLE public.meal_plans ADD CONSTRAINT fk_meal_plans_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public.meal_plans ADD CONSTRAINT meal_plans_group_id_fkey FOREIGN KEY (group_id) REFERENCES family_groups(id);
ALTER TABLE public.recipe_favorites ADD CONSTRAINT recipe_favorites_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
ALTER TABLE public.recipe_favorites ADD CONSTRAINT recipe_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT recipe_ingredients_food_id_unit_id_fkey FOREIGN KEY (food_id, unit_id) REFERENCES food_units(food_id, unit_id);
ALTER TABLE public.recipe_ingredients ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES recipes(id);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public.recipes ADD CONSTRAINT recipes_group_id_fkey FOREIGN KEY (group_id) REFERENCES family_groups(id);
ALTER TABLE public.shopping_list_items ADD CONSTRAINT fk_shopping_list_items_shopping_list FOREIGN KEY (shopping_list_id) REFERENCES shopping_lists(id);
ALTER TABLE public.shopping_list_items ADD CONSTRAINT shopping_list_items_food_id_unit_id_fkey FOREIGN KEY (food_id, unit_id) REFERENCES food_units(food_id, unit_id);
ALTER TABLE public.shopping_lists ADD CONSTRAINT fk_shopping_lists_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE public.shopping_lists ADD CONSTRAINT shopping_lists_group_id_fkey FOREIGN KEY (group_id) REFERENCES family_groups(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES users(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_shopping_list_item_id_fkey FOREIGN KEY (shopping_list_item_id) REFERENCES shopping_list_items(id);

-- Index không sinh từ PRIMARY KEY / UNIQUE
