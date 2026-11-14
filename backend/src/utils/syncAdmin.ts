import bcrypt from 'bcryptjs';
import { Admin } from '../models/Admin';
import { env } from '../config/env';

/**
 * Automatically synchronizes or provisions the store admin account directly
 * from environment variables (ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME).
 * 
 * - If credentials are not provided in env, skips safely without creating default accounts.
 * - If account does not exist, creates it with bcrypt-hashed password.
 * - If account already exists, synchronizes password (only if changed) and name.
 * - Completely safe, idempotent, and never logs passwords.
 */
export async function syncAdminFromEnv(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || '';
  const name = (process.env.ADMIN_NAME || env.ADMIN_NAME || 'Store Owner').trim();

  // If credentials are not configured in environment, skip safely
  if (!email || !password) {
    console.log('ℹ️  [Admin Setup] ADMIN_EMAIL or ADMIN_PASSWORD not set in environment. Skipping automatic admin provisioning.');
    return;
  }

  try {
    const existingAdmin = await Admin.findOne({ email });

    if (!existingAdmin) {
      // Create new admin account
      const hashedPassword = await bcrypt.hash(password, 10);
      await Admin.create({
        name: name || 'Store Owner',
        email,
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
      console.log(`🔐 [Admin Setup] Successfully provisioned admin account for: ${email}`);
      return;
    }

    // Account exists: Check if password or profile fields need synchronization
    let modified = false;

    // Check if the environment password has changed
    const isPasswordSame = await existingAdmin.comparePassword(password);
    if (!isPasswordSame) {
      existingAdmin.password = await bcrypt.hash(password, 10);
      modified = true;
    }

    // Sync name if updated
    if (name && existingAdmin.name !== name) {
      existingAdmin.name = name;
      modified = true;
    }

    // Ensure account is active
    if (!existingAdmin.isActive) {
      existingAdmin.isActive = true;
      modified = true;
    }

    if (modified) {
      await existingAdmin.save();
      console.log(`🔐 [Admin Setup] Successfully synchronized admin credentials for: ${email}`);
    }
  } catch (error: any) {
    console.error(`❌ [Admin Setup] Error synchronizing admin account: ${error.message}`);
    throw error;
  }
}
