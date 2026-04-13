# Abdelouahab Mostafa Website

This repository contains the personal academic website for Abdelouahab Mostafa, built with Next.js.

## Project Structure

- `src/app`
  Next.js routes, layouts, and API endpoints.

- `src/features/blog`
  Blog-specific UI components and MDX/content helpers.

- `src/features/home`
  Homepage sections.

- `src/features/layout`
  Shared site chrome such as the header and footer.

- `src/features/library`
  Library UI, types, database helpers, and models.

- `src/content/blog`
  Blog posts written in MDX.

- `public/images`
  Static image assets used by the website.

- `public/tools/math-search`
  Embedded search application and its Python AI backend.

- `scripts/dev`
  Local development scripts.

- `scripts/content`
  Content-generation utilities.

- `scripts/maintenance`
  Repository and maintenance scripts.

## Common Commands

- `npm run dev`
  Starts the Next.js site and the local search backend together.

- `npm run dev:site`
  Starts only the Next.js site.

- `npm run dev:search`
  Starts only the Python backend for the math search tool.

- `npm run build`
  Creates a production build.

## Notes

- The blog currently exposes a single published post through the blog content loader.
- The library feature depends on `MONGODB_URI` being configured.
