# Project Structure & Architecture Patterns

## 1. Admin System Setup

### Authentication & Authorization
**Location**: [src/lib/admin.ts](src/lib/admin.ts)
- Uses **Clerk** authentication (`@clerk/nextjs/server`)
- Admin access controlled via `ADMIN_EMAIL` environment variable
- Three key functions:
  - `getCurrentAdminUser()` - Returns admin user or null (safe for checks)
  - `requireAdmin()` - Redirects to `/` if not admin (server components/pages)
  - `requireAdminApi()` - Returns 403 response if not admin (API routes)

**Pattern Example**:
```typescript
// Server Component Pattern
export default async function AdminPage() {
  await requireAdmin(); // Throws redirect if unauthorized
  return <AdminClient />;
}

// API Route Pattern
export async function POST(request: NextRequest) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden; // Returns 403 NextResponse
  // ... proceed with admin operation
}
```

### Admin Folder Structure
```
src/app/admin/
├── problems/
│   ├── page.tsx (list)
│   ├── new/
│   ├── edit/
│   └── loading.tsx
├── problems-with-coffee/
│   ├── page.tsx (hub page with 3 action cards)
│   ├── add/
│   ├── edit/
│   ├── remove/
│   └── loading.tsx
```

**Hub Page Pattern** ([src/app/admin/problems-with-coffee/page.tsx](src/app/admin/problems-with-coffee/page.tsx)):
- Grid of 3 action cards (Add, Edit, Remove)
- Each card is a Link with hover effects
- Consistent styling using CSS custom properties

## 2. Models & MongoDB Schema

### Schema Pattern
**Location**: [src/lib/models/](src/lib/models/)

All models follow this pattern:

```typescript
import mongoose, { type Model } from 'mongoose';

export type DocumentType = {
  // Define all fields with proper types
  field: type;
};

const schema = new mongoose.Schema<DocumentType>(
  {
    // Schema definition with validation
    field: { type: Type, required: true, ... }
  },
  { timestamps: true } // Add createdAt/updatedAt automatically
);

// Add indexes for performance
schema.index({ publishedField: 1, createdAt: -1 });
schema.index({ searchFields: 'text' }); // Full-text search

// Transform to JSON - rename _id to id, remove __v
schema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret: Record<string, unknown>) => {
    ret.id = String(ret._id ?? '');
    delete ret._id;
    return ret;
  },
});

const Model = 
  (mongoose.models.ModelName as Model<DocumentType> | undefined) ??
  mongoose.model<DocumentType>('ModelName', schema);

export default Model;
```

### Existing Models

**CoffeeProblem** ([src/lib/models/coffee-problem.ts](src/lib/models/coffee-problem.ts)):
```typescript
export type CoffeeProblemDocument = {
  title: string;
  slug: string; // unique
  problemNumber?: number;
  shortDescription: string;
  level: CoffeeProblemLevel; // 'beginner' | 'intermediate' | 'advanced'
  difficulty: string;
  estimatedTime: string; // "10 min"
  tags: string[];
  problemStatement: string;
  fullProblemContent: string;
  hint1: string;
  hint2: string;
  keyIdea: string;
  solution: string;
  solutions: string[];
  solutionContent: string;
  lesson: string;
  coverImage: string;
  published: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};
```
- Indexes on: published, createdAt, problemNumber, level, tags, full-text search
- Text search fields: title, shortDescription, tags, problemStatement

**BlogPost** ([src/lib/models/blog-post.ts](src/lib/models/blog-post.ts)):
```typescript
export type BlogPostDocument = {
  title: string;
  slug: string; // unique
  excerpt: string;
  category: string; // 'Mathematics'
  tags: string[];
  coverImageUrl: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
};
```

**Book** ([src/lib/models/book.ts](src/lib/models/book.ts)):
```typescript
export type BookDocument = {
  title: string;
  slug: string;
  author?: string;
  description?: string;
  tags: string[];
  category?: string;
  pdfUrl: string;
  fileUrl: string;
  filePathname: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  coverUrl?: string;
  coverPathname?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### MongoDB Connection
**Location**: [src/lib/mongodb.ts](src/lib/mongodb.ts)
- Handles DNS server configuration for reliability
- Implements connection caching (singleton pattern)
- Connection pooling with mongoose
- Error handling for DNS/connection issues
- Environment variable: `MONGODB_URI`

## 3. Type System

### CoffeeProblem Types
**Location**: [src/types/coffee-problem.ts](src/types/coffee-problem.ts)

```typescript
export type CoffeeProblemLevel = 'beginner' | 'intermediate' | 'advanced';

export type CoffeeProblemSummary = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  difficulty: string;
  estimatedTime: string;
  tags: string[];
  coverImage: string;
  published?: boolean;
  isPublished?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CoffeeProblem = CoffeeProblemSummary & {
  // Full content fields...
  fullProblemContent: string;
  solutionContent: string;
  problemStatement: string;
  hint1: string;
  hint2: string;
  keyIdea: string;
  solution: string;
  solutions: string[];
  lesson: string;
};

export type CoffeeProblemsResponse = {
  problems: CoffeeProblemSummary[];
  pagination: {
    page: number;
    limit: number;
    totalProblems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};
```

## 4. API Routes Structure

### Route Pattern
**Location**: [src/app/api/](src/app/api/)

All API routes follow this pattern:

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin';
import { checkRateLimit, getUnknownFields, isPlainObject, jsonError } from '@/lib/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Always fresh, no caching

export async function GET(request: NextRequest) {
  // Extract query params with bounds checking
  const page = getBoundedPositiveInt(request.nextUrl.searchParams.get('page'), 1, 10000);
  const limit = getBoundedPositiveInt(request.nextUrl.searchParams.get('limit'), 50, 50);
  
  // Build query based on admin mode
  const adminMode = request.nextUrl.searchParams.get('admin') === '1';
  if (adminMode) {
    const forbidden = await requireAdminApi();
    if (forbidden) return forbidden;
  }
  
  try {
    await connectToDatabase();
    
    // Build database query
    const query: Record<string, unknown> = adminMode ? {} : { published: true };
    
    // Execute with pagination
    const [docs, total] = await Promise.all([
      Model.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Model.countDocuments(query),
    ]);
    
    return NextResponse.json({
      problems: docs.map(mapFunction),
      pagination: { page, limit, totalProblems: total, totalPages, hasNextPage, hasPreviousPage },
    }, { status: 200 });
  } catch (error) {
    console.error('GET /api/route failed:', error);
    const { message, status } = getPublicErrorDetails(error, 'Fallback message');
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const limited = checkRateLimit(request, 'scope-name', 20);
  if (limited) return limited;
  
  // Admin check
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;
  
  try {
    // Parse and validate body
    const body = (await request.json().catch(() => null)) as unknown;
    if (!isPlainObject(body)) {
      return jsonError('Request body must be JSON object.', 400);
    }
    
    // Check for unknown fields
    const unknownFields = getUnknownFields(body, ['field1', 'field2']);
    if (unknownFields.length > 0) {
      return jsonError(`Unknown field: ${unknownFields[0]}.`, 400);
    }
    
    // Process and return
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('POST /api/route failed:', error);
    return NextResponse.json({ error: 'Failed to create.' }, { status: 500 });
  }
}
```

### Problems API
**Location**: [src/app/api/problems/route.ts](src/app/api/problems/route.ts)
- Separate model from "Problems with Coffee"
- Supports search via regex on: title, slug, shortDescription, tags
- Supports pagination: default 50, max 50 items per page
- Query parameters:
  - `admin=1` - Show all (requires admin)
  - `page` - Page number (1-indexed)
  - `limit` - Items per page
  - `search` - Text search

### Coffee Problems API
**Location**: [src/app/api/problems-with-coffee/route.ts](src/app/api/problems-with-coffee/route.ts)
- Supports level filtering: `level=beginner|intermediate|advanced`
- Supports tag filtering: `tag=value`
- Supports search, pagination
- Image upload endpoint: `/api/problems-with-coffee/upload-image`
  - Uses Vercel Blob storage
  - Max 4MB, supports PNG/JPG/JPEG/WEBP
  - Creates safe blob path: `problems-with-coffee/images/{timestamp}-{randomId}.{ext}`

## 5. Page Styling & Components

### Global CSS Custom Properties
**Location**: [src/styles/globals.css](src/styles/globals.css)

**Color Palette**:
```css
--bg-main: #202124;
--bg-card: #27272B;
--text-main: #F4F4F5;
--text-muted: #B8B8BC;
--accent-orange: #F36B16;
--border: #333338;

/* Derived variables */
--color-bg: var(--bg-main);
--color-text: var(--text-main);
--color-text-secondary: var(--text-muted);
--color-text-tertiary: #8d8d94;
--color-accent: var(--accent-orange);
--color-accent-hover: #ff7a2b;
--color-border: var(--border);
--color-bg-muted: #242529;
--color-hover: #2b2b30;
```

### Input/Form Patterns
Used consistently across all forms:
```typescript
const inputClasses = `
  w-full rounded-md 
  border border-[var(--color-border)] 
  bg-[var(--color-bg)] 
  px-3 py-2.5 
  text-sm text-[var(--color-text)] 
  outline-none transition-all duration-150 
  placeholder:text-[var(--color-text-tertiary)] 
  focus:border-[var(--color-accent)] 
  focus:ring-2 focus:ring-[var(--color-accent)]/15
`;
```

### Tailwind Config
**Location**: [tailwind.config.ts](tailwind.config.ts)

**Color Tokens**:
```typescript
colors: {
  primary: { 50: '#F4F4F5', ..., 900: '#202124' },
  accent: { 50: '#fff0e7', ..., 900: '#702e08' }, // Orange
  surface: { 50: '#f8fafc', 100: '#f1f5f9', ... },
},
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
  heading: ['Playfair Display', 'Georgia', 'serif'],
},
fontSize: {
  '2xs': ['0.6875rem', { lineHeight: '1rem' }],
},
borderRadius: {
  'xl': '0.75rem',
  '2xl': '1rem',
},
```

### Admin Component Patterns

**FieldLabel Component**:
```typescript
function FieldLabel({
  children,
  help,
}: {
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div>
      <span className="block text-sm font-semibold text-[var(--color-text)]">
        {children}
      </span>
      {help ? (
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-tertiary)]">
          {help}
        </p>
      ) : null}
    </div>
  );
}
```

**Markdown Editor Component**
**Location**: [src/components/admin/AdminMarkdownEditor.tsx](src/components/admin/AdminMarkdownEditor.tsx)
- Toolbar with: Bold, Italic, Heading, Lists, Code, Links, Images, Quote, HR
- Split-view: Write/Preview toggle
- Image upload support
- Toast notifications for feedback
- History with Undo/Redo
- Props:
  ```typescript
  {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    previewClassName?: string;
    imageAltText?: string;
    uploadEndpoint?: string;
  }
  ```

### Admin Page Layout Pattern
```typescript
<section className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
  <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
    {/* Header */}
    <div className="mb-8 border-b border-[var(--color-border)] pb-6">
      <h1 className="text-3xl font-semibold text-[var(--color-text)]">
        Admin Title
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Description
      </p>
    </div>
    
    {/* Content */}
    <div className="grid gap-6 md:grid-cols-3">
      {/* Cards/Items */}
    </div>
  </div>
</section>
```

## 6. Admin Client Components

### CoffeeProblemFormClient
**Location**: [src/components/problems/CoffeeProblemFormClient.tsx](src/components/problems/CoffeeProblemFormClient.tsx)

**Form State**:
```typescript
type ProblemFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  level: CoffeeProblemLevel;
  difficulty: string;
  estimatedTime: string;
  tags: string; // CSV
  coverImage: string;
  fullProblemContent: string;
  solutionContent: string;
  isPublished: boolean;
};
```

**Key Features**:
- Auto-slug generation from title (only if slug not touched)
- Split editor for problem/solution content (Write/Preview modes)
- Rich image upload with Vercel Blob
- Tag input (comma-separated)
- Toast notifications
- History tracking (Undo/Redo)
- Preview rendering via `/api/blog-preview`
- Form validation on submit

**Pattern for Data Fetching in Forms**:
```typescript
useEffect(() => {
  if (!isEditing) return;
  
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/problems-with-coffee/${slug}?admin=1`, {
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as Data | null;
      
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to load.');
      }
      
      setForm(toForm(payload));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load.');
    } finally {
      setIsLoading(false);
    }
  };
  
  void loadData();
}, [isEditing, slug]);
```

### CoffeeProblemsAdminClient (List/Delete)
**Location**: [src/components/problems/CoffeeProblemsAdminClient.tsx](src/components/problems/CoffeeProblemsAdminClient.tsx)

**Pattern**:
- Loads all problems via `/api/problems-with-coffee?admin=1&limit=50`
- Pagination handled via loop until `hasNextPage = false`
- Search input with debounce
- Delete confirmation dialog
- Status/error messages
- Displays: Title, Level, Tags, CreatedAt, Actions (Edit/Delete)

## 7. Security & Validation Patterns

### Security Module
**Location**: [src/lib/security.ts](src/lib/security.ts)

**Key Functions**:

```typescript
// Rate limiting - per IP per scope per minute
export function checkRateLimit(
  request: NextRequest,
  scope: string,
  maxRequests: number,
): NextResponse | null

// Extract client IP (handles proxies)
export function getClientIp(request: NextRequest): string

// Safe object field checking
export function getUnknownFields(
  body: unknown,
  allowedFields: readonly string[]
): string[] // Returns unknown field names

// JSON error response helper
export function jsonError(message: string, status: number): NextResponse

// Type guard for plain objects
export function isPlainObject(value: unknown): value is Record<string, unknown>

// Create safe Vercel Blob path
export function createSafeBlobPath(folder: string, mimeType: string): string
```

**Dangerous Content Patterns**:
- Detects: `javascript:`, `vbscript:`, `data:`, `file:` protocols
- Sanitizes HTML tags and attributes
- Full text search indexing

## 8. Helper Libraries

### Coffee Problems Utilities
**Location**: [src/lib/coffee-problems.ts](src/lib/coffee-problems.ts)

```typescript
export function normalizeCoffeeSlug(title: string, value: string): string
  // Removes accents, lowercases, replaces spaces with hyphens, max 96 chars

export function normalizeCoffeeTags(value: unknown): string[]
  // Splits on comma or array, deduplicates, max 12 tags

export function normalizeCoffeeLevel(value: unknown): CoffeeProblemLevel
  // Validates and defaults to 'beginner'

export function mapCoffeeProblemSummary(payload, includeAdminFields?): CoffeeProblemSummary

export function mapCoffeeProblem(payload): CoffeeProblem
```

### Problems Utilities
**Location**: [src/lib/problems.ts](src/lib/problems.ts)

Similar pattern for regular problems with:
```typescript
export function normalizeProblemDifficulty(value: unknown): CoffeeProblemLevel
export function normalizeProblemSlug(title: string, slug: string): string
export function normalizeProblemTags(value: unknown): string[]
export function buildPublishedProblemQuery()
  // Returns { $or: [{ isPublished: true }, { published: true }] }
export function findProblemByIdOrSlug(id: string)
  // Returns query object - checks if valid ObjectId first
export function mapProblemSummary(payload, includeAdminFields?)
export function mapProblem(payload)
```

### Utils
**Location**: [src/lib/utils.ts](src/lib/utils.ts)

```typescript
export function formatDate(dateString: string): string
  // "January 1, 2024" format

export function calculateReadingTime(content: string): string
  // "5 min read" based on 200 words/minute

export function slugify(text: string): string
  // Simple slug: lowercase, remove special chars, replace spaces with hyphens
```

## 9. Deployment & Environment

### Environment Variables Required
```bash
MONGODB_URI=mongodb+srv://...
ADMIN_EMAIL=admin@example.com
CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

### Dependencies (Key)
```json
{
  "next": "^16.2.5",
  "react": "^19.2.5",
  "mongoose": "^9.4.1",
  "@clerk/nextjs": "^7.3.0",
  "@vercel/blob": "^2.3.3",
  "lucide-react": "^0.460.0",
  "tailwindcss": "^3.x",
  "@next/mdx": "^16.2.5"
}
```

## 10. Consistent Patterns Summary

### Always Use:
1. **CSS Custom Properties** for colors (never hardcode hex)
2. **`cache: 'no-store'`** for admin API calls
3. **Type discrimination** - Different types for Summary vs Full entities
4. **Slug generation** - Same normalization function
5. **Admin-mode parameter** - `admin=1` query param for API
6. **Pagination response** - Always include full pagination metadata
7. **Error handling** - Distinguish public vs internal error messages
8. **Rate limiting** - Check before processing in POST routes
9. **Lean queries** - Use `.lean()` for read-only operations (performance)
10. **Toast notifications** - For user feedback in admin interfaces

