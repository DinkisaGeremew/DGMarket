import { User } from '@em/shared';
import { loadMap, saveMap } from '../persist';

const users: Map<string, User> = loadMap<User>('users');

function persist() {
  saveMap('users', users);
}

export function findByEmail(email: string): User | undefined {
  for (const u of users.values()) {
    if (u.email?.toLowerCase() === email.toLowerCase()) return u;
  }
}

export function findByPhone(phone: string): User | undefined {
  for (const u of users.values()) {
    if (u.phone === phone) return u;
  }
}

export function findById(id: string): User | undefined {
  return users.get(id);
}

export function findAll(): User[] {
  return Array.from(users.values());
}

export function save(user: User): void {
  users.set(user.id, user);
  persist();
}

export function _reset(): void {
  users.clear();
}
