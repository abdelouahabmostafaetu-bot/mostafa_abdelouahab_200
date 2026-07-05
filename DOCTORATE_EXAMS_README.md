# 🎓 Doctorate Exam Archive — Algeria

A complete, production-ready section for publishing **past Algerian mathematics
doctorate (PhD) entrance exam problems** with sources and full solutions.

In Algeria, the doctorate entrance competition includes **two exams every
year**:

- **General Exam** (épreuve générale) — general mathematics
- **Specialist Exam** (épreuve de spécialité) — the chosen specialty (Analysis, Algebra, …)

This feature archives problems from both exams, year by year, to help every
candidate prepare.

---

## ✨ What You Get

### For visitors (public, read-only)
- 📚 Beautiful archive hub at `/doctorate-exams`
- 🗂️ Problems **grouped by year**, newest first
- 🔎 Instant client-side **search** + filters: exam type, year, specialty
- 📊 Stats bar: total problems, years covered, solutions available, general/specialist split
- 🧠 Problem detail pages with **KaTeX** rendering for LaTeX math
- 💡 **Solution hidden behind a reveal button** — try the problem first!
- 📖 Source of every problem clearly displayed
- 🔗 Related problems from the same exam session
- ⚡ Fast: server-rendered pages, indexed MongoDB queries, lean projections

### For you (admin only)
- ➕ Add problems at `/admin/doctorate-exams/add`
- ✏️ Edit problems at `/admin/doctorate-exams/edit`
- 🗑️ Remove problems at `/admin/doctorate-exams/remove`
- 📝 Rich markdown editor with LaTeX for statement **and** solution
- 🔐 All writes protected by Clerk auth + `ADMIN_EMAIL` + rate limiting
- 📋 Draft mode (`published` flag) to prepare problems before publishing

---

## 🗂️ File Structure

```
src/
├── types/doctorate-problem.ts              # Shared types + labels
├── lib/
│   ├── models/doctorate-problem.ts         # Mongoose schema + indexes
│   └── doctorate-problems.ts               # Mappers + slug builder
├── app/
│   ├── api/doctorate-problems/
│   │   ├── route.ts                        # GET (list) / POST (admin)
│   │   └── [slug]/route.ts                 # GET / PUT / DELETE (admin)
│   ├── doctorate-exams/
│   │   ├── page.tsx                        # Public archive hub
│   │   └── [slug]/page.tsx                 # Problem detail + solution
│   └── admin/doctorate-exams/
│       ├── page.tsx                        # Admin hub (Add/Edit/Remove)
│       ├── add/page.tsx
│       ├── edit/page.tsx                   # List → pick → form (?slug=)
│       └── remove/page.tsx
└── components/doctorate/
    ├── DoctorateExamsExplorer.tsx          # Filters, stats, year groups
    ├── SolutionReveal.tsx                  # Spoiler-protected solution
    ├── DoctorateProblemForm.tsx            # Add/Edit form (markdown + LaTeX)
    └── DoctorateAdminList.tsx              # Admin list (edit/delete)
```

---

## 📝 Data Model

```javascript
{
  title: String,          // required, 3–250 chars
  slug: String,           // unique: "2024-general-<title>"
  examType: String,       // 'general' | 'specialist'
  specialty: String,      // e.g. "Functional Analysis" (default "Mathematics")
  year: Number,           // 1990–2100
  university: String,     // e.g. "University Center of Mila"
  source: String,         // where the problem comes from
  problemNumber: Number,  // optional, order within the exam
  statement: String,      // Markdown + LaTeX (required)
  solution: String,       // Markdown + LaTeX ('' → "Solution coming soon")
  tags: [String],         // up to 12
  difficulty: String,     // easy | medium | hard | very-hard
  published: Boolean,     // draft support
  createdAt / updatedAt   // automatic
}
```

**Indexes:** `{published, year, problemNumber}`, `{examType, year, published}`,
`{specialty, published}`, `{tags}`, full-text on title/statement/specialty/university.

---

## 🚀 Usage

1. Sign in with your admin account (the `ADMIN_EMAIL` one).
2. Go to `/admin/doctorate-exams` → **Add Problem**.
3. Fill in the exam type, year, specialty, university, and source.
4. Write the statement and the full solution in Markdown + LaTeX:
   - Inline math: `$e^{i\pi} + 1 = 0$`
   - Display math: `$$\int_a^b f(x)\,dx$$`
5. Publish — it appears instantly at `/doctorate-exams`, grouped by year.

> Visitors can browse and read everything, but only the admin can add,
> edit, or delete problems. All write APIs are Clerk-authenticated,
> admin-checked, and rate-limited.

---

## 🔐 Security

- ✅ `requireAdmin()` on every admin page (server-side redirect)
- ✅ `requireAdminApi()` on POST / PUT / DELETE, and on `?admin=1` reads
- ✅ Per-IP rate limiting on all write routes
- ✅ Input validation (types, enum whitelists, year bounds, tag limits)
- ✅ Drafts are never exposed to non-admin visitors

*Built to match the site’s existing design system and architecture patterns.* ✨
