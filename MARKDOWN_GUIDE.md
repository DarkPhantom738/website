# Markdown Syntax Guide

This is standard Markdown syntax - the same used by Medium, GitHub, Reddit, and most blogging platforms.

## Headers

\`\`\`
# H1 Header
## H2 Header
### H3 Header
\`\`\`

## Text Formatting

\`\`\`
**bold text**
*italic text*
***bold and italic***
\`\`\`

## Links

\`\`\`
[Link text](https://example.com)
\`\`\`

## Images

\`\`\`
![Alt text](image-url.jpg)
\`\`\`

For placeholder images:
\`\`\`
![Description](/placeholder.svg?height=400&width=800&query=your description)
\`\`\`

## Code

Inline code: \`code here\`

Code blocks:
\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

Supported languages: python, javascript, typescript, java, cpp, html, css, bash, sql, and more.

## Lists

Unordered:
\`\`\`
- Item 1
- Item 2
- Item 3
\`\`\`

Ordered:
\`\`\`
1. First item
2. Second item
3. Third item
\`\`\`

## Blockquotes

\`\`\`
> This is a quote
\`\`\`

## Tables

\`\`\`
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
\`\`\`

## Horizontal Rule

\`\`\`
---
\`\`\`

## Complete Example

See `data/projects.ts` for a complete example with all features!
