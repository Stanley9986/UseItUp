# UseItUp Data Model

This document defines a simple MVP data model for the UseItUp mobile app.

## Entity Overview

Core entities:

- User
- PantryItem
- Recipe
- RecipeIngredient
- CookSession
- PantryUpdate

## User

Stores account-level user information.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| email | text | Unique, required |
| name | text | Optional display name |
| created_at | timestamp | Created time |
| updated_at | timestamp | Updated time |

## PantryItem

Stores each food item the user wants to track.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| name | text | Required |
| normalized_name | text | Required normalized lookup name used to prevent duplicates like "steak" vs "Steak" |
| category | text | Optional: produce, meat, dairy, grain, snack, condiment, other |
| storage_location | text | fridge, freezer, pantry |
| quantity_value | numeric | Optional depending on quantity type |
| quantity_unit | text | count, portion, level |
| quantity_label | text | Optional: low, medium, full, half |
| expiration_date | date | Optional but recommended |
| notes | text | Optional |
| created_at | timestamp | Created time |
| updated_at | timestamp | Updated time |

### Quantity Examples

| Item | quantity_value | quantity_unit | quantity_label |
|---|---:|---|---|
| Eggs | 8 | count | null |
| Steak | 2 | portion | null |
| Milk | null | level | half |
| Rice | null | level | medium |

## Recipe

Stores generated or saved recipes.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| title | text | Required |
| description | text | Short description |
| instructions | text | Full instructions, can be markdown or JSON later |
| prep_time_minutes | integer | Optional |
| created_by_ai | boolean | True for AI-generated recipes |
| source | text | ai, user_saved, imported |
| created_at | timestamp | Created time |
| updated_at | timestamp | Updated time |

## RecipeIngredient

Stores ingredients associated with a recipe. Some may match pantry items and some may be missing.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| recipe_id | UUID | Foreign key to Recipe |
| pantry_item_id | UUID | Nullable foreign key to PantryItem |
| name | text | Required |
| quantity_value | numeric | Optional |
| quantity_unit | text | count, portion, level, cup, tbsp, etc. |
| is_available | boolean | Whether user has it in pantry |
| is_optional | boolean | Whether ingredient is optional |

## CookSession

Stores a record of a user cooking a recipe.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to User |
| recipe_id | UUID | Foreign key to Recipe |
| cooked_at | timestamp | When user marked recipe cooked |
| notes | text | Optional user notes |

## PantryUpdate

Stores ingredient deductions after a cooking session.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| cook_session_id | UUID | Foreign key to CookSession |
| pantry_item_id | UUID | Foreign key to PantryItem |
| amount_used | numeric | Optional |
| unit_used | text | count, portion, level, etc. |
| previous_quantity_value | numeric | Optional snapshot |
| new_quantity_value | numeric | Optional snapshot |
| previous_quantity_label | text | Optional snapshot |
| new_quantity_label | text | Optional snapshot |
| update_action | text | suggested_amount, used_all, used_less, skipped |
| user_confirmed | boolean | True if user confirmed update |
| created_at | timestamp | Created time |

## Suggested Supabase Tables

### pantry_items

```sql
create table pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  category text,
  storage_location text check (storage_location in ('fridge', 'freezer', 'pantry')),
  quantity_value numeric,
  quantity_unit text check (quantity_unit in ('count', 'portion', 'level')),
  quantity_label text,
  expiration_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index pantry_items_user_normalized_name_location_idx
on pantry_items (user_id, normalized_name, storage_location);
```

### recipes

```sql
create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  prep_time_minutes integer,
  created_by_ai boolean default false,
  source text default 'ai',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### recipe_ingredients

```sql
create table recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  pantry_item_id uuid references pantry_items(id) on delete set null,
  name text not null,
  quantity_value numeric,
  quantity_unit text,
  is_available boolean default false,
  is_optional boolean default false
);
```

### cook_sessions

```sql
create table cook_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references recipes(id) on delete cascade,
  cooked_at timestamptz default now(),
  notes text
);
```

### pantry_updates

```sql
create table pantry_updates (
  id uuid primary key default gen_random_uuid(),
  cook_session_id uuid not null references cook_sessions(id) on delete cascade,
  pantry_item_id uuid not null references pantry_items(id) on delete cascade,
  amount_used numeric,
  unit_used text,
  previous_quantity_value numeric,
  new_quantity_value numeric,
  previous_quantity_label text,
  new_quantity_label text,
  update_action text check (update_action in ('suggested_amount', 'used_all', 'used_less', 'skipped')),
  user_confirmed boolean default false,
  created_at timestamptz default now()
);
```

## Row Level Security Notes

For Supabase, enable Row Level Security on all user-owned tables. Users should only be able to read/write rows where `user_id = auth.uid()`.

## Pantry Deduction Rules

### Count

If item has `quantity_unit = count`, subtract a numeric amount.

Example:

- Eggs: 8 count
- Recipe uses 2
- Remaining: 6

### Portion

If item has `quantity_unit = portion`, subtract a numeric amount.

Example:

- Steak: 2 portions
- Recipe uses 1 portion
- Remaining: 1 portion

### Level

If item has `quantity_unit = level`, use labels instead of exact subtraction.

Suggested label order:

```text
empty < low < medium < half < full
```

Example:

- Rice: medium
- Recipe uses some
- Remaining may become low

For MVP, level updates can be user-confirmed rather than automatically calculated.
