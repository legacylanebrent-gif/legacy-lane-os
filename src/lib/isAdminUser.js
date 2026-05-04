/**
 * Reusable admin role detection helper.
 * Checks all common role field patterns across Legacy Lane OS user objects.
 */
export function isAdminUser(user) {
  if (!user) return false;
  return (
    user?.role === "admin" ||
    user?.Role === "admin" ||
    user?.account_role === "admin" ||
    user?.user_role === "admin" ||
    user?.permissions?.includes("admin") ||
    user?.is_admin === true ||
    user?.primary_account_type === "super_admin" ||
    user?.primary_account_type === "platform_ops"
  );
}