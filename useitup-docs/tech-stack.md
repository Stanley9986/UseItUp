# UseItUp Tech Stack

## Recommended MVP Stack

### Mobile Frontend

React Native with Expo

Why:

- Fast setup
- Good for iOS and Android
- Easy preview on phone
- Large ecosystem
- Works well with Supabase and Expo Notifications

### Backend / Database

Supabase

Use Supabase for:

- Authentication
- PostgreSQL database
- Row Level Security
- Storage later for images/receipts
- API access from mobile app

### AI Provider

OpenAI API or another LLM provider

Use AI for:

- Recipe generation from pantry items
- Ingredient matching
- Simple recipe instructions
- Later: natural-language pantry entry

For security, AI requests should eventually go through a backend function instead of exposing API keys in the mobile app.

### Notifications

Expo Notifications

Use for:

- Expiring-soon reminders
- Weekly pantry check reminders
- Suggested cooking reminders

### Styling

Options:

- NativeWind if you want Tailwind-like styling in React Native
- React Native StyleSheet if you want fewer dependencies

For MVP, either is fine. NativeWind may feel familiar if you like Tailwind.

### State Management

Start simple:

- React state
- React Context for auth/user data
- TanStack Query later if API state becomes complex

### Payments Later

RevenueCat or Stripe

Use later for:

- Premium recipe generations
- Receipt scanning
- Shared pantry
- Advanced meal plans

## Recommended Project Structure

```text
useitup/
  app/
    index.tsx
    login.tsx
    signup.tsx
    home.tsx
    pantry.tsx
    add-item.tsx
    recipes.tsx
    recipe-detail.tsx
    update-pantry.tsx
    profile.tsx
  components/
    PantryItemCard.tsx
    RecipeCard.tsx
    ExpiringSoonCard.tsx
    QuantitySelector.tsx
    StorageLocationSelector.tsx
  lib/
    supabase.ts
    recipeGenerator.ts
    pantryCalculations.ts
    dateUtils.ts
  types/
    pantry.ts
    recipe.ts
  docs/
    product-spec.md
    use-cases.md
    data-model.md
    workflow-and-screens.md
    tech-stack.md
    codex-instructions.md
```

If using Expo Router, the `app/` directory can handle routing.

## Build Phases

### Phase 1: Static UI

- Create Expo app
- Build main screens with fake data
- No backend yet
- Focus on navigation and UI polish

### Phase 2: Supabase Auth and Pantry CRUD

- Add Supabase project
- Create database tables
- Implement sign up/login
- Implement add/edit/delete pantry item
- Implement pantry list sorted by expiration

### Phase 3: Recipe Generation

- Create recipe generation function
- Send pantry items to AI
- Display generated recipe cards
- Save selected recipes

### Phase 4: Cooking and Pantry Updates

- Add Recipe Detail screen
- Add I Cooked This flow
- Deduct pantry quantities
- Save cook session and pantry updates

### Phase 5: Notifications

- Add expiration reminder logic
- Add push notification permissions
- Schedule local notifications

## AI Recipe Generation Prompt Requirements

When generating recipes, the AI should receive structured pantry data:

```json
{
  "pantryItems": [
    {
      "name": "Steak",
      "quantityValue": 2,
      "quantityUnit": "portion",
      "expirationDate": "2026-05-23",
      "storageLocation": "fridge"
    }
  ],
  "preferences": {
    "maxPrepTimeMinutes": 30,
    "prioritizeExpiringSoon": true
  }
}
```

The AI should return structured JSON:

```json
{
  "recipes": [
    {
      "title": "Steak Rice Bowl",
      "description": "A quick bowl using steak and pantry staples.",
      "prepTimeMinutes": 20,
      "usesExpiringItems": true,
      "ingredients": [
        {
          "name": "Steak",
          "quantityValue": 1,
          "quantityUnit": "portion",
          "isAvailable": true
        }
      ],
      "missingIngredients": ["garlic"],
      "instructions": [
        "Cook rice.",
        "Slice and season steak.",
        "Sear steak until cooked to preference.",
        "Serve over rice."
      ]
    }
  ]
}
```

## Security Notes

- Do not expose AI provider API keys in the mobile app.
- Use Supabase Row Level Security.
- Validate all user input.
- Treat AI-generated recipes as suggestions, not safety guarantees.
- Add a disclaimer that users should check expiration dates and food safety themselves.

## Resume-Oriented Technical Highlights

This project can demonstrate:

- React Native mobile development
- Supabase authentication and PostgreSQL database design
- Row Level Security
- AI-assisted recommendation workflow
- Inventory update logic
- Push notifications
- Clean mobile UX and Figma design
