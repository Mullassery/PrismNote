# Multi-Terminal Split View Guide

**Version:** 1.0  
**Date:** 2026-07-28  
**Status:** Production-ready

---

## Overview

PrismNote now supports multiple terminal panes with vertical and horizontal split capabilities. Perfect for robotics workflows (ROS, PyRobot) where you need to simultaneously:

- Run a publisher in one terminal
- Listen to topics in another
- Monitor system state in a third
- Execute commands in a fourth

## Features

### Split Operations
- **Vertical Split** (Side-by-side): Useful for publisher/listener pairs
- **Horizontal Split** (Stacked): Good for monitoring multiple processes
- **Nested Splits**: Combine vertical and horizontal splits (up to 4 panes recommended)

### Independent Terminals
- Each pane maintains its own:
  - Command history
  - Output buffer
  - Focus state
  - Command execution

### Responsive Design
- Drag-to-resize pane dividers
- Smooth transitions and animations
- Auto-focus on new panes
- Keyboard navigation between panes

## Usage

### Basic Operations

1. **Open Terminal Tab**
   - Click "Terminal" tab in bottom panel
   - Or press Ctrl+` (backtick)

2. **Split a Pane**
   - Click vertical split button (⫬) to split left/right
   - Click horizontal split button (⫭) to split top/bottom
   - Each split creates a new independent terminal

3. **Close a Pane**
   - Click trash icon (🗑) in pane header
   - Sibling pane expands to fill space
   - Terminal pane cannot be completely closed (at least one always remains)

4. **Resize Panes**
   - Drag the divider between panes
   - Left edge for vertical splits
   - Top edge for horizontal splits
   - Min 10%, max 90% of space

### ROS Workflow Example

```
Terminal 1 (left)          Terminal 2 (right)
─────────────────────────────────────────────
$ ros2 launch robot.launch │ $ ros2 topic list
...                         │ /robot/odom
Starting robot node...      │ /robot/cmd_vel
                            │ /robot/state
                            │
$ ros2 pub /cmd_vel ...     │ $ ros2 echo /robot/state
Publishing...              │ position: [x=1.5, y=2.3]
                            │ velocity: [vx=0.5, vy=0.0]
```

**Setup:**
1. Click vertical split button → creates left (Terminal 1) and right (Terminal 2) panes
2. In Terminal 1: `ros2 launch robot.launch`
3. In Terminal 2: `ros2 topic list` to explore topics
4. Continue in respective panes without context switching

### Python Development Example

```
Terminal 1                 Terminal 2
─────────────────────────────────────
$ python my_script.py      $ python -c "import my_module"
...                        >>> # interactive
Traceback...               >>> # debugging
                           >>> my_module.debug()
```

**Setup:**
1. Run main script in Terminal 1
2. Interactive Python in Terminal 2
3. Debug without stopping the main process

### Kubernetes Monitoring Example

```
Terminal 1 (top)          Terminal 2 (bottom)
──────────────────────────────────────────────
$ kubectl logs -f pod-1   $ kubectl logs -f pod-2
[pod-1] Starting...       [pod-2] Ready
[pod-1] Processing...     [pod-2] Received request
                          [pod-2] Processing...
```

**Setup:**
1. Click horizontal split button → creates top and bottom panes
2. In Terminal 1: `kubectl logs -f pod-1`
3. In Terminal 2: `kubectl logs -f pod-2`
4. Monitor both services simultaneously

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Focus terminal | `Ctrl+`` |
| Split vertical | Click button (⫬) |
| Split horizontal | Click button (⫭) |
| Close pane | Click button (🗑) |
| Execute command | `Enter` |
| Next pane | `Ctrl+Tab` (future) |
| Previous pane | `Ctrl+Shift+Tab` (future) |

## Architecture

### Component Hierarchy

```
BottomPanel
└── TerminalSplitContainer (when tab === 'terminal')
    └── TerminalTree (recursive rendering)
        ├── TerminalPane (leaf node)
        │   └── Command input + output
        └── TerminalSplit (branch node)
            ├── Child 1 (50% of space)
            └── Child 2 (50% of space)
```

### Data Structure

```typescript
interface TerminalConfig {
  id: string                              // Unique pane/split identifier
  type: 'pane' | 'split'                 // Leaf (terminal) or branch (split)
  direction?: 'vertical' | 'horizontal'  // Split direction (for splits)
  size?: number                          // Size % (0-100) for left/top child
  children?: TerminalConfig[]            // Child panes/splits
  history?: TerminalHistory[]            // Command history (for panes)
}
```

## Advanced Features

### Nested Splits (4-Pane Layout)

```
┌─────────────────┬─────────────────┐
│   Terminal 1    │   Terminal 2    │
├─────────────────┼─────────────────┤
│   Terminal 3    │   Terminal 4    │
└─────────────────┴─────────────────┘
```

**Setup:**
1. Split root vertically → Left, Right
2. Click horizontal split on Left → Top-Left, Bottom-Left
3. Click horizontal split on Right → Top-Right, Bottom-Right

### Pane Labeling

Each pane shows its ID (first 6 chars) in the header for reference:
- `Terminal (a3f5c2)` — pane a3f5c2
- `Terminal (d8b2e1)` — pane d8b2e1

Useful for debugging split operations or referencing specific panes in scripts.

## Performance Notes

- Each pane maintains independent history (no cross-pane overhead)
- Drag-to-resize uses efficient event handling
- Terminal output limited to last 10,000 lines per pane (configurable)
- Split tree depth limited to 3 (4 panes max, prevents UI complexity)

## Future Enhancements

1. **Pane Persistence**: Save split layout on close, restore on reopen
2. **Pane Navigation**: Keyboard shortcuts for moving between panes (Ctrl+Tab)
3. **Copy/Paste Between Panes**: Share command output between terminals
4. **Terminal Recording**: Record terminal session for playback
5. **Search**: Search across all pane histories
6. **Themes**: Terminal color themes (Solarized, Dracula, etc.)
7. **Connection Pooling**: Reuse SSH connections across panes

## Troubleshooting

### Commands not executing
- Verify backend terminal API is running
- Check browser console for error messages
- Try in single pane to isolate issue

### Panes not resizing
- Ensure dividers are at least 100px apart
- Check for browser zoom level (try reset)
- Try closing and reopening terminal tab

### Pane not visible
- It might be collapsed to <10% width/height
- Drag divider to expand it
- Or close and recreate the pane

## Best Practices

1. **Logical Organization**: Group related operations in adjacent panes
2. **Label Your Work**: Use echo statements to mark pane purposes
3. **Monitor Output**: Use horizontal splits for long-running output
4. **Separate Concerns**: Publishers in one pane, listeners in another
5. **Save Commands**: Document complex commands for reproducibility

## Examples

### Example 1: ROS2 Multi-Node Testing

```bash
# Terminal 1 (left)
$ ros2 launch my_robot.launch

# Terminal 2 (right)
$ ros2 topic pub /goal geometry_msgs/PoseStamped \
  "header: {frame_id: 'map'}, pose: {position: {x: 1.0, y: 0.0}}"

# Or:
$ ros2 topic echo /result
```

### Example 2: Development & Testing

```bash
# Terminal 1 (top)
$ nodemon server.js   # Auto-restarts on file changes

# Terminal 2 (bottom)
$ npm test -- --watch  # Run tests
```

### Example 3: Data Pipeline Monitoring

```bash
# Terminal 1
$ python data_producer.py

# Terminal 2
$ watch "wc -l output.csv"

# Terminal 3
$ tail -f output.csv | head -5

# Terminal 4
$ python data_consumer.py
```

---

## Technical Details

### Session Management

Each terminal pane gets a unique session ID (`paneId`). When executing commands:

```typescript
// In TerminalPane.tsx
const res = await fetch('/api/terminal/exec', {
  body: JSON.stringify({ 
    command: 'ls -la',
    paneId: 'unique-pane-id'  // Routes to correct session
  })
})
```

Backend maintains separate `paneId` → shell session mappings.

### Resize Algorithm

Resizing uses a simple delta-based algorithm:

```typescript
newSize = constrain(currentSize + delta, 10, 90)
```

Where:
- `delta` = mouse movement distance
- `constrain()` = ensure 10-90% bounds
- Prevents panes from becoming unusable

### Tree Traversal

Split operations use recursive tree traversal:

```typescript
function splitPane(config, paneId, direction) {
  if (config.id === paneId) {
    // Found target, replace with split
  }
  if (config.children) {
    // Recurse into children
  }
  return modified config
}
```

---

## Conclusion

Multi-terminal split views enable efficient workflows for complex tasks:
- **Robotics**: ROS publishers/listeners/monitoring
- **DevOps**: Service monitoring, log tailing, deployment
- **Development**: Server + tests + debugging simultaneously
- **Data**: Producer + consumer + monitoring pipelines

Open source, locally-run, no cloud dependency. Perfect for offline development and edge computing scenarios.

---

**Status**: Production-ready  
**Last Updated**: 2026-07-28  
**Next Review**: 2026-08-28
