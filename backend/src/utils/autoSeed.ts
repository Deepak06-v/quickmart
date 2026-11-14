/**
 * @deprecated Automatic mock catalog seeding has been permanently disabled.
 * All products and categories must now be created and managed via the Admin Dashboard.
 */
export async function autoSeedIfEmpty(_force = false): Promise<void> {
  // Permanently disabled.
  // Catalog management is performed exclusively through the Admin Dashboard.
  return Promise.resolve();
}
