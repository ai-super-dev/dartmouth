# 🧪 FOUNDATIONAL AGENT - COMPREHENSIVE TEST PLAN

**Date:** November 17, 2025  
**Agent:** Dartmouth Foundational Agent  
**Version:** 1.0.0  
**Status:** Production Ready - Awaiting Full Testing

---

## 📋 TESTING OVERVIEW

### **Test Environment:**
- **API Endpoint:** `https://agent-army-worker.dartmouth.workers.dev`
- **Test Interface:** `https://dartmouth-chat.pages.dev`
- **Backend:** Cloudflare Workers + D1 + KV + OpenAI GPT-4

### **Testing Goals:**
1. Verify all 10 core components work correctly
2. Test all 7 conversation handlers
3. Validate multi-turn conversation flow
4. Confirm memory and context persistence
5. Test edge cases and error handling
6. Measure response quality and accuracy
7. Verify database operations
8. Test calculation accuracy
9. Validate intent detection
10. Confirm frustration and repetition handling

---

## 🎯 TEST CATEGORIES

### **1. HEALTH & INFRASTRUCTURE TESTS**
### **2. INTENT DETECTION TESTS**
### **3. CONVERSATION HANDLER TESTS**
### **4. CALCULATION ENGINE TESTS**
### **5. MEMORY & CONTEXT TESTS**
### **6. MULTI-TURN CONVERSATION TESTS**
### **7. ERROR HANDLING & EDGE CASES**
### **8. PERFORMANCE & RELIABILITY TESTS**
### **9. INTEGRATION TESTS**
### **10. USER EXPERIENCE TESTS**

---

## 1️⃣ HEALTH & INFRASTRUCTURE TESTS

### **Test 1.1: System Health Check**
**Endpoint:** `GET /health`  
**Expected Result:**
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "cache": "up",
    "llm": "up"
  }
}
```
**Pass Criteria:** All services return "up"

---

### **Test 1.2: Readiness Check**
**Endpoint:** `GET /health/ready`  
**Expected Result:** Status 200, ready: true  
**Pass Criteria:** System reports ready state

---

### **Test 1.3: Liveness Check**
**Endpoint:** `GET /health/live`  
**Expected Result:** Status 200, alive: true  
**Pass Criteria:** System responds within 1 second

---

## 2️⃣ INTENT DETECTION TESTS

### **Test 2.1: Greeting Intent**
**Input:** "Hello!"  
**Expected Intent:** `greeting`  
**Expected Confidence:** > 0.8  
**Pass Criteria:** Correctly identifies greeting

---

### **Test 2.2: Calculation Intent**
**Input:** "What size can I print 4000x6000 pixels at 300 DPI?"  
**Expected Intent:** `calculation`  
**Expected Confidence:** > 0.8  
**Pass Criteria:** Correctly identifies calculation request

---

### **Test 2.3: How-To Intent**
**Input:** "How do I prepare artwork for printing?"  
**Expected Intent:** `how_to`  
**Expected Confidence:** > 0.7  
**Pass Criteria:** Correctly identifies how-to question

---

### **Test 2.4: Information Intent**
**Input:** "What file formats do you support?"  
**Expected Intent:** `information`  
**Expected Confidence:** > 0.7  
**Pass Criteria:** Correctly identifies information request

---

### **Test 2.5: Follow-Up Intent**
**Input:** (After previous message) "What about that?"  
**Expected Intent:** `follow_up`  
**Expected Confidence:** > 0.7  
**Pass Criteria:** Correctly identifies follow-up question

---

### **Test 2.6: Clarification Intent**
**Input:** "I don't understand"  
**Expected Intent:** `clarification`  
**Expected Confidence:** > 0.7  
**Pass Criteria:** Correctly identifies clarification need

---

### **Test 2.7: Feedback Intent**
**Input:** "That was helpful, thanks!"  
**Expected Intent:** `feedback`  
**Expected Confidence:** > 0.7  
**Pass Criteria:** Correctly identifies feedback

---

### **Test 2.8: Ambiguous Intent**
**Input:** "hmm"  
**Expected Intent:** `unknown` or appropriate fallback  
**Pass Criteria:** Handles ambiguity gracefully

---

## 3️⃣ CONVERSATION HANDLER TESTS

### **Test 3.1: Greeting Handler**
**Input:** "Hi there!"  
**Expected Response:** Friendly greeting with offer to help  
**Pass Criteria:**
- Responds warmly
- Offers assistance
- Sets positive tone
- Response time < 2 seconds

---

### **Test 3.2: Calculation Handler - Simple**
**Input:** "Calculate print size for 3000x2000 pixels at 300 DPI"  
**Expected Response:**
- Width: 10 inches
- Height: 6.67 inches
- Aspect ratio: 3:2
**Pass Criteria:**
- Calculations are accurate
- Units are correct
- Response is clear

---

### **Test 3.3: Calculation Handler - Complex**
**Input:** "I have a 6000x4000 pixel image. What's the largest I can print at 150 DPI and 300 DPI?"  
**Expected Response:**
- 150 DPI: 40" x 26.67"
- 300 DPI: 20" x 13.33"
**Pass Criteria:**
- Both calculations correct
- Comparison is clear
- Recommendations provided

---

### **Test 3.4: How-To Handler**
**Input:** "How do I prepare a file for large format printing?"  
**Expected Response:** Step-by-step guidance  
**Pass Criteria:**
- Provides actionable steps
- Mentions resolution, color mode, file format
- Professional and helpful

---

### **Test 3.5: Information Handler**
**Input:** "What's the difference between RGB and CMYK?"  
**Expected Response:** Clear explanation  
**Pass Criteria:**
- Accurate information
- Easy to understand
- Relevant to printing context

---

### **Test 3.6: Repeat Handler**
**Input:** (Same question twice)  
**Expected Response:** Detects repetition, offers alternative explanation  
**Pass Criteria:**
- Detects repetition
- Provides different phrasing
- Offers to clarify

---

### **Test 3.7: Fallback Handler**
**Input:** "asdfghjkl"  
**Expected Response:** Polite confusion, request for clarification  
**Pass Criteria:**
- Handles gracefully
- Asks for clarification
- Maintains helpful tone

---

## 4️⃣ CALCULATION ENGINE TESTS

### **Test 4.1: Standard DPI Calculation**
**Input:**
```json
{
  "widthPixels": 3000,
  "heightPixels": 2000,
  "dpi": 300
}
```
**Expected Output:**
- Width: 10 inches
- Height: 6.67 inches
**Pass Criteria:** Accurate to 2 decimal places

---

### **Test 4.2: Large Format Calculation**
**Input:**
```json
{
  "widthPixels": 12000,
  "heightPixels": 8000,
  "dpi": 150
}
```
**Expected Output:**
- Width: 80 inches (6.67 feet)
- Height: 53.33 inches (4.44 feet)
**Pass Criteria:** Handles large dimensions correctly

---

### **Test 4.3: Reverse Calculation (Size to Pixels)**
**Input:** "How many pixels do I need for a 24x36 inch print at 300 DPI?"  
**Expected Output:**
- Width: 7200 pixels
- Height: 10800 pixels
**Pass Criteria:** Reverse calculation is accurate

---

### **Test 4.4: Aspect Ratio Preservation**
**Input:** Various dimensions  
**Expected Output:** Correct aspect ratio identification (16:9, 4:3, 3:2, etc.)  
**Pass Criteria:** Aspect ratios correctly identified

---

### **Test 4.5: Edge Case - Very Low DPI**
**Input:**
```json
{
  "widthPixels": 1000,
  "heightPixels": 1000,
  "dpi": 72
}
```
**Expected Output:** Warning about print quality  
**Pass Criteria:** Warns about low resolution

---

### **Test 4.6: Edge Case - Very High DPI**
**Input:**
```json
{
  "widthPixels": 10000,
  "heightPixels": 10000,
  "dpi": 600
}
```
**Expected Output:** Calculation with note about overkill  
**Pass Criteria:** Handles high DPI appropriately

---

## 5️⃣ MEMORY & CONTEXT TESTS

### **Test 5.1: Short-Term Memory**
**Conversation:**
1. "My image is 4000x3000 pixels"
2. "What size can I print it at 300 DPI?"

**Expected:** Agent remembers dimensions from message 1  
**Pass Criteria:** Uses context from previous message

---

### **Test 5.2: Session Persistence**
**Test:**
1. Start conversation
2. Get session ID
3. Close and reopen
4. Use same session ID

**Expected:** Conversation history retained  
**Pass Criteria:** Previous messages accessible

---

### **Test 5.3: Context Window**
**Test:** Have 10+ message conversation  
**Expected:** Agent maintains context across all messages  
**Pass Criteria:** References earlier messages appropriately

---

### **Test 5.4: Multi-Topic Memory**
**Conversation:**
1. Discuss image size
2. Ask about file formats
3. Return to image size topic

**Expected:** Agent remembers both topics  
**Pass Criteria:** Switches between topics smoothly

---

## 6️⃣ MULTI-TURN CONVERSATION TESTS

### **Test 6.1: Progressive Refinement**
**Conversation:**
1. "I need help with printing"
2. "I have a 5000x3000 pixel image"
3. "What's the best DPI for a poster?"
4. "Calculate the size at 150 DPI"

**Expected:** Natural conversation flow  
**Pass Criteria:** Each response builds on previous context

---

### **Test 6.2: Topic Switching**
**Conversation:**
1. "Calculate 3000x2000 at 300 DPI"
2. "What file format should I use?"
3. "Back to the calculation - what about 150 DPI?"

**Expected:** Handles topic switches gracefully  
**Pass Criteria:** Maintains context for each topic

---

### **Test 6.3: Clarification Loop**
**Conversation:**
1. "I need to print something"
2. Agent: "What are the dimensions?"
3. "I'm not sure"
4. Agent: "Can you check the file properties?"
5. "It's 4000x3000"

**Expected:** Patient clarification process  
**Pass Criteria:** Guides user to provide needed information

---

## 7️⃣ ERROR HANDLING & EDGE CASES

### **Test 7.1: Missing Parameters**
**Input:** "Calculate print size" (no dimensions)  
**Expected:** Politely asks for missing information  
**Pass Criteria:** Identifies missing data, requests it

---

### **Test 7.2: Invalid Input**
**Input:** "Calculate -1000 x 2000 pixels"  
**Expected:** Error message about invalid dimensions  
**Pass Criteria:** Validates input, provides helpful error

---

### **Test 7.3: Extremely Long Message**
**Input:** 5000+ character message  
**Expected:** Processes or politely asks for shorter input  
**Pass Criteria:** Handles gracefully, doesn't crash

---

### **Test 7.4: Special Characters**
**Input:** "What about émojis 🎨 and spëcial çharacters?"  
**Expected:** Handles correctly  
**Pass Criteria:** No encoding errors

---

### **Test 7.5: Rapid-Fire Messages**
**Test:** Send 5 messages in quick succession  
**Expected:** All processed correctly  
**Pass Criteria:** No race conditions, all responses correct

---

### **Test 7.6: Network Timeout Simulation**
**Test:** Simulate slow LLM response  
**Expected:** Graceful timeout handling  
**Pass Criteria:** User gets feedback, no hanging

---

## 8️⃣ PERFORMANCE & RELIABILITY TESTS

### **Test 8.1: Response Time - Simple Query**
**Input:** "Hello"  
**Expected:** Response < 2 seconds  
**Pass Criteria:** Fast response for simple queries

---

### **Test 8.2: Response Time - Complex Query**
**Input:** Complex calculation with explanation  
**Expected:** Response < 5 seconds  
**Pass Criteria:** Reasonable time for complex queries

---

### **Test 8.3: Concurrent Users**
**Test:** Simulate 10 concurrent conversations  
**Expected:** All handled correctly  
**Pass Criteria:** No degradation, all responses accurate

---

### **Test 8.4: Database Performance**
**Test:** 100 messages in one session  
**Expected:** All stored and retrievable  
**Pass Criteria:** No database errors, fast retrieval

---

### **Test 8.5: Cache Performance**
**Test:** Repeat identical query  
**Expected:** Second response faster (if cached)  
**Pass Criteria:** Cache improves performance

---

## 9️⃣ INTEGRATION TESTS

### **Test 9.1: Full Conversation Flow**
**Scenario:** Complete user journey from greeting to calculation to follow-up  
**Expected:** Seamless experience  
**Pass Criteria:** All components work together

---

### **Test 9.2: LLM Integration**
**Test:** Verify OpenAI API calls work  
**Expected:** Natural language responses  
**Pass Criteria:** LLM enhances responses appropriately

---

### **Test 9.3: Database Integration**
**Test:** Verify D1 storage and retrieval  
**Expected:** Data persists correctly  
**Pass Criteria:** No data loss, accurate retrieval

---

### **Test 9.4: KV Cache Integration**
**Test:** Verify KV storage for sessions  
**Expected:** Fast session access  
**Pass Criteria:** Sessions load quickly

---

## 🔟 USER EXPERIENCE TESTS

### **Test 10.1: Tone & Personality**
**Test:** Multiple conversations  
**Expected:** Consistent, helpful, professional tone  
**Pass Criteria:** Positive user experience

---

### **Test 10.2: Error Recovery**
**Scenario:** User makes mistake, agent helps recover  
**Expected:** Patient, helpful guidance  
**Pass Criteria:** User can complete task despite errors

---

### **Test 10.3: Explanation Quality**
**Test:** Ask for explanations of calculations  
**Expected:** Clear, understandable explanations  
**Pass Criteria:** Non-technical users can understand

---

### **Test 10.4: Proactive Assistance**
**Scenario:** User asks basic question  
**Expected:** Agent offers related helpful information  
**Pass Criteria:** Goes beyond minimum answer

---

## 📊 TEST EXECUTION PLAN

### **Phase 1: Smoke Tests (15 minutes)**
- Health checks
- Basic greeting
- Simple calculation
- One multi-turn conversation

**Goal:** Verify system is operational

---

### **Phase 2: Core Functionality (30 minutes)**
- All intent detection tests
- All handler tests
- Basic memory tests

**Goal:** Verify core features work

---

### **Phase 3: Advanced Features (30 minutes)**
- Complex calculations
- Multi-turn conversations
- Memory and context tests

**Goal:** Verify advanced capabilities

---

### **Phase 4: Edge Cases (20 minutes)**
- Error handling
- Invalid inputs
- Edge cases

**Goal:** Verify robustness

---

### **Phase 5: Performance (15 minutes)**
- Response times
- Concurrent users
- Database performance

**Goal:** Verify performance meets requirements

---

### **Phase 6: Integration (20 minutes)**
- Full conversation flows
- All components together
- Real-world scenarios

**Goal:** Verify end-to-end functionality

---

## ✅ PASS/FAIL CRITERIA

### **Critical (Must Pass):**
- All health checks pass
- Intent detection > 80% accuracy
- Calculations 100% accurate
- No crashes or errors
- Response time < 5 seconds

### **Important (Should Pass):**
- Memory persists across session
- Multi-turn conversations work
- Error handling is graceful
- User experience is positive

### **Nice to Have:**
- Response time < 2 seconds
- Proactive assistance
- Cache improves performance

---

## 📝 TEST RESULTS TEMPLATE

```markdown
### Test: [Test Name]
**Date:** [Date]
**Tester:** [Name]
**Result:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Details:**
- Input: [What was tested]
- Expected: [Expected result]
- Actual: [Actual result]
- Notes: [Any observations]

**Issues Found:**
- [List any issues]

**Recommendations:**
- [Any improvements]
```

---

## 🎯 SUCCESS METRICS

**System is PRODUCTION READY when:**

1. ✅ 95%+ of tests pass
2. ✅ All critical tests pass
3. ✅ No blocking bugs
4. ✅ Performance meets requirements
5. ✅ User experience is positive
6. ✅ Documentation is complete
7. ✅ Monitoring is in place

---

## 🚀 NEXT STEPS AFTER TESTING

**If tests pass:**
1. Document results
2. Create monitoring dashboard
3. Set up alerts
4. Plan Phase 3 (Artwork Analyzer Agent)
5. Consider beta users

**If tests fail:**
1. Document failures
2. Prioritize fixes
3. Implement fixes
4. Re-test
5. Iterate until passing

---

## 📞 TESTING RESOURCES

**Test Interface:** https://dartmouth-chat.pages.dev  
**API Endpoint:** https://agent-army-worker.dartmouth.workers.dev  
**Documentation:** https://github.com/hutchisonjohn/dartmouth  
**Health Check:** https://agent-army-worker.dartmouth.workers.dev/health

---

**Ready to begin comprehensive testing!** 🧪✨

