# 🧪 Testing Guide - Social Connection Intelligence System

## Prerequisites

- Server running on `http://localhost:3000`
- Kafka listener active
- Your friend's profile created (+15713659116)

---

## Test 1: Send an iMessage (Real-Time Test)

### Step 1: Send iMessage
Have your friend text **+16463458837** with:
```
Hey! I love pizza and hiking on weekends. Anyone want to grab food?
```

### Step 2: Watch the Server Logs
You'll see:
```
💬 New Message Received:
   From: +15713659116
   Text: Hey! I love pizza and hiking on weekends...

🔄 Processing message for insights...
🤖 Calling Empathy Lambda...
✅ Sentiment analysis: { sentiment: 'Happy', vibe_color: 'Green' }
✅ Updated message insights for +15713659116
   Topics: pizza, hiking, weekends, grab, food
   Sentiment: Happy
```

### Step 3: Check Updated Profile
```bash
curl -s "http://localhost:3000/api/profiles/+15713659116" | python3 -m json.tool
```

You should see the `messageInsights` updated with new topics and sentiment!

---

## Test 2: Find Matches (API Test)

### Get Top Matches for Your Friend
```bash
curl -s "http://localhost:3000/api/matches/+15713659116?limit=5&minScore=30" | python3 -m json.tool
```

**Expected Output:**
```json
{
  "success": true,
  "phoneNumber": "+15713659116",
  "count": 2,
  "matches": [
    {
      "phoneNumber": "+11234567890",
      "name": "Alice Johnson",
      "compatibilityScore": 63,
      "sharedTopics": ["pizza", "travel"],
      "reason": "Shared interests: pizza, travel"
    }
  ]
}
```

---

## Test 3: View All Profiles

```bash
curl -s "http://localhost:3000/api/profiles" | python3 -m json.tool
```

This shows all users in the system with their profiles and message insights.

---

## Test 4: Check Listener Status

```bash
curl -s "http://localhost:3000/api/listener/status" | python3 -m json.tool
```

**Expected:**
```json
{
  "listening": true,
  "connected": true,
  "clients": 0
}
```

---

## Test 5: Send a Reply via API

```bash
curl -X POST http://localhost:3000/api/reply \
  -H "Content-Type: application/json" \
  -d '{
    "chatId": "1704617",
    "message": "Hey! Thanks for reaching out. Would love to connect!"
  }'
```

---

## Test 6: Complete Flow Test

### Scenario: Two users with similar interests match

1. **User A sends message:**
   - From: +15713659116
   - Text: "I love pizza and coding"
   - System extracts: topics=[pizza, coding], sentiment=Happy

2. **User B sends message:**
   - From: +11234567890
   - Text: "Looking for pizza and JavaScript buddies"
   - System extracts: topics=[pizza, javascript], sentiment=Happy

3. **Check compatibility:**
```bash
curl -s "http://localhost:3000/api/matches/+15713659116" | python3 -m json.tool
```

4. **Expected Result:**
   - Alice (+11234567890) appears as top match
   - Score increases due to shared topic "pizza"
   - Sentiment match (both Happy) adds 30 points

---

## Test 7: Frontend Test

1. Open browser: `http://localhost:3000`
2. Search for a LinkedIn profile (e.g., "Elon Musk")
3. Click "Open iMessage"
4. Enter your phone number when prompted
5. Profile saved to DynamoDB!

Check it:
```bash
curl -s "http://localhost:3000/api/profiles/+1YOUR_NUMBER" | python3 -m json.tool
```

---

## Monitoring & Debugging

### Watch Server Logs in Real-Time
The server logs show everything:
- Incoming messages from Kafka
- Lambda sentiment analysis results
- DynamoDB updates
- Matching calculations

### Check if Kafka is Connected
Look for:
```
✅ Kafka consumer connected successfully
📥 Subscribed to topic: team.team.08c7dfa9e986432d891385b64f410bba
🚀 Consumer started and listening for messages...
```

### Test Lambda Directly
```bash
curl -X POST https://njnyq00ecb.execute-api.us-east-1.amazonaws.com/default/EmpathyAgent_Logic \
  -H "Content-Type: application/json" \
  -d '{"message": "I love pizza!"}'
```

---

## Expected System Behavior

### When a message arrives:

1. ✅ Kafka receives the message
2. ✅ Lambda analyzes sentiment (~1-2 seconds)
3. ✅ Topics extracted from message text
4. ✅ DynamoDB updated with new insights
5. ✅ Compatibility scores can be recalculated on-demand

### Compatibility Scoring:

- **40 points** - Shared topics (more overlap = higher score)
- **30 points** - Sentiment compatibility (Happy+Happy = 30pts)
- **30 points** - Profile similarity (skills, company)

**Total: 100 points possible**

---

## Common Issues & Fixes

### Issue: "No profile found for +1234567890"
**Fix:** Create the profile first:
```bash
curl -X POST http://localhost:3000/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "profile": {
      "name": "Test User",
      "skills": ["JavaScript"]
    }
  }'
```

### Issue: Kafka not receiving messages
**Fix:** Check listener status and restart if needed:
```bash
curl -X POST http://localhost:3000/api/listener/start
```

### Issue: Lambda timeout
**Fix:** Lambda has 10-second timeout. Check AWS Lambda logs if it fails.

---

## Quick Test Script

Run this to test everything at once:

```bash
# 1. Check server health
echo "=== Health Check ==="
curl -s http://localhost:3000/api/health | python3 -m json.tool

# 2. Check listener status
echo -e "\n=== Listener Status ==="
curl -s http://localhost:3000/api/listener/status | python3 -m json.tool

# 3. Get all profiles
echo -e "\n=== All Profiles ==="
curl -s http://localhost:3000/api/profiles | python3 -m json.tool

# 4. Get matches for your friend
echo -e "\n=== Matches for +15713659116 ==="
curl -s "http://localhost:3000/api/matches/+15713659116?limit=3" | python3 -m json.tool
```

---

## Success Criteria

✅ **Phase 1:** Profile saved to DynamoDB
✅ **Phase 2:** Server shows incoming messages from Kafka
✅ **Phase 3:** Lambda called, sentiment analyzed, topics extracted
✅ **Phase 4:** Matches returned with compatibility scores

**Your system is working if all 4 phases complete successfully!**
