
document.addEventListener('DOMContentLoaded', function() {
    initializeTooltips();

    initializeSmoothScroll();

    initializeFormValidation();

    addFadeInAnimations();

    updateNotificationBadge();

    console.log('PowerShare Platform Initialized');
});

function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href !== '#!') {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
}

function initializeFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
}

function addFadeInAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .feature-card').forEach(el => {
        observer.observe(el);
    });
}

function updateNotificationBadge() {
    const notificationCount = 5;
    const badge = document.querySelector('.navbar .badge');
    if (badge && notificationCount > 0) {
        badge.textContent = notificationCount;
    }
}

function checkAuthentication() {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    if (!userRole && (
        window.location.pathname.includes('dashboard') ||
        window.location.pathname.includes('billing') ||
        window.location.pathname.includes('outage')
    )) {
        window.location.href = 'login.html';
    }

    return { userRole, userName };
}

function logout() {
    localStorage.clear();

    showNotification('You have been logged out successfully', 'info');

    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';

    // Create message text node (XSS safe)
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    // Add space
    notification.appendChild(document.createTextNode(' '));

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-close';
    closeBtn.setAttribute('data-bs-dismiss', 'alert');
    closeBtn.setAttribute('aria-label', 'Close');
    notification.appendChild(closeBtn);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function processPayment(invoiceId, amount) {
    showNotification('Processing payment...', 'info');

    setTimeout(() => {
        showNotification(`Payment of $${amount} successful!`, 'success');

        updatePaymentStatus(invoiceId, 'paid');

      
    }, 2000);
}

function updatePaymentStatus(invoiceId, status) {
    const invoiceRow = document.querySelector(`tr[data-invoice="${invoiceId}"]`);
    if (invoiceRow) {
        const statusBadge = invoiceRow.querySelector('.badge');
        if (statusBadge) {
            statusBadge.className = 'badge bg-success';
            // Create icon element
            const icon = document.createElement('i');
            icon.className = 'fas fa-check me-1';
            // Clear and add elements (XSS safe)
            statusBadge.textContent = '';
            statusBadge.appendChild(icon);
            statusBadge.appendChild(document.createTextNode('Paid'));
        }
    }
}

function searchTable(searchTerm, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const term = searchTerm.toLowerCase();

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(term) ? '' : 'none';
    });
}

function filterByStatus(status, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
        if (status === 'all') {
            row.style.display = '';
        } else {
            const statusBadge = row.querySelector('.badge');
            if (statusBadge && statusBadge.textContent.toLowerCase().includes(status)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

function formatDateTime(date) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(date).toLocaleDateString('en-US', options);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function startCountdown(targetTime, elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetTime - now;

        if (distance < 0) {
            element.textContent = 'Outage in progress';
            return;
        }

        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        element.textContent = `${hours}h ${minutes}m ${seconds}s`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function loadUserData() {
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    document.querySelectorAll('#userNameDisplay, #userName').forEach(el => {
        if (userName) {
            el.textContent = userName;
        }
    });

    return { userRole, userName };
}

function createLineChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function createDoughnutChart(canvasId, labels, data) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#0d6efd',
                    '#0dcaf0',
                    '#ffc107',
                    '#198754',
                    '#dc3545'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function handleFileUpload(input, callback) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        callback(e.target.result, file);
    };
    reader.readAsDataURL(file);
}

function showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
}

function hideModal(modalId) {
    const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modal) {
        modal.hide();
    }
}

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        return false;
    }
}

function loadFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error('Error loading from localStorage:', e);
        return null;
    }
}

async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`/api/${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'API call failed');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        showNotification(error.message, 'danger');
        throw error;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'danger');
    });
}

function printInvoice(invoiceId) {
    window.print();
}

function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.setAttribute('data-theme', savedTheme);
    }
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[\d\s\-\+\(\)]+$/;
    return re.test(phone) && phone.replace(/\D/g, '').length >= 8;
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;

    return {
        score: strength,
        text: ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][Math.max(0, strength - 1)]
    };
}

function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    loader.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    loader.style.zIndex = '9999';

    // Create spinner element (XSS safe)
    const spinner = document.createElement('div');
    spinner.className = 'spinner-border text-light';
    spinner.setAttribute('role', 'status');
    loader.appendChild(spinner);

    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.remove();
    }
}

function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}

let autoSaveTimeout;
function autoSave(formId, saveFunction) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        const form = document.getElementById(formId);
        if (form) {
            const formData = new FormData(form);
            saveFunction(formData);
        }
    }, 1000);
}

window.PowerShareApp = {
    logout,
    processPayment,
    showNotification,
    searchTable,
    filterByStatus,
    formatDate,
    formatDateTime,
    formatCurrency,
    copyToClipboard,
    printInvoice,
    downloadFile,
    toggleTheme,
    confirmAction
};

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 200; 

    counters.forEach(counter => {
        const animate = () => {
            const value = +counter.getAttribute('data-target');
            const data = +counter.innerText.replace(/[^0-9]/g, '');

            const time = value / speed;
            if (data < value) {
                const increment = Math.ceil(time);
                counter.innerText = data + increment;
                setTimeout(animate, 1);
            } else {
                counter.innerText = value + (value === 99 ? '%' : '+');
            }
        };
        animate();
    });
}

function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('aos-animate');

                if (entry.target.closest('.stats-section')) {
                    const counters = entry.target.querySelectorAll('.stat-number');
                    if (counters.length > 0) {
                        animateCounters();
                    }
                }

                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('[data-aos]').forEach(element => {
        observer.observe(element);
    });

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }
}

function initParallaxEffect() {
    const hero = document.querySelector('.hero-modern');
    if (!hero) return;

    const shapes = document.querySelectorAll('.shape');

    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        shapes.forEach((shape, index) => {
            const speed = (index + 1) * 20;
            const x = (mouseX - 0.5) * speed;
            const y = (mouseY - 0.5) * speed;

            shape.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
}

function initSmoothReveal() {
    const cards = document.querySelectorAll('.feature-card-modern, .step-card, .testimonial-card, .pricing-card-modern');

    const revealOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, revealOptions);

    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        revealOnScroll.observe(card);
    });
}

function initHeroCardAnimations() {
    const illustrationCards = document.querySelectorAll('.illustration-card');

    illustrationCards.forEach((card, index) => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) rotate(3deg)';
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) rotate(0deg)';
        });
    });
}

function initTypingEffect() {
    const gradientText = document.querySelector('.gradient-text');
    if (!gradientText) return;

    const text = gradientText.textContent;
    gradientText.textContent = '';
    gradientText.style.opacity = '1';

    let index = 0;
    const typingSpeed = 100;

    function type() {
        if (index < text.length) {
            gradientText.textContent += text.charAt(index);
            index++;
            setTimeout(type, typingSpeed);
        }
    }

    setTimeout(type, 1000);
}

function initButtonRipple() {
    const buttons = document.querySelectorAll('.btn-hero-primary, .btn-hero-secondary, .btn-pricing');

    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });
}

function initCardTilt() {
    const pricingCards = document.querySelectorAll('.pricing-card-modern');

    pricingCards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });

        card.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

function initHomePageAnimations() {
    const isHomePage = document.querySelector('.hero-modern');
    if (!isHomePage) return;

    console.log('Initializing home page animations...');

    initScrollAnimations();
    initParallaxEffect();
    initSmoothReveal();
    initHeroCardAnimations();
    initButtonRipple();
    initCardTilt();


    console.log('Home page animations initialized successfully');
}

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
    .btn {
        position: relative;
        overflow: hidden;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(rippleStyle);

console.log('PowerShare JavaScript loaded successfully');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomePageAnimations);
} else {
    initHomePageAnimations();
}

