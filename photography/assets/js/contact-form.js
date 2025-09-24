document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const submitBtn = contactForm.querySelector('.submit-btn');
    
    if (!contactForm) return;

    contactForm.addEventListener('submit', handleFormSubmission);

    function handleFormSubmission(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            shootType: formData.get('shoot-type'),
            subject: formData.get('subject'),
            message: formData.get('message')
        };

        // Validate required fields
        if (!data.name || !data.email || !data.subject || !data.message) {
            showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Validate email format
        if (!isValidEmail(data.email)) {
            showMessage('Please enter a valid email address.', 'error');
            return;
        }

        // Show loading state
        setSubmitButtonState(true);

        // Generate mailto link
        const mailtoLink = generateMailtoLink(data);
        
        // Try to open mailto link
        try {
            window.location.href = mailtoLink;
            
            // Show success message after a short delay
            setTimeout(() => {
                showMessage('Email client opened! Please send the email to complete your inquiry.', 'success');
                contactForm.reset();
                setSubmitButtonState(false);
            }, 500);
            
        } catch (error) {
            console.error('Error opening email client:', error);
            
            // Fallback: show copy-to-clipboard option
            showMailtoFallback(data);
            setSubmitButtonState(false);
        }
    }

    function generateMailtoLink(data) {
        const recipient = 'mitchellandersoncarter@gmail.com';
        
        // Create subject line
        let subject = `Photography Inquiry: ${data.subject}`;
        if (data.shootType) {
            subject += ` (${getShootTypeLabel(data.shootType)})`;
        }

        // Create email body
        const body = `
Hello,

I'm interested in your photography services.

Name: ${data.name}
Email: ${data.email}
${data.shootType ? `Shoot Type: ${getShootTypeLabel(data.shootType)}` : ''}

Subject: ${data.subject}

Message:
${data.message}

Best regards,
${data.name}

---
This message was sent via your photography website contact form.
        `.trim();

        // Encode components for URL
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(body);

        return `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`;
    }

    function getShootTypeLabel(value) {
        const shootTypes = {
            'portrait': 'Portrait Session',
            'event': 'Event Photography',
            'nature': 'Nature/Landscape',
            'other': 'Other'
        };
        return shootTypes[value] || value;
    }

    function showMailtoFallback(data) {
        const fallbackModal = createFallbackModal(data);
        document.body.appendChild(fallbackModal);
        
        // Show modal
        requestAnimationFrame(() => {
            fallbackModal.classList.add('active');
        });
    }

    function createFallbackModal(data) {
        const modal = document.createElement('div');
        modal.className = 'contact-fallback-modal';
        
        const mailtoLink = generateMailtoLink(data);
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Email Client Not Available</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Your email client couldn't be opened automatically. You can:</p>
                    
                    <div class="fallback-options">
                        <div class="option">
                            <h4>Option 1: Copy Email Details</h4>
                            <p><strong>To:</strong> mitchellandersoncarter@gmail.com</p>
                            <p><strong>Subject:</strong> Photography Inquiry: ${data.subject}</p>
                            <div class="message-preview">
                                <strong>Message:</strong>
                                <textarea readonly rows="8">${generateEmailBody(data)}</textarea>
                            </div>
                            <button class="copy-btn" onclick="copyToClipboard('${generateEmailBody(data).replace(/'/g, "\\'")}')">
                                Copy Message
                            </button>
                        </div>
                        
                        <div class="option">
                            <h4>Option 2: Try Mailto Link Again</h4>
                            <a href="${mailtoLink}" class="mailto-link-btn">Open Email Client</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });

        return modal;
    }

    function generateEmailBody(data) {
        return `Hello,

I'm interested in your photography services.

Name: ${data.name}
Email: ${data.email}
${data.shootType ? `Shoot Type: ${getShootTypeLabel(data.shootType)}` : ''}

Subject: ${data.subject}

Message:
${data.message}

Best regards,
${data.name}

---
This message was sent via your photography website contact form.`;
    }

    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function setSubmitButtonState(loading) {
        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Sending...';
            submitBtn.classList.add('loading');
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Send Message';
            submitBtn.classList.remove('loading');
        }
    }

    function showMessage(message, type) {
        // Remove existing message
        const existingMessage = document.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `form-message ${type}`;
        messageDiv.textContent = message;

        // Insert after form
        contactForm.insertAdjacentElement('afterend', messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Global function for copy to clipboard (used in modal)
    window.copyToClipboard = function(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage('Message copied to clipboard!', 'success');
            }).catch(() => {
                fallbackCopyToClipboard(text);
            });
        } else {
            fallbackCopyToClipboard(text);
        }
    };

    function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            showMessage('Message copied to clipboard!', 'success');
        } catch (err) {
            showMessage('Copy failed. Please copy the message manually.', 'error');
        }
        
        document.body.removeChild(textArea);
    }
});
