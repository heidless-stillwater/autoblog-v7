# Perplexity API Testing Guide - Minimal Token Usage

## Overview

This guide explains how to test your Perplexity API connection while minimizing token consumption and costs.

## Quick Test (Recommended)

### Using the Settings Modal

1. **Open Settings**
   - Click the Settings icon in the sidebar
   - Or press the settings shortcut

2. **Enter API Key**
   - Paste your Perplexity API key in the field

3. **Click "Test Connection"**
   - Uses **~10-20 tokens** (minimal cost)
   - Takes 1-2 seconds
   - Shows real-time results

**What the test does:**
- Uses smallest model: `llama-3.1-sonar-small-128k-online`
- Sends minimal prompt: "Say 'OK'" (2 words)
- Limits response to 10 tokens max
- Disables search features
- Returns token count and response time

**Cost:** ~$0.00001 per test (essentially free)

---

## Token Usage Breakdown

### Connection Test
- **Tokens Used:** ~10-20 tokens
- **Cost:** ~$0.00001 (1/100th of a cent)
- **Purpose:** Verify API key is valid

### Full Article Generation
- **Research Phase:** ~1,500-2,000 tokens
- **Article Generation:** ~2,500-3,000 tokens
- **Total:** ~6,000-7,000 tokens per article
- **Cost:** ~$0.006-0.007 per article

### Research Caching Savings
- **First Generation:** 6,000-7,000 tokens
- **Using Cached Research:** 2,500-3,000 tokens (saves ~60%)
- **Savings:** ~$0.003-0.004 per cached article

---

## Best Practices for Minimizing Costs

### 1. Always Use Research Caching

✅ **DO:**
- Reuse cached research when available
- Generate multiple articles from same research
- Check research cache before generating

❌ **DON'T:**
- Generate new research for same topic unnecessarily
- Skip the research selection modal

**Savings:** Up to 60% reduction in token usage

### 2. Test Connection Before Bulk Operations

✅ **DO:**
- Test connection once before starting work
- Verify API key after changes
- Use the built-in test button

❌ **DON'T:**
- Generate full articles to test connection
- Make multiple test generations

**Savings:** Prevents wasted tokens on failed generations

### 3. Use Specific Topics

✅ **DO:**
- Use clear, specific topics
- Avoid overly broad subjects
- Provide context in topic name

❌ **DON'T:**
- Use vague topics requiring extensive research
- Generate articles on extremely broad subjects

**Savings:** More focused research = fewer tokens

### 4. Leverage Version Management

✅ **DO:**
- Review versions before regenerating
- Use existing versions when possible
- Only regenerate when necessary

❌ **DON'T:**
- Regenerate articles multiple times
- Create unnecessary versions

**Savings:** Prevents duplicate generation costs

---

## Cost Estimation

### Per Article (Without Caching)
```
Research:        1,500-2,000 tokens
Article:         2,500-3,000 tokens
Total:           6,000-7,000 tokens
Cost:            ~$0.006-0.007
```

### Per Article (With Cached Research)
```
Research:        0 tokens (cached)
Article:         2,500-3,000 tokens
Total:           2,500-3,000 tokens
Cost:            ~$0.0025-0.003
Savings:         ~60%
```

### 100 Articles Example

**Without Caching:**
- Tokens: 600,000-700,000
- Cost: ~$0.60-0.70

**With Caching (50% reuse):**
- Tokens: 425,000-500,000
- Cost: ~$0.425-0.50
- **Savings: ~$0.175-0.20**

---

## Testing Workflow

### Initial Setup
1. Add API key in Settings
2. Click "Test Connection"
3. Verify success message
4. Note token usage (~10-20)

### Before Bulk Generation
1. Test connection
2. Plan topics to maximize research reuse
3. Generate first article
4. Reuse research for related topics

### Monitoring Usage
1. Check test results for token counts
2. Review research cache regularly
3. Track which research is most reused
4. Delete unused research if needed

---

## Troubleshooting

### Connection Test Fails

**Common Issues:**
1. **Invalid API Key**
   - Error: "Invalid API key"
   - Solution: Check key format (starts with `pplx-`)

2. **Network Error**
   - Error: "Failed to fetch"
   - Solution: Check internet connection

3. **Rate Limit**
   - Error: "Rate limit exceeded"
   - Solution: Wait a few minutes, try again

### High Token Usage

**If seeing higher than expected tokens:**
1. Check if using correct model
2. Verify max_tokens setting
3. Review prompt complexity
4. Ensure research caching is working

---

## API Key Safety

### Best Practices
✅ Never share your API key
✅ Store securely in Settings
✅ Test in private/incognito mode
✅ Regenerate if compromised

### Key Format
```
pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Summary

**Minimal Testing:**
- Use built-in "Test Connection" button
- Costs ~$0.00001 per test
- Uses only 10-20 tokens
- Provides instant feedback

**Cost Optimization:**
- Enable research caching (60% savings)
- Test connection before bulk work
- Use specific topics
- Leverage version management

**Expected Costs:**
- Connection test: ~$0.00001
- Single article: ~$0.003-0.007
- 100 articles (with caching): ~$0.40-0.50

The research caching system is designed to minimize your API costs while maintaining high-quality content generation. Always use the test button before starting work to ensure your API key is valid without wasting tokens on full generations.
