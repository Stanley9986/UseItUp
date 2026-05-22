# UseItUp Use Cases

## Use Case 1: Add Pantry Item

**Actor:** User

**Goal:** Add a food item to the pantry so the app can track it and use it for meal suggestions.

**Preconditions:** User is logged in.

**Trigger:** User buys food or notices an item they want to track.

**Main Success Scenario:**

1. User opens the app.
2. User navigates to the Pantry screen.
3. User taps "Add Item."
4. User enters the item name.
5. User selects a quantity type: count, portion, or level.
6. User enters the quantity or level.
7. User selects a storage location: fridge, freezer, or pantry.
8. User optionally enters an expiration date.
9. User saves the item.
10. App stores the item and displays it in the pantry list.

**Failure Cases:**

- User leaves item name blank.
- User enters an invalid quantity.
- User adds a duplicate item.
- Network/database request fails.

**Postconditions:** Pantry item is saved and available for recipe suggestions.

---

## Use Case 2: View Expiring Food

**Actor:** User

**Goal:** See which ingredients should be used soon.

**Preconditions:** User is logged in and has at least one pantry item.

**Trigger:** User opens the Home screen or Pantry screen.

**Main Success Scenario:**

1. App loads the user's pantry items.
2. App compares item expiration dates with the current date.
3. App identifies items expiring soon.
4. App displays the items in an "Expiring Soon" section.
5. User can tap an item to view or edit details.

**Failure Cases:**

- User has no pantry items.
- Items do not have expiration dates.
- Database request fails.

**Postconditions:** User understands which ingredients should be prioritized.

---

## Use Case 3: Generate Meal Suggestions

**Actor:** User

**Goal:** Find meals they can cook using available pantry items.

**Preconditions:** User is logged in and has pantry items saved.

**Trigger:** User taps "Cook What I Have."

**Main Success Scenario:**

1. User taps "Cook What I Have."
2. App retrieves pantry items.
3. App prioritizes items expiring soon.
4. App sends pantry item data to the recipe generation service.
5. App receives recipe suggestions.
6. App displays recipes with used ingredients, missing ingredients, and estimated cooking time.
7. User selects a recipe to view details.

**Failure Cases:**

- User has too few pantry items.
- AI recipe generation fails.
- App cannot connect to backend.
- Generated recipe uses unavailable ingredients incorrectly.

**Postconditions:** User sees possible meals based on available ingredients.

---

## Use Case 4: View Recipe Detail

**Actor:** User

**Goal:** Review a recipe before cooking.

**Preconditions:** Recipe suggestions have been generated.

**Trigger:** User taps a recipe card.

**Main Success Scenario:**

1. User taps a recipe.
2. App opens the Recipe Detail screen.
3. App displays recipe title, time estimate, ingredients, missing ingredients, and instructions.
4. App shows which pantry items will be used.
5. User taps "I Cooked This" after preparing the meal.

**Failure Cases:**

- Recipe data is incomplete.
- User exits before cooking.
- Recipe contains an ingredient the user cannot use.

**Postconditions:** User can cook the recipe and proceed to pantry update.

---

## Use Case 5: Update Pantry After Cooking

**Actor:** User

**Goal:** Keep pantry inventory accurate after cooking.

**Preconditions:** User selected and cooked a recipe.

**Trigger:** User taps "I Cooked This."

**Main Success Scenario:**

1. App opens the Update Pantry screen.
2. App lists ingredients used by the recipe.
3. App suggests quantity deductions.
4. User confirms suggested amount, chooses used all, chooses used less, or skips each ingredient.
5. App updates pantry item quantities.
6. App removes or marks items as empty if quantity reaches zero.
7. App confirms pantry update.

**Failure Cases:**

- User skips all updates.
- Quantity type does not support exact deduction.
- Database update fails.
- Ingredient no longer exists in pantry.

**Postconditions:** Pantry inventory reflects the user's cooking activity more accurately.

---

## Use Case 6: Edit Pantry Item

**Actor:** User

**Goal:** Correct or update an existing pantry item.

**Preconditions:** User is logged in and item exists.

**Trigger:** User taps Edit on a pantry item.

**Main Success Scenario:**

1. User opens item detail or edit form.
2. User changes name, quantity, location, category, or expiration date.
3. User saves changes.
4. App updates the item.
5. App shows the updated pantry list.

**Failure Cases:**

- User enters invalid quantity.
- User clears required fields.
- Database update fails.

**Postconditions:** Pantry item reflects updated information.

---

## Use Case 7: Delete Pantry Item

**Actor:** User

**Goal:** Remove an item that is gone, expired, or incorrectly added.

**Preconditions:** User is logged in and item exists.

**Trigger:** User taps Delete on a pantry item.

**Main Success Scenario:**

1. User opens item actions.
2. User selects Delete.
3. App asks for confirmation.
4. User confirms deletion.
5. App removes the item from the pantry.

**Failure Cases:**

- User cancels deletion.
- Database delete request fails.

**Postconditions:** Item no longer appears in pantry or recipe suggestions.
