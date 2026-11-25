/**
 * Apex Dental Studio — Interactive Scripts
 * - Sticky header elevation
 * - Native <dialog> booking modal & mobile drawer with closedby="any" fallback
 * - Service pre-selection from treatment cards
 * - Post-interaction validation (:user-invalid) + ARIA live-region sync
 */

(() => {
  'use strict';

  const header = document.getElementById('site-header');
  const bookingModal = document.getElementById('booking-modal');
  const bookingForm = document.getElementById('booking-form');
  const bookingConfirmation = document.getElementById('booking-confirmation');
  const serviceSelect = document.getElementById('service-select');
  const preferredDateInput = document.getElementById('preferred-date');
  const closeBookingBtn = document.getElementById('close-booking-modal');
  const cancelBookingBtn = document.getElementById('cancel-booking-btn');
  const doneBookingBtn = document.getElementById('done-booking-btn');
  const bookAnotherBtn = document.getElementById('book-another-btn');

  const mobileNavDialog = document.getElementById('mobile-nav-dialog');
  const openMobileNavBtn = document.getElementById('open-mobile-nav');
  const closeMobileNavBtn = document.getElementById('close-mobile-nav');
  const mobileDrawerBookBtn = document.getElementById('mobile-drawer-book-btn');

  // ---------------------------------------------------------------------------
  // 1. Sticky Header Scroll Elevation
  // ---------------------------------------------------------------------------
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------------------------------------------------------------------------
  // 2. Minimum Date Setup (Tomorrow as default suggestion, Today as min)
  // ---------------------------------------------------------------------------
  const today = new Date();
  const formatISO = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  preferredDateInput.min = formatISO(today);

  // ---------------------------------------------------------------------------
  // 3. Fallback for <dialog closedby="any"> in Browsers Without Native Support
  // ---------------------------------------------------------------------------
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    const isOutside = (e, dialog) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    for (const dialog of document.querySelectorAll('dialog[closedby="any"]')) {
      let pressedOutside = false;
      dialog.addEventListener('pointerdown', (e) => {
        pressedOutside = isOutside(e, dialog);
      });
      dialog.addEventListener('pointerup', (e) => {
        if (pressedOutside && isOutside(e, dialog)) {
          dialog.close();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Open / Close Booking Modal & Pre-select Service
  // ---------------------------------------------------------------------------
  const showFormView = () => {
    bookingForm.hidden = false;
    bookingConfirmation.hidden = true;
  };

  const openBookingModal = (preselectedService = '') => {
    showFormView();
    if (preselectedService) {
      const matchingOption = Array.from(serviceSelect.options).find(
        (opt) => opt.value === preselectedService
      );
      if (matchingOption) {
        serviceSelect.value = preselectedService;
      }
    }
    if (!bookingModal.open) {
      bookingModal.showModal();
    }
  };

  document.querySelectorAll('[data-open-booking]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const service = trigger.getAttribute('data-open-booking') || '';
      openBookingModal(service);
    });
  });

  closeBookingBtn.addEventListener('click', () => bookingModal.close('dismiss'));
  cancelBookingBtn.addEventListener('click', () => bookingModal.close('cancel'));
  doneBookingBtn.addEventListener('click', () => bookingModal.close('done'));

  bookAnotherBtn.addEventListener('click', () => {
    bookingForm.reset();
    showFormView();
    document.getElementById('patient-name').focus();
  });

  // Reset dialog.returnValue on close so stale values never leak
  bookingModal.addEventListener('close', () => {
    const returnVal = bookingModal.returnValue;
    bookingModal.returnValue = '';
    if (returnVal === 'done') {
      bookingForm.reset();
      showFormView();
    }
  });

  // ---------------------------------------------------------------------------
  // 5. Mobile Navigation Drawer
  // ---------------------------------------------------------------------------
  openMobileNavBtn.addEventListener('click', () => {
    if (!mobileNavDialog.open) {
      mobileNavDialog.showModal();
    }
  });

  closeMobileNavBtn.addEventListener('click', () => {
    mobileNavDialog.close();
  });

  mobileNavDialog.querySelectorAll('[data-close-drawer]').forEach((link) => {
    link.addEventListener('click', () => {
      mobileNavDialog.close();
    });
  });

  mobileDrawerBookBtn.addEventListener('click', () => {
    mobileNavDialog.close();
    openBookingModal();
  });

  // ---------------------------------------------------------------------------
  // 6. Post-Interaction Form Validation + ARIA Sync (:user-invalid)
  // ---------------------------------------------------------------------------
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
    else el.removeAttribute('aria-describedby');
  };

  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.classList.add('visually-hidden');
  document.body.append(announcer);

  let announceTimer;
  let announcedField;

  const spokenText = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((n) =>
      n.replaceWith(`${n.getAttribute('aria-label')}: `)
    );
    return copy.textContent.replace(/\s+/g, ' ').trim();
  };

  const announceError = (el) => {
    const error = document.getElementById(el.dataset.error);
    if (!error) return;
    const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : '';
    clearTimeout(announceTimer);
    announcer.textContent = '';
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + spokenText(error);
    }, 450);
  };

  const supportsUserInvalid = CSS.supports('selector(:user-invalid)');
  const flagged = new WeakSet();
  const announced = new WeakSet();

  const syncAria = (el, announce = false) => {
    if (!el.matches?.('input, select, textarea')) return;
    const invalid =
      (supportsUserInvalid && el.matches(':user-invalid')) ||
      el.classList.contains('user-invalid-fallback');

    if (invalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute('aria-invalid', 'true');
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
      el.setAttribute('aria-invalid', 'false');
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = '';
      }
    }
  };

  // Fallback for browsers without :user-invalid
  if (!supportsUserInvalid) {
    const dirtyState = new WeakMap();
    const updateFallback = (input) => {
      const isValid = input.validity.valid;
      input.classList.toggle('user-invalid-fallback', !isValid);
      input.classList.toggle('user-valid-fallback', isValid);
      syncAria(input, !isValid);
    };

    bookingForm.addEventListener('blur', (e) => {
      const el = e.target;
      if (!el.checkValidity) return;
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(el, state);
      if (state.hasInteracted) updateFallback(el);
    }, true);

    bookingForm.addEventListener('input', (e) => {
      const el = e.target;
      if (!el.checkValidity) return;
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(el, state);
      if (state.hasBlurred) updateFallback(el);
    });

    bookingForm.addEventListener('change', (e) => {
      const el = e.target;
      if (!el.checkValidity) return;
      const state = dirtyState.get(el) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(el, state);
      updateFallback(el);
    });

    bookingForm.addEventListener('invalid', (e) => {
      dirtyState.set(e.target, { hasInteracted: true, hasBlurred: true });
      updateFallback(e.target);
    }, true);
  }

  // Initialize ARIA states for all fields
  bookingForm.querySelectorAll('input, select, textarea').forEach((el) => syncAria(el));

  bookingForm.addEventListener('blur', (e) => syncAria(e.target, true), true);
  bookingForm.addEventListener('input', (e) => {
    const el = e.target;
    if (el.classList?.contains('user-invalid-fallback') && el.validity?.valid) {
      el.classList.remove('user-invalid-fallback');
      el.classList.add('user-valid-fallback');
    }
    if (el.hasAttribute?.('aria-invalid')) syncAria(el);
  });
  bookingForm.addEventListener('change', (e) => {
    const el = e.target;
    if (el.classList?.contains('user-invalid-fallback') && el.validity?.valid) {
      el.classList.remove('user-invalid-fallback');
      el.classList.add('user-valid-fallback');
    }
    syncAria(el, true);
  }, true);
  bookingForm.addEventListener('invalid', (e) => {
    announced.add(e.target);
    syncAria(e.target);
  }, true);
  bookingForm.addEventListener('reset', () => {
    setTimeout(() => {
      [...bookingForm.elements].forEach((el) => {
        el.classList.remove('user-invalid-fallback', 'user-valid-fallback');
        syncAria(el);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Form Submission & Confirmation Summary
  // ---------------------------------------------------------------------------
  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!bookingForm.checkValidity()) {
      // Mark every invalid control so inline errors show cleanly without overlapping native tooltips
      const invalidFields = Array.from(bookingForm.querySelectorAll('input, select, textarea')).filter(
        (el) => !el.validity.valid
      );
      invalidFields.forEach((el) => {
        el.classList.add('user-invalid-fallback');
        announced.add(el);
        syncAria(el);
      });
      if (invalidFields[0]) {
        invalidFields[0].focus();
      }
      return;
    }

    const data = new FormData(bookingForm);
    const name = String(data.get('patientName') || '').trim();
    const service = String(data.get('service') || '');
    const dateVal = String(data.get('preferredDate') || '');
    const timeWindow = String(data.get('timeWindow') || '');
    const refCode = `APX-${Math.floor(100000 + Math.random() * 900000)}`;

    document.getElementById('confirm-name').textContent = name;
    document.getElementById('confirm-ref').textContent = refCode;
    document.getElementById('confirm-service').textContent = service;
    document.getElementById('confirm-date').textContent = formatDisplayDate(dateVal);
    document.getElementById('confirm-time').textContent = timeWindow;

    bookingForm.hidden = true;
    bookingConfirmation.hidden = false;
    doneBookingBtn.focus();
  });
})();
