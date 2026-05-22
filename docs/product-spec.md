# UseItUp Product Spec

## One-Sentence Product Description

UseItUp is a mobile pantry app that helps users cook meals from ingredients they already have, track rough pantry quantities, and use food before it expires.

## Problem

People often buy groceries, forget what they already have, and waste food because ingredients expire before they are used. Existing meal-planning apps often focus on recipes first, but users need a faster way to answer: "What can I cook with what I already have?"

## Target Users

### Primary User

Busy students, new grads, and young adults who buy groceries but do not always plan meals consistently.

### Secondary User

Anyone who wants to reduce food waste, save money, and make quick meals using existing pantry/fridge items.

## Core Value Proposition

UseItUp helps users quickly turn their current pantry into meal suggestions and keeps their pantry updated through simple post-cooking confirmations.

## MVP Scope

The MVP should focus on pantry tracking, recipe suggestions, and simple pantry updates after cooking.

### Included in MVP

- User sign up and login
- Add pantry items manually
- Track rough quantities using count, portions, or level
- Track storage location: fridge, freezer, pantry
- Track expiration date
- View pantry items sorted by expiration
- Generate recipe suggestions from available ingredients
- Show recipe ingredients and instructions
- Confirm ingredient usage after cooking
- Update pantry quantities after cooking
- Expiring-soon reminders or notification-ready data

### Not Included in MVP

- Video pantry scanning
- Receipt scanning
- Barcode scanning
- Grocery delivery integration
- Full nutrition tracking
- Family/shared pantry
- Social features
- Payments
- Advanced computer vision

## Product Positioning

UseItUp should not be positioned as a generic AI recipe generator. The main promise is:

> Cook with what you already have before it expires.

## Main User Flow

1. User signs up or logs in.
2. User adds pantry items through a simple form.
3. User opens the home screen and sees expiring items.
4. User taps "Cook What I Have."
5. App generates recipe suggestions using pantry items.
6. User selects a recipe.
7. User cooks the recipe.
8. App asks what ingredients were used.
9. User confirms or adjusts usage.
10. App updates pantry quantities.

## Key Screens

1. Home
2. Pantry
3. Add/Edit Pantry Item
4. Recipe Suggestions
5. Recipe Detail
6. Update Pantry After Cooking
7. Settings/Profile

## Core Features

### Pantry Tracking

Users can add, edit, delete, and view pantry items. Each item stores a name, quantity, quantity unit, storage location, category, and expiration date.

### Rough Quantity System

The app should avoid requiring exact food measurements. Instead, it should support practical quantity types:

- Count: eggs, apples, yogurt cups
- Portions: steak, chicken breast, salmon fillets
- Level: milk, rice, cereal, oil, sauces

### Recipe Suggestions

The app uses pantry items to suggest meals. Recipes should prioritize:

- Ingredients expiring soon
- Recipes with few or no missing ingredients
- Quick preparation time
- Simple instructions

### Pantry Update After Cooking

After the user cooks a recipe, the app shows suggested ingredient deductions and lets the user choose:

- Used suggested amount
- Used all
- Used less
- Skip

This keeps the pantry usable without requiring perfect tracking.

## Success Metrics

For the MVP, success can be measured by:

- Number of pantry items added per user
- Number of recipes generated
- Number of recipes cooked
- Percentage of cook sessions that update pantry inventory
- Number of expiring items used before expiration
- Retention after 7 days

## Monetization Ideas for Later

- Free tier with limited recipe generations
- Premium tier for unlimited AI recipes
- Receipt scanning as a premium feature
- Shared household pantry
- Weekly meal planning
- Grocery list generation
- Budget meal mode

## Risks

### User Input Friction

Users may not want to manually add many pantry items. The MVP should keep adding items fast and simple. Later versions can add voice, receipt scanning, barcode scanning, and video scanning.

### Pantry Accuracy

The app will not always know whether users used all of an ingredient. The solution is a low-friction confirmation screen after cooking.

### AI Recipe Quality

Generated recipes must be clear, safe, and realistic. The system should avoid giving unsafe food advice and should remind users to check food freshness themselves.

## Future Features

- Voice-based pantry entry
- Receipt scan import
- Barcode scanning
- Video pantry scan
- Expiration prediction by food type
- Grocery list generation
- Budget mode
- Nutrition mode
- Household sharing
- Meal prep calendar
- Recipe rating and personalization
