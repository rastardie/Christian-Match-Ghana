# Firestore Undefined Values Fix

## Issue

When updating user profiles (especially when uploading profile/cover photos), the application was throwing this error:

```
Failed to update profile: Function updateDoc() called with invalid data.
Unsupported field value: undefined (found in field location in document users/...)
```

## Root Cause

The `saveProfile` function in `App.tsx` was preparing an updates object that could contain `undefined` values. For example:

```typescript
location: formData.location || formData.city,  // Could be undefined if both are undefined
```

Firestore **does not allow** `undefined` values in documents. All fields must have a defined value or be omitted entirely.

## Solution

Modified the `updateUserDocument` function in `services/userService.ts` to filter out all `undefined` values before sending the update to Firestore.

### Changes Made

1. Added a `removeUndefinedValues` utility function that:
   - Takes an object as input
   - Returns a new object with only defined values
   - Filters out any keys with `undefined` values

2. Updated `updateUserDocument` to:
   - Clean the `updates` object before processing
   - Only send defined values to Firestore

### Code Added

```typescript
function removeUndefinedValues(obj: any): any {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
}
```

## Testing

After this fix, you should be able to:

1. ✅ Upload profile photos without errors
2. ✅ Upload cover photos without errors
3. ✅ Update profile even with empty optional fields
4. ✅ Save profile changes successfully

## Related Files

- `services/userService.ts` - Contains the fix
- `App.tsx` (lines 1919-2008) - The saveProfile function that calls updateUserDocument
