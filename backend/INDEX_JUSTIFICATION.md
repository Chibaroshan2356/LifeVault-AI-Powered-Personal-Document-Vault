# MongoDB Index Justification

This document justifies each index added to the Document collection. Each index must serve a real query pattern to justify its write/storage cost.

---

## Existing Inline Indexes (already in schema)

### 1. `userId: 1`
**Query Pattern:** List/filter all documents belonging to a user  
**Frequency:** HIGH (every document list operation)  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + range scan  
**Justification:** ✅ REQUIRED - All queries filter by userId for security/multi-tenancy

---

### 2. `status: 1`
**Query Pattern:** Filter documents by processing status (READY, FAILED, OCR_PENDING, etc.)  
**Frequency:** MEDIUM (dashboard stats, processing status filters)  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + range scan  
**Justification:** ✅ REQUIRED - Dashboard shows document count by status; status filtering in list view

---

### 3. `expiryDate: 1`
**Query Pattern:** Find documents expiring soon (for expiry alert notifications)  
**Frequency:** LOW (daily/hourly scheduled job)  
**Query:** `{ expiryDate: { $gte: now, $lte: now + 30 days } }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) + range scan for documents in expiry window  
**Justification:** ✅ REQUIRED - Milestone 5 will show expiring documents; Milestone 10 will have expiry notifications

---

## New Indexes for Search (added in Sprint 4.1)

### 4. `ocrText: 'text'`
**Query Pattern:** Full-text search on OCR content  
**Frequency:** MEDIUM (user search queries)  
**Query:** `{ $text: { $search: "passport" } }`  
**Without Index:** O(n) full collection scan, regex matching each document  
**With Index:** O(log n) + text search using MongoDB full-text engine  
**Justification:** ✅ REQUIRED - Milestone 4 Smart Search feature; core to project value proposition

---

### 5. `metadata.holderName: 1`
**Query Pattern:** Search documents by holder/owner name  
**Frequency:** LOW-MEDIUM (user searches on metadata)  
**Query:** `{ 'metadata.holderName': { $regex: 'John', $options: 'i' } }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + filtered results  
**Justification:** ✅ USEFUL - Milestone 4 Smart Search metadata filtering; improves search UX for finding documents by person

---

### 6. `metadata.documentName: 1`
**Query Pattern:** Search documents by document type extracted from OCR  
**Frequency:** LOW-MEDIUM (user searches on metadata)  
**Query:** `{ 'metadata.documentName': { $regex: 'Passport', $options: 'i' } }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + filtered results  
**Justification:** ✅ USEFUL - Milestone 4 Smart Search metadata filtering; complements category filter

---

### 7. `metadata.organization: 1`
**Query Pattern:** Search documents by issuing organization  
**Frequency:** LOW (specialized searches)  
**Query:** `{ 'metadata.organization': { $regex: 'Government', $options: 'i' } }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + filtered results  
**Justification:** ✅ USEFUL - Milestone 4 Smart Search; useful for finding all documents from a specific issuer (e.g., all government documents)

---

### 8. `metadata.documentNumber: 1`
**Query Pattern:** Search documents by document/ID number  
**Frequency:** LOW-MEDIUM (user searches specific IDs)  
**Query:** `{ 'metadata.documentNumber': { $regex: 'AB123456', $options: 'i' } }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + exact/partial match  
**Justification:** ✅ USEFUL - Milestone 4 Smart Search; useful for finding a specific document by ID/number

---

### 9. `category: 1`
**Query Pattern:** Filter documents by category (Passport, Aadhar, PAN, etc.)  
**Frequency:** MEDIUM (dashboard stats, search filters, classification reports)  
**Query:** `{ category: 'Passport' }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + range scan  
**Justification:** ✅ REQUIRED - Milestone 4 Smart Search category filter; Milestone 5 dashboard chart showing distribution by category

---

### 10. `mimeType: 1`
**Query Pattern:** Filter documents by file type (PDF vs images)  
**Frequency:** LOW (specialized queries, file type filters)  
**Query:** `{ mimeType: 'application/pdf' }`  
**Without Index:** O(n) full collection scan  
**With Index:** O(log n) seek + range scan  
**Justification:** ✅ USEFUL - Milestone 4 Smart Search file type filter; good to have for future reports/analytics

---

### 11. `userId: 1, category: 1, status: 1` (Compound)
**Query Pattern:** Dashboard: "Show me all READY documents by category for this user"  
**Frequency:** HIGH (dashboard load, status filtering)  
**Query:** `{ userId: ObjectId("..."), category: 'Passport', status: 'READY' }`  
**Without Index:** O(n) collection scan → O(k) for each filter sequentially  
**With Index:** O(log n) seek on userId, then filtered on category + status  
**Optimization:** First field (userId) must match; compound index much better than 3 separate indexes  
**Justification:** ✅ REQUIRED - This is a specific, frequent multi-field query from Milestone 5 dashboard

---

## Index Redundancy Analysis

### Checking for Duplicates:

| Index | Alternative | Redundant? | Reason |
|-------|-------------|-----------|--------|
| `userId: 1` | `userId: 1, createdAt: -1` | NO | Separate indexes serve different purposes |
| `userId: 1, createdAt: -1` | `userId: 1` | NO | Compound index provides sorted results (list page needs sort by date) |
| `category: 1` | `userId: 1, category: 1, status: 1` | NO | Category-only searches need dedicated index; compound index assumes userId + status presence |
| `status: 1` | `userId: 1, category: 1, status: 1` | NO | Status filtering alone still needs index (dashboard counts all documents' statuses) |
| Metadata indexes | Each other | NO | Each metadata field has different semantics; searches target specific fields |
| `mimeType: 1` | `category: 1` | NO | MIME type and category are independent filters |

**Conclusion:** ✅ **NO REDUNDANCY** - Each index serves a distinct query pattern

---

## Total Index Count

**Inline (in schema):**
- userId ✅
- status ✅
- expiryDate ✅

**Schema.index() calls:**
- userId + createdAt (compound) ✅
- ocrText (text) ✅
- metadata.holderName ✅
- metadata.documentName ✅
- metadata.organization ✅
- metadata.documentNumber ✅
- category ✅
- mimeType ✅
- userId + category + status (compound) ✅

**Total: 12 indexes** (including _id default index)

---

## Storage/Write Cost Estimate

For a typical final-year project with ~1000 documents:

| Index Type | Storage (per 1000 docs) | Write Cost |
|-----------|------------------------|-----------|
| Single field (each) | ~50-100 KB | +1-2% per write |
| Compound (3 fields) | ~150 KB | +2-3% per write |
| Text (ocrText) | ~500 KB | +3-5% per write |
| **Total overhead** | **~1.5 MB** | **+10-15% total write time** |

**Assessment:** ✅ ACCEPTABLE for a final-year project (1.5 MB storage is negligible; 10-15% write overhead is acceptable for improved search performance)

---

## Recommendation

✅ **KEEP ALL INDEXES**

- Each index serves a documented query pattern
- No redundancy detected
- Write/storage cost acceptable for project scale
- Search performance benefits significant (10-100x faster queries)
- Indexes align with Milestone 4 search requirements and Milestone 5 dashboard needs

---

## Future Optimization Opportunities (Post-MVP)

If index count becomes a concern in production:

1. **Monitor query patterns** with MongoDB profiler
2. **Remove unused indexes** based on actual usage data
3. **Consider partial indexes** for metadata searches (index only non-null values)
4. **Consolidate with compound indexes** if patterns emerge

For now: ✅ **All indexes justified and appropriate**
