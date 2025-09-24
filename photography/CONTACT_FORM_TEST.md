# Contact Form Testing Guide

## How to Test the Contact Form

1. **Start the local server:**
   ```bash
   cd photography-website
   python3 -m http.server 8000
   ```

2. **Open the contact page:**
   - Navigate to: http://localhost:8000/contact.html

3. **Test the form:**
   - Fill out all required fields (Name, Email, Subject, Message)
   - Optionally select a shoot type
   - Click "Send Message"

## Expected Behavior

### ✅ Success Case:
- Form validates all required fields
- Email client opens with pre-filled mailto link
- Success message appears: "Email client opened! Please send the email to complete your inquiry."
- Form resets after successful submission

### 🔄 Fallback Case (if email client not available):
- Modal appears with two options:
  1. **Copy Email Details** - Copy message to clipboard for manual pasting
  2. **Try Mailto Link Again** - Alternative mailto button

## Email Template Generated:

**To:** mitchellandersoncarter@gmail.com  
**Subject:** Photography Inquiry: [Subject] ([Shoot Type])  
**Body:**
```
Hello,

I'm interested in your photography services.

Name: [Name]
Email: [Email]
Shoot Type: [Shoot Type] (if selected)

Subject: [Subject]

Message:
[Message]

Best regards,
[Name]

---
This message was sent via your photography website contact form.
```

## Form Validation:

- ✅ Name field (required)
- ✅ Email field (required + email format validation)
- ✅ Subject field (required)
- ✅ Message field (required)
- ⚪ Shoot Type (optional dropdown)

## Features Implemented:

- **Mailto link generation** with proper encoding
- **Form validation** with error messages
- **Loading states** with spinner animation
- **Success/error feedback** messages
- **Fallback modal** for when mailto doesn't work
- **Copy to clipboard** functionality
- **Responsive design** for mobile devices
- **Keyboard navigation** (ESC to close modal)
- **Accessibility** features (ARIA labels, focus management)

## Browser Compatibility:

- ✅ Chrome/Safari/Firefox/Edge (modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Fallback works for any browser without email client integration
