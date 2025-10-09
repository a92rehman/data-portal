import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const password = process.argv[2] || "DataHub2024!";

hashPassword(password).then(hash => {
  console.log("Hashed password:", hash);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
