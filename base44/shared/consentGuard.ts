// Shared consent/suppression guard for marketing email sends.
// Opt-out model: sends are allowed by default; blocked when the user explicitly
// turned the preference off or when Customer.io flagged suppression.
export async function isMarketingEmailAllowed(base44, userId, kind = 'marketing') {
  try {
    if (!userId) return false;

    const prefs = await base44.asServiceRole.entities.EmailPreferences.filter({ user_id: userId });
    if (prefs.length > 0) {
      const flag = kind === 'local_sales'
        ? prefs[0].local_sale_notifications
        : prefs[0].estate_salen_marketing;
      if (flag === false) return false;
    }

    const profiles = await base44.asServiceRole.entities.ConsumerMarketingProfile.filter({ user_id: userId });
    const blockedStatuses = ['unsubscribed_all', 'complained', 'suppressed', 'bounced'];
    if (profiles.length > 0 && blockedStatuses.includes(profiles[0].suppression_status)) return false;

    return true;
  } catch (e) {
    console.error('consentGuard error:', e);
    return true; // transient lookup failure must not block transactional sends
  }
}