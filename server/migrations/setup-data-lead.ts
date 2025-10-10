import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

export async function setupDataLead() {
  const email = 'abdur.rehman@taleemabad.com';
  const password = 'DataHub2024!';

  console.log('[Migration] Checking if Data Lead exists...');

  // Check if Data Lead already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (existingUser) {
    console.log('[Migration] Data Lead already exists');
    
    // Update password if it doesn't have one
    if (!existingUser.password) {
      console.log('[Migration] Setting password for existing Data Lead...');
      const salt = randomBytes(16).toString('hex');
      const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
      const hashedPassword = `${derivedKey.toString('hex')}.${salt}`;

      await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, existingUser.id));

      console.log('[Migration] ✅ Password set for existing Data Lead');
    } else {
      console.log('[Migration] Data Lead already has a password');
    }
    return;
  }

  console.log('[Migration] Creating Data Lead account...');

  // Hash password
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  const hashedPassword = `${derivedKey.toString('hex')}.${salt}`;

  // Create Data Lead account
  await db.insert(users).values({
    email,
    password: hashedPassword,
    role: 'team_lead',
    firstName: 'Data',
    lastName: 'Lead',
  });

  console.log('[Migration] ✅ Data Lead account created successfully!');
  console.log('[Migration] Email:', email);
  console.log('[Migration] Password:', password);
}
