import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const scryptAsync = promisify(scrypt);

async function setDataLeadPassword() {
  const email = 'abdur.rehman@taleemabad.com';
  const password = 'DataHub2024!';

  console.log('Setting password for Data Lead:', email);

  // Hash password using scrypt (same as auth.ts)
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  const hashedPassword = `${salt}:${derivedKey.toString('hex')}`;

  console.log('Password hashed successfully');

  // Update user in database
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.email, email));

  console.log('✅ Data Lead password set successfully!');
  console.log('Email:', email);
  console.log('Password:', password);
  
  process.exit(0);
}

setDataLeadPassword().catch((error) => {
  console.error('Error setting Data Lead password:', error);
  process.exit(1);
});
