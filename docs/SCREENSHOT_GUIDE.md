# 📸 How to Capture the Perfect v1.6.0 Screenshot

This guide explains how to take a professional screenshot for GitHub that showcases PrismNote's best features.

## Setup (2 minutes)

### 1. Start PrismNote
```bash
prismnote
# Opens http://localhost:8000 in your browser
```

### 2. Prepare Sample Data
Create a quick sample notebook with these elements:

**File:** `demo.ipynb` or create in-app

### 3. Set Up the Scene

Open PrismNote and arrange your screen for maximum impact:

## What to Include in the Screenshot

### Layout (Left to Right)

#### **Left Panel: File Explorer**
- ✓ Show 3-5 notebook files
- ✓ Include a folder (shows hierarchy)
- ✓ Use a notebook icon next to each file
- Screenshot width: ~200px

#### **Center: Notebook with Mixed Cells**

**Python Cell (Top):**
```python
import pandas as pd
import numpy as np

# Load sample data
df = pd.read_csv("sales_data.csv")
print(f"Loaded {len(df)} records")
```
- Show syntax highlighting (blue keywords, orange functions)
- Show the green "✓ Executed successfully" badge
- Include output below

**SQL Cell (Middle):**
```sql
SELECT region, COUNT(*) as orders, 
       SUM(amount) as revenue
FROM sales
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY region
ORDER BY revenue DESC
```
- Show syntax highlighting (SQL keywords in blue)
- Show connection picker dropdown (e.g., "Snowflake: prod_db")
- Show query results table with:
  - Column headers (region, orders, revenue)
  - Sample data (3-5 rows)
  - Export buttons (CSV, JSON)
  - Pagination indicator

**Data Visualization (Optional):**
- Show a simple chart output below SQL results
- Bar chart or line chart (matplotlib/plotly render)

#### **Right Panel: AI Agent Chat**

Show the Chainlit-style AI panel with:

**User message:**
```
Why did sales spike in Q3?
```

**AI response (partial):**
```
Based on your data, Q3 sales increased 
45% due to:

1. Regional expansion in [region]
2. Campaign launch in [category]
3. Seasonal demand up 20%

📊 Top insights:
• Best performer: [product]
• Growth rate: +45% MoM
```

- Show web search results toggle ("Search web")
- Show model status: "Claude 3 Sonnet • Connected"
- Show message history (2-3 previous messages in gray)

### Key Visual Elements to Highlight

✅ **Settings Panel** (⌘, button visible in top right)
- Show it's accessible
- Optionally show settings open with:
  - AI Provider selector (Ollama/Claude/OpenAI)
  - Tavily API key field
  - Execution settings (timeout slider)

✅ **Syntax Highlighting**
- Python: Keywords (blue), functions (orange), strings (green)
- SQL: Keywords (blue), tables (purple), identifiers (black)

✅ **Status Indicators**
- ✓ Green checkmark for successful cells
- 🔴 Red X for errors (show one to demonstrate)
- 🟡 Yellow spinner for running cells

✅ **Dark Theme**
- Use dark theme (more professional, shows modern UI)
- Theme toggle visible in settings/top bar

✅ **Color Scheme**
- Prism-blue accent color (#4F46E5 or similar)
- White text on dark background
- Syntax highlighting colors distinct

## Camera/Screenshot Settings

### Resolution
- **Ideal:** 1920x1200 or higher (16:9 or 16:10 aspect ratio)
- **Minimum:** 1280x720 (will be scaled down to 900px on GitHub)

### Font Size
- Notebook code: 14px (readable but not huge)
- UI text: 12-13px (standard)
- Terminal: 11px

### Color Settings
- ✓ Use **Dark theme** (more modern, easier on eyes)
- ✓ Browser zoom: 100% (no scaling)
- ✓ No browser UI visible (full-screen or frameless window)

### Timing
- Wait for all cells to execute (green checkmarks visible)
- Capture with AI Agent panel showing active conversation
- Show at least one query result table fully rendered

## Steps to Capture

1. **Arrange your layout:**
   ```
   [Files] [Notebook with cells] [AI Chat]
   ```

2. **Fill with content:**
   - Top: Python cell with output
   - Middle: SQL cell with results
   - Right: AI Agent with conversation

3. **Set theme:**
   - Open Settings (⌘,)
   - Select "Dark" theme
   - Close settings

4. **Take screenshot:**
   - macOS: Cmd+Shift+4, then select area
   - Linux: Screenshot tool, select area
   - Windows: Win+Shift+S, select area

5. **Edit (optional):**
   - Crop to content (remove extra whitespace)
   - Add a subtle border (1-2px gray)
   - Save as `docs/screenshots/v1_6_0_featured.png`

6. **Optimize:**
   - Format: PNG (crisp lines)
   - Quality: 90% (good balance)
   - Size: ~200-300KB (fast loading)

## Update README

Replace this line in README.md:
```markdown
<img src="docs/screenshots/02_notebook_dark.png" alt="PrismNote — Data Science Notebook" width="900" style="border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); margin: 20px 0;">
```

With:
```markdown
<img src="docs/screenshots/v1_6_0_featured.png" alt="PrismNote v1.6.0 — SQL + Python + AI in One Notebook" width="900" style="border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.3); margin: 20px 0;">
```

## Pro Tips for Star-Worthy Screenshot

✨ **Visual Hierarchy:**
- Make the center notebook the focus (largest area)
- Keep sidebars visible but not dominant
- Use white space strategically

✨ **Tell a Story:**
- Show data exploration → analysis → AI insight
- Cells should flow top-to-bottom logically
- Results should be impressive (colorful charts, neat tables)

✨ **Show v1.6.0 Specific Features:**
- SQL cells (new in v1.5, enhanced in v1.6)
- AI Agent panel (Tavily web search visible)
- Settings showing Tavily + Execution options (new in v1.6)
- Multi-language notebook (Python + SQL together)

✨ **Professional Polish:**
- No error messages or warning badges
- All cells successfully executed
- Clean, organized notebook structure
- Readable output (not too much text)

## Example Workflow to Demonstrate

1. **Load Data:** Python cell loads CSV
2. **Explore Visually:** Data shown in table (Data Explorer)
3. **Query:** SQL cell filters/aggregates
4. **Visualize:** Chart renders below SQL results
5. **Ask AI:** "What's interesting about this data?"
6. **Get Insights:** AI response with web context

---

## After Capturing

1. Save to `docs/screenshots/v1_6_0_featured.png`
2. Update README.md with new filename
3. Commit: `docs: Update featured screenshot for v1.6.0`
4. Push to GitHub
5. Share on social media! 📸

---

**Questions?** Open an issue or discuss in [GitHub Discussions](https://github.com/Mullassery/PrismNote/discussions)
