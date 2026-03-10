// Make sure supabase is available
if (!window.supabase) {
    console.error('Supabase not initialized!');
}

// Auth functions for Supabase
window.login = async function() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        window.notify.warning('Please enter email and password');
        return;
    }
    
    try {
        const { data, error } = await window.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            window.notify.error('Login failed: ' + error.message);
            return;
        }
        
        window.notify.success('Welcome back! Login successful.');
        window.loadDashboard();
        
    } catch (error) {
        window.notify.error('Login error: ' + error.message);
    }
}

window.signup = async function() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const phone = document.getElementById('signup-phone').value;
    const termsCheckbox = document.getElementById('signup-terms');
    
    if (!name || !email || !password) {
        window.notify.warning('Please fill in all required fields');
        return;
    }
    
    if (password.length < 6) {
        window.notify.warning('Password must be at least 6 characters');
        return;
    }

    if (!termsCheckbox || !termsCheckbox.checked) {
        window.notify.warning('You must accept the Terms and Conditions to create an account');
        return;
    }
    
    // Show loading
    const btn = event?.target;
    if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating Account...';
        btn.disabled = true;
    }
    
    try {
        // Sign up with Supabase Auth
        const { data: authData, error: authError } = await window.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    phone: phone
                }
            }
        });
        
        if (authError) {
            throw new Error('Signup failed: ' + authError.message);
        }
        
        // Create profile
        if (authData.user) {
            const { error: profileError } = await window.supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: name,
                        phone: phone,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                    }
                ]);
            
            if (profileError) {
                console.warn('Profile creation:', profileError.message);
            }
        }
        
        window.notify.success(`Account created for ${name}! Check your email to confirm.`);
        
        // Switch to login form
        window.showLogin();
        
    } catch (error) {
        window.notify.error('Signup error: ' + error.message);
    } finally {
        // Reset button
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

window.logout = async function() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;

        window.notify.info('Logged out successfully');

        // ── Cleanup: close all overlays and panels before restoring pre-login UI ──

        // Close modal system
        if (window.modal && typeof window.modal.close === 'function') {
            window.modal.close();
        }
        // Force-hide modal backdrop & container and clear stale content
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modalContainer = document.getElementById('modal-container');
        if (modalBackdrop) modalBackdrop.classList.add('hidden');
        if (modalContainer) {
            modalContainer.classList.add('hidden');
            modalContainer.innerHTML = '';
        }

        // Close full-screen overlay panels
        ['reports-panel', 'profile-panel', 'help-panel', 'archived-panel'].forEach(id => {
            const panel = document.getElementById(id);
            if (panel) {
                panel.classList.add('hidden');
                panel.style.display = 'none';
            }
        });

        // Close upcoming-reminders overlay
        const reminderOverlay = document.getElementById('upcoming-reminders-overlay');
        if (reminderOverlay) reminderOverlay.classList.add('hidden');

        // Cleanup reminder system (clear interval)
        if (window.reminders && typeof window.reminders.cleanup === 'function') {
            window.reminders.cleanup();
        }

        // Hide the dashboard immediately
        document.getElementById('dashboard').classList.add('hidden');

        // Re-inject the splash screen so the startup animation plays again
        const splashHTML = `
            <div id="splash-screen">
                <div class="splash-logo"><i class="fas fa-pills"></i></div>
                <div class="splash-title">MediRemind</div>
                <div class="splash-subtitle">Your smart medication companion</div>
                <div class="splash-dots">
                    <div class="splash-dot"></div>
                    <div class="splash-dot"></div>
                    <div class="splash-dot"></div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('afterbegin', splashHTML);

        const splash = document.getElementById('splash-screen');

        // After the splash animation, transition to the landing page
        setTimeout(() => {
            splash.classList.add('splash-out');
            setTimeout(() => splash.remove(), 600);

            // Restore all pre-login UI that loadDashboard() had hidden
            document.getElementById('top-nav').classList.remove('hidden');
            document.getElementById('pre-login-main').classList.remove('hidden');
            document.getElementById('pre-login-footer').classList.remove('hidden');
            document.getElementById('hero-section').classList.remove('hidden');
            document.getElementById('auth-forms').classList.add('hidden');

            // Reset nav-links to pre-login state
            document.getElementById('nav-links').innerHTML = `
                <div class="text-sm" style="color:var(--mr-text-muted)">
                    <i class="fas fa-cloud mr-1"></i> Cloud Powered
                </div>
            `;
        }, 2000);

    } catch (error) {
        window.notify.error('Logout error: ' + error.message);
    }
}