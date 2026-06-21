import { UserRow } from '../db/types.js';
import { UserProfile } from './claude.js';

function parseAllergies(user: UserRow): string[] {
  if (Array.isArray(user.allergies)) return user.allergies;
  if (typeof user.allergies === 'string') {
    try {
      return JSON.parse(user.allergies);
    } catch {
      return [];
    }
  }
  return [];
}

export function buildUserProfile(user: UserRow): UserProfile {
  return {
    name: user.name,
    age: user.age,
    gender: user.gender,
    height: user.height,
    weight: user.weight,
    goal: user.goal,
    activityLevel: user.activity_level,
    mealsPerDay: user.meals_per_day,
    allergies: parseAllergies(user),
    eatingStyle: user.eating_style || null,
    cookingTime: user.cooking_time || null,
  };
}
