# UseItUp Workflow and Screen Design Notes

## App Navigation

Recommended bottom tab navigation:

1. Home
2. Pantry
3. Recipes
4. Profile

The MVP can also use a simpler stack-based navigation if faster to implement.

## Screen 1: Home

### Purpose

Give the user a fast answer to what they should cook or use soon.

### Main Components

- Greeting
- Expiring soon count
- Primary CTA: Cook What I Have
- Expiring Soon list
- Suggested Meals preview
- Pantry Summary card

### Example Layout

```text
Good afternoon

3 items expire soon

[ Cook What I Have ]

Expiring Soon
- Steak — expires tomorrow
- Spinach — expires in 2 days
- Milk — expires in 3 days

Suggested Meals
- Steak rice bowl
- Spinach omelet

Pantry Summary
12 items tracked
5 fridge · 2 freezer · 5 pantry
```

## Screen 2: Pantry

### Purpose

Let users manage food inventory.

### Main Components

- Search bar
- Filter chips: All, Fridge, Freezer, Pantry, Expiring Soon
- Add Item button
- Pantry item cards

### Item Card

```text
Steak
2 portions · Fridge
Expires tomorrow
[Edit]
```

### Empty State

```text
Your pantry is empty.
Add a few ingredients to get meal ideas.
[Add Item]
```

## Screen 3: Add/Edit Item

### Purpose

Make pantry entry fast and not annoying.

### Fields

- Item name
- Category
- Storage location
- Quantity type
- Quantity value or level
- Expiration date
- Notes

### Quantity Type Options

- Count
- Portion
- Level

### Example

```text
Item Name
[Steak]

Quantity Type
[Portion]

Amount
[2]

Location
[Fridge]

Expiration Date
[Tomorrow]

[Save Item]
```

## Screen 4: Recipe Suggestions

### Purpose

Show meals based on available pantry items.

### Main Components

- Header: "Meals You Can Make"
- Sort/filter: Expiring Soon, Quick, Fewest Missing
- Recipe cards

### Recipe Card

```text
Steak Rice Bowl
20 min
Uses: steak, rice, soy sauce
Missing: garlic
Tag: Uses expiring steak
[View Recipe]
```

### Empty/Failure State

```text
Not enough ingredients yet.
Add more pantry items or try a simpler recipe search.
```

## Screen 5: Recipe Detail

### Purpose

Let user review and cook a recipe.

### Main Components

- Recipe title
- Time estimate
- Uses expiring items badge
- Ingredients list
- Missing ingredients list
- Instructions
- Pantry impact preview
- Button: I Cooked This

### Example

```text
Steak Rice Bowl
20 min

Uses expiring steak

Ingredients
- 1 portion steak
- rice
- soy sauce
- spinach

Instructions
1. Cook rice.
2. Slice and season steak.
3. Sear steak.
4. Add spinach.
5. Serve over rice.

Pantry Impact
- Steak: 2 portions → 1 portion
- Spinach: medium → low

[I Cooked This]
```

## Screen 6: Update Pantry

### Purpose

Confirm ingredient usage after cooking.

### Main Components

- Recipe cooked confirmation
- Ingredient update cards
- Per-item action buttons
- Save updates button

### Example

```text
Update Your Pantry

Steak
You had: 2 portions
Suggested use: 1 portion
Remaining: 1 portion

[Used suggested amount]
[Used all]
[Used less]
[Skip]

Spinach
You had: medium
Suggested use: some

[Now low]
[Used all]
[No change]
[Skip]

[Save Pantry Updates]
```

## Screen 7: Profile/Settings

### Purpose

Basic account and preference management.

### MVP Components

- User email/name
- Dietary preferences placeholder
- Notification preferences placeholder
- Sign out

### Later Components

- Allergies
- Diet type
- Budget preferences
- Cooking skill level
- Household settings

## Design Style

Recommended visual direction:

- Warm off-white background
- Green primary accent
- Rounded cards
- Minimal icons
- Friendly but clean typography
- Large primary actions
- Expiring items should be visually noticeable but not alarming

## Main CTA Labels

Use clear labels:

- Cook What I Have
- Add Item
- Save Item
- View Recipe
- I Cooked This
- Save Pantry Updates

## Important UX Principle

Do not make inventory tracking feel like accounting. The app should be useful even if quantities are approximate.

## Figma Design Order

Design these first:

1. Home
2. Pantry
3. Add/Edit Item
4. Recipe Suggestions
5. Recipe Detail
6. Update Pantry

After these are done, design login/profile screens.
