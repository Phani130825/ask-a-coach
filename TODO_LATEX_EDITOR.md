# LaTeX Editor Enhancement TODO

## Current Status

- ✅ AI LaTeX generation from OpenAI API is working
- ❌ No syntax highlighting in LaTeX editor
- ❌ No live preview
- ❌ No PDF compilation
- ❌ LaTeX not installed on backend

## Tasks

### 1. Install LaTeX System Libraries

- [ ] Install texlive on Windows system (choco not available, will use alternative)
- [ ] Test pdflatex compilation
- [ ] Verify LaTeX installation
- [ ] Alternative: Use online LaTeX compilation service if system install fails

### 2. Backend Enhancements

- [ ] Add PDF compilation endpoint in resumes.js
- [ ] Test LaTeX to PDF conversion
- [ ] Handle compilation errors

### 3. Frontend Enhancements

- [ ] Install LaTeX editor dependencies (CodeMirror/KaTeX)
- [ ] Replace textarea with CodeMirror editor
- [ ] Add LaTeX syntax highlighting
- [ ] Add live preview pane with KaTeX
- [ ] Add "Compile to PDF" button
- [ ] Update ResumeTailoring.tsx component

### 4. Testing

- [ ] Test LaTeX generation from AI
- [ ] Test syntax highlighting
- [ ] Test live preview
- [ ] Test PDF compilation
- [ ] Test download functionality

## Files to Edit

- a/package.json (add dependencies)
- a/src/components/ResumeTailoring.tsx (enhance editor)
- a/backend/routes/resumes.js (add PDF endpoint)
