/* ============================================
   Kibi — Authentication Module
   Login, signup, and session management
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');

  if (loginForm) initLoginForm(loginForm);
  if (signupForm) initSignupForm(signupForm);
});

/* --- Login Form --- */
function initLoginForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    // Validation
    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    if (!password) return showFieldError('password', 'Password is required');

    // Find user
    const user = getUserByEmail(email);
    if (!user) return showFieldError('email', 'No account found with this email');
    if (user.password !== password) return showFieldError('password', 'Incorrect password');

    // Login success
    setCurrentUser(user.id);

    // Create welcome notification
    saveNotification({
      userId: user.id,
      message: `Welcome back, ${user.name}! Ready for your next adventure?`,
      type: 'welcome'
    });

    showToast('Welcome back! 🎉', 'success');

    // Redirect after brief delay
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  });
}

/* --- Signup Form --- */
function initSignupForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(form);

    const name = form.querySelector('#name').value.trim();
    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    const confirmPassword = form.querySelector('#confirmPassword').value;

    // Validation
    if (!name) return showFieldError('name', 'Name is required');
    if (name.length < 2) return showFieldError('name', 'Name must be at least 2 characters');
    if (!email) return showFieldError('email', 'Email is required');
    if (!isValidEmail(email)) return showFieldError('email', 'Please enter a valid email');
    if (!password) return showFieldError('password', 'Password is required');
    if (password.length < 4) return showFieldError('password', 'Password must be at least 4 characters');
    if (password !== confirmPassword) return showFieldError('confirmPassword', 'Passwords do not match');

    // Check if email exists
    if (getUserByEmail(email)) {
      return showFieldError('email', 'An account with this email already exists');
    }

    // Create user
    const user = saveUser({
      name,
      email,
      password,
      travelStyle: [],
      budget: '',
      socialPreference: '',
      interests: [],
      travelPace: '',
      avatar: name.charAt(0).toUpperCase(),
      savedTrips: []
    });

    // Set as current user
    setCurrentUser(user.id);

    // Welcome notification
    saveNotification({
      userId: user.id,
      message: `Welcome to Kibi, ${name}! Let's set up your travel profile.`,
      type: 'welcome'
    });

    showToast('Account created! 🎉', 'success');

    // Redirect to onboarding
    setTimeout(() => {
      window.location.href = 'onboarding.html';
    }, 500);
  });
}

/* --- Validation Helpers --- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  const existingError = field.parentElement.querySelector('.form-error');
  if (existingError) existingError.remove();

  const error = document.createElement('span');
  error.className = 'form-error';
  error.textContent = message;
  field.parentElement.appendChild(error);
  field.style.borderColor = 'var(--color-error)';
  field.focus();
}

function clearErrors(form) {
  form.querySelectorAll('.form-error').forEach(el => el.remove());
  form.querySelectorAll('.form-input').forEach(el => {
    el.style.borderColor = '';
  });
}
