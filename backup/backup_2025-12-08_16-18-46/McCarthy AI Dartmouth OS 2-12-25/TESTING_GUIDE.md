# 🧪 MCCARTHY AI DARTMOUTH OS - TESTING GUIDE

**Created:** December 5, 2025  
**Purpose:** Step-by-step testing instructions for all pending features  
**Status:** Active Testing

---

## 📋 TABLE OF CONTENTS

1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Escalation Keywords Testing](#2-escalation-keywords-testing)
3. [Callback Feature Testing](#3-callback-feature-testing)
4. [System Message Configuration Testing](#4-system-message-configuration-testing)
5. [RAG Knowledge Testing](#5-rag-knowledge-testing)
6. [Chat Dashboard Tabs Testing](#6-chat-dashboard-tabs-testing)
7. [Test Results Log](#7-test-results-log)

---

## 1. PRE-TESTING SETUP

### Login Details
- **URL:** https://customer-service-dashboard.pages.dev/login
- **Email:** `john@directtofilm.com.au`
- **Password:** `admin123`

### Chat Widget Test Page
- **Local:** http://localhost:5173 (if running `npm run dev` in chat-widget)
- **Or:** Any page with the embed script installed

### Ensure Staff Status
1. Check sidebar header for staff availability toggle
2. Set status to **Online** for escalation tests

---

## 2. ESCALATION KEYWORDS TESTING

### What We're Testing
The AI should detect when a customer wants to speak to a human and escalate the conversation to available staff.

### Test Location
**Chat Widget** (customer-facing)

### Escalation Keywords (Built-in)
The system looks for these phrases:
- "speak to a human"
- "talk to a person"
- "real person"
- "human agent"
- "speak to someone"
- "talk to a human"
- "need a person"
- "actual person"
- "live agent"
- "customer service rep"

---

### TEST 2.1: Basic Escalation Request

**Step 1:** Open chat widget and start a new chat
- Enter name: `Test Escalation User`
- Enter email: `escalation@test.com`

**Step 2:** Send initial message:
```
Hi, I have a question about my order
```

**Step 3:** Wait for AI response, then send:
```
I want to speak to a human please
```

**Expected Result:**
- ✅ AI should respond acknowledging the request
- ✅ Message should appear: "I'm connecting you with a team member..."
- ✅ Conversation should move to **Queued** or **Staff Live** tab in dashboard
- ✅ System message should appear in chat: "You've been connected to [Staff Name]"

**Actual Result:** ________________

---

### TEST 2.2: Frustrated Escalation

**Step 1:** Start new chat
- Name: `Frustrated Customer`
- Email: `frustrated@test.com`

**Step 2:** Send:
```
This is ridiculous! I need to talk to a real person right now!
```

**Expected Result:**
- ✅ AI detects frustration + escalation request
- ✅ Immediate escalation to staff

**Actual Result:** ________________

---

### TEST 2.3: Subtle Escalation

**Step 1:** Start new chat
- Name: `Subtle Request`
- Email: `subtle@test.com`

**Step 2:** Send:
```
Is there someone I can speak with about a complex issue?
```

**Expected Result:**
- ✅ AI should offer to escalate or handle the query

**Actual Result:** ________________

---

### TEST 2.4: No Staff Available

**Step 1:** Set your staff status to **Offline** in the sidebar

**Step 2:** Start new chat and request escalation:
```
I need to speak to a live agent please
```

**Expected Result:**
- ✅ AI should inform customer that staff are unavailable
- ✅ Should offer to take a message or try again later

**Actual Result:** ________________

---

## 3. CALLBACK FEATURE TESTING

### What We're Testing
The AI should detect callback requests, collect phone number, create a high-priority ticket, and close the chat.

### Callback Keywords (Built-in)
- "call me back"
- "phone call"
- "call me"
- "give me a call"
- "ring me"
- "callback"
- "call back"
- "phone me"

---

### TEST 3.1: Basic Callback Request

**Step 1:** Start new chat
- Name: `Callback Test User`
- Email: `callback@test.com`

**Step 2:** Send:
```
Can you please call me back about my order?
```

**Expected Result:**
- ✅ AI should ask for phone number
- ✅ Message like: "I'd be happy to arrange a callback. What's the best phone number to reach you?"

**Step 3:** Respond with phone number:
```
0412 345 678
```

**Expected Result:**
- ✅ AI confirms callback request
- ✅ Message like: "Thanks! A team member will call you at 0412 345 678 as soon as possible."
- ✅ Chat should close or offer to end
- ✅ High-priority ticket created in main ticket list

**Step 4:** Check Tickets page
- ✅ New ticket should appear with "Callback Request" in subject
- ✅ Priority should be **High** or **Urgent**
- ✅ Phone number should be in ticket description

**Actual Result:** ________________

---

### TEST 3.2: Callback with Context

**Step 1:** Start new chat
- Name: `Order Callback`
- Email: `ordercallback@test.com`

**Step 2:** Have a conversation first:
```
I ordered some transfers last week and they haven't arrived
```

**Step 3:** Wait for AI response, then:
```
Actually, can someone just give me a call to sort this out? My number is 0400 111 222
```

**Expected Result:**
- ✅ AI should capture phone number from message
- ✅ Create callback ticket with order context
- ✅ Confirm callback arranged

**Actual Result:** ________________

---

### TEST 3.3: Invalid Phone Number

**Step 1:** Start new chat and request callback

**Step 2:** When asked for number, send:
```
twelve
```

**Expected Result:**
- ✅ AI should ask for a valid phone number
- ✅ Should not create ticket until valid number provided

**Actual Result:** ________________

---

## 4. SYSTEM MESSAGE CONFIGURATION TESTING

### Test Location
**Settings → AI Agent → System Message**

---

### TEST 4.1: View Default Configuration

**Step 1:** Navigate to Settings → AI Agent → System Message

**Expected Result:**
- ✅ Page loads with all sections visible
- ✅ Role Definition has default text
- ✅ Personality Traits has default text
- ✅ Responsibilities has default text
- ✅ Do's has default text
- ✅ Don'ts has default text
- ✅ Tone of Voice has default text
- ✅ All text areas are large enough to see content without scrolling

**Actual Result:** ________________

---

### TEST 4.2: Save Configuration

**Step 1:** Modify the Role Definition to add:
```
You are McCarthy AI, the friendly customer service assistant for Amazing Transfers.
```

**Step 2:** Click "Save Configuration"

**Expected Result:**
- ✅ Success message appears
- ✅ Changes are saved

**Step 3:** Refresh the page

**Expected Result:**
- ✅ Your changes are still there

**Actual Result:** ________________

---

### TEST 4.3: Preview Function

**Step 1:** Click "Show Full Preview" button

**Expected Result:**
- ✅ Modal or section shows complete system prompt
- ✅ All sections combined into one view

**Actual Result:** ________________

---

### TEST 4.4: Reset to Default

**Step 1:** Make some changes to any field

**Step 2:** Click "Reset to Default"

**Expected Result:**
- ✅ All fields reset to original defaults
- ✅ Confirmation prompt appears first (optional)

**Actual Result:** ________________

---

## 5. RAG KNOWLEDGE TESTING

### Test Location
**Settings → AI Agent → RAG Knowledge**

---

### TEST 5.1: View Uploaded Documents

**Step 1:** Navigate to Settings → AI Agent → RAG Knowledge

**Expected Result:**
- ✅ Page loads showing document list
- ✅ Shows 9 uploaded documents
- ✅ Each document shows: Title, Filename, Category, Word Count, Upload Date/Time

**Documents Expected:**
1. FAQ/Frequently_Asked_Questions.md
2. Policies/Returns_and_Refunds.md
3. Policies/Shipping_and_Delivery.md
4. Policies/Terms_and_Conditions.md
5. Policies/Privacy_Policy.md
6. Products/DTF_Transfers_Overview.md
7. Products/UV_DTF_Transfers_Overview.md
8. General/Company_Information.md
9. General/Ordering_Process.md

**Actual Result:** ________________

---

### TEST 5.2: Upload New Document

**Step 1:** Create a test file on your computer:
- Filename: `test_document.md`
- Content:
```markdown
# Test Document

This is a test document for RAG knowledge testing.

## Key Points
- Point 1: Testing upload functionality
- Point 2: Testing display functionality
- Point 3: Testing delete functionality
```

**Step 2:** Drag and drop the file into the upload area (or click Browse)

**Step 3:** Select category: "General"

**Step 4:** Click Upload

**Expected Result:**
- ✅ File uploads successfully
- ✅ Success message appears
- ✅ Document appears in list with correct details

**Actual Result:** ________________

---

### TEST 5.3: Delete Document

**Step 1:** Find the test document you just uploaded

**Step 2:** Click the Delete button (trash icon)

**Expected Result:**
- ✅ Confirmation prompt appears
- ✅ Document is removed from list
- ✅ Count updates

**Actual Result:** ________________

---

### TEST 5.4: Verify AI Uses RAG Data

**Step 1:** Open chat widget and start new chat

**Step 2:** Ask a question that's in the RAG documents:
```
What is your returns policy?
```

**Expected Result:**
- ✅ AI response should include specific details from the Returns_and_Refunds.md document
- ✅ Response should NOT be generic

**Step 3:** Ask another question:
```
How long does shipping take?
```

**Expected Result:**
- ✅ AI response should include specific details from Shipping_and_Delivery.md

**Actual Result:** ________________

---

## 6. CHAT DASHBOARD TABS TESTING

### Test Location
**Chat Dashboard** (click chat icon in sidebar or navigate to /chat)

---

### TEST 6.1: Tab Display

**Step 1:** Navigate to Chat Dashboard

**Expected Result:**
- ✅ 4 tabs visible: AI, Staff Live, Queued, Closed
- ✅ Each tab shows a count badge
- ✅ Back arrow visible (left of speech bubble)

**Actual Result:** ________________

---

### TEST 6.2: AI Tab

**Step 1:** Click the "AI" tab

**Expected Result:**
- ✅ Shows conversations currently being handled by AI
- ✅ Conversations show customer name, email, last message
- ✅ Click on conversation shows messages on right

**Step 2:** Start a new chat in the widget (don't request human)

**Expected Result:**
- ✅ New conversation appears in AI tab
- ✅ Count increases

**Actual Result:** ________________

---

### TEST 6.3: Staff Live Tab

**Step 1:** Click "Staff Live" tab

**Expected Result:**
- ✅ Shows conversations assigned to staff
- ✅ Empty if no active staff chats

**Step 2:** Take over a conversation from AI tab (click "Take Over" button)

**Expected Result:**
- ✅ Conversation moves to Staff Live tab
- ✅ You can now reply to customer

**Actual Result:** ________________

---

### TEST 6.4: Queued Tab

**Step 1:** Click "Queued" tab

**Expected Result:**
- ✅ Shows conversations waiting for staff pickup
- ✅ Shows wait time for each conversation

**Step 2:** If conversations in queue, click "Pick Up" button

**Expected Result:**
- ✅ Conversation assigned to you
- ✅ Moves to Staff Live tab

**Actual Result:** ________________

---

### TEST 6.5: Closed Tab

**Step 1:** Click "Closed" tab

**Expected Result:**
- ✅ Shows closed/resolved conversations
- ✅ Shows resolution type badge (AI Resolved, Staff Resolved, Inactive)

**Step 2:** Close an active conversation using "Close Chat" button

**Expected Result:**
- ✅ Modal asks for resolution type
- ✅ After closing, conversation appears in Closed tab

**Actual Result:** ________________

---

### TEST 6.6: Back Navigation

**Step 1:** Click the back arrow (←) next to the speech bubble icon

**Expected Result:**
- ✅ Navigates back to /tickets page

**Actual Result:** ________________

---

## 7. TEST RESULTS LOG

### Date: _______________
### Tester: _______________

| Test ID | Test Name | Pass/Fail | Notes |
|---------|-----------|-----------|-------|
| 2.1 | Basic Escalation | | |
| 2.2 | Frustrated Escalation | | |
| 2.3 | Subtle Escalation | | |
| 2.4 | No Staff Available | | |
| 3.1 | Basic Callback | | |
| 3.2 | Callback with Context | | |
| 3.3 | Invalid Phone Number | | |
| 4.1 | View Default Config | | |
| 4.2 | Save Configuration | | |
| 4.3 | Preview Function | | |
| 4.4 | Reset to Default | | |
| 5.1 | View Documents | | |
| 5.2 | Upload Document | | |
| 5.3 | Delete Document | | |
| 5.4 | AI Uses RAG Data | | |
| 6.1 | Tab Display | | |
| 6.2 | AI Tab | | |
| 6.3 | Staff Live Tab | | |
| 6.4 | Queued Tab | | |
| 6.5 | Closed Tab | | |
| 6.6 | Back Navigation | | |

---

## 📝 QUICK COPY-PASTE TEST MESSAGES

### Escalation Test Messages
```
I want to speak to a human please
```
```
Can I talk to a real person?
```
```
I need to speak with a live agent
```
```
This is frustrating, let me talk to someone!
```
```
Is there a customer service rep I can speak with?
```

### Callback Test Messages
```
Can you please call me back?
```
```
I'd like someone to give me a call about my order
```
```
My number is 0412 345 678, please call me
```
```
Can I get a callback? Ring me on 0400 111 222
```

### RAG Knowledge Test Questions
```
What is your returns policy?
```
```
How long does shipping take?
```
```
What are DTF transfers?
```
```
How do I place an order?
```
```
What payment methods do you accept?
```

---

## 🐛 BUG REPORT TEMPLATE

If you find an issue, copy this template:

```
### Bug Report

**Test ID:** 
**Feature:** 
**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Screenshots:** (if applicable)

**Browser/Device:**

**Date/Time:**
```

---

**Document Version:** 1.0  
**Last Updated:** December 5, 2025  


