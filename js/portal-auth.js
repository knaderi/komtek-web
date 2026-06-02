// ============================================================
// KomTek Portal — Auth Helper
// ============================================================
// Included on every portal page. Checks session, redirects if
// not logged in. Exposes getUser() and isAdmin() globally.

(function () {
  'use strict';

  // Determine the path prefix to portal/index.html
  // portal/ pages are one level deep, so we use relative path
  const LOGIN_URL = 'index.html'; // relative — works from portal/ dir

  let _currentUser  = null;
  let _currentProfile = null;

  // Called by portal pages after DOM is ready
  window.portalAuth = {

    // Must be awaited; resolves with { user, profile } or redirects
    async init() {
      const { data: { session }, error } = await db.auth.getSession();

      if (error || !session) {
        window.location.href = LOGIN_URL;
        return null;
      }

      _currentUser = session.user;

      // Fetch profile (role, name, etc.)
      const { data: profile } = await db
        .from('profiles')
        .select('*')
        .eq('id', _currentUser.id)
        .single();

      _currentProfile = profile;

      // Populate nav username if element exists
      const userNameEl = document.getElementById('portalUserName');
      if (userNameEl && profile) {
        userNameEl.textContent = profile.full_name || _currentUser.email;
      }

      // Show/hide admin-only elements
      if (profile && profile.role === 'admin') {
        document.querySelectorAll('[data-admin-only]').forEach(el => {
          el.style.display = '';
        });
      } else {
        document.querySelectorAll('[data-admin-only]').forEach(el => {
          el.style.display = 'none';
        });
      }

      return { user: _currentUser, profile: _currentProfile };
    },

    getUser()    { return _currentUser; },
    getProfile() { return _currentProfile; },
    isAdmin()    { return _currentProfile && _currentProfile.role === 'admin'; },

    async signOut() {
      await db.auth.signOut();
      window.location.href = LOGIN_URL;
    },
  };

  // Wire up logout button if present
  document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => window.portalAuth.signOut());
    }
  });
})();
