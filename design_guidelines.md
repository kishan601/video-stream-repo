# Video Streaming Dashboard - Design Guidelines

## Design Approach

**System**: Custom monitoring dashboard design inspired by professional technical tools (monitoring interfaces, control panels)
**Rationale**: Utility-focused application prioritizing real-time video visibility, control clarity, and information density

## Core Design Principles

1. **Visual Hierarchy**: Video feeds are primary; controls are secondary but always accessible
2. **Information Density**: Maximize screen real estate for video content while maintaining clear controls
3. **Scan-ability**: Status indicators and controls should be instantly recognizable
4. **Consistency**: Uniform treatment across all 6 video players to avoid confusion

---

## Layout System

### Main Structure
```
┌─────────────────────────────────────────┐
│  Header (h-16)                          │
├─────────────────────────────────────────┤
│                                         │
│  Video Grid (3x2 on desktop)           │
│  gap-4, p-6                             │
│                                         │
├─────────────────────────────────────────┤
│  Control Panel (h-20)                   │
└─────────────────────────────────────────┘
```

### Spacing Primitives
**Consistent Units**: Use Tailwind units of **2, 4, 6, 8, 12, 16**
- Video grid container: `p-6`
- Grid gap between videos: `gap-4`
- Section padding: `px-6 py-4`
- Component internal spacing: `p-4`
- Button padding: `px-6 py-3`
- Icon-text spacing: `gap-2`

### Grid Breakpoints
```
Mobile (base):    1 column (stack vertically)
Tablet (md:):     2 columns (2x3 layout)
Desktop (lg:):    3 columns (3x2 layout)
Wide (xl:):       3 columns (maintain aspect ratio)
```

### Video Player Aspect Ratio
Each video container: **16:9 aspect ratio** maintained with `aspect-video`
Minimum comfortable viewing size: `min-h-[200px]` on mobile

---

## Typography

### Font Stack
- **Primary**: Inter or System UI (`font-sans`)
- **Monospace** (for timestamps/IDs): `font-mono`

### Hierarchy
```
Header Title:          text-2xl font-bold
Section Headers:       text-lg font-semibold  
Video Labels:          text-sm font-medium
Status Text:           text-xs font-normal
Timestamps:            text-xs font-mono
Control Buttons:       text-sm font-medium
```

### Text Alignment
- Left-align all text (natural reading flow)
- Center-align only for symmetric empty states
- Monospace for all numerical data (drift values, timestamps)

---

## Component Specifications

### 1. Header Bar
**Height**: `h-16`
**Content**:
- Logo/Title (left)
- Global status indicator (center) - shows overall sync health
- Master controls: "Play All" / "Pause All" / "Sync All" (right)

**Layout**: Flexbox with `justify-between items-center px-6`

### 2. Video Player Grid
**Container**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6`

**Individual Video Card**:
```
┌──────────────────────────┐
│  Video Feed              │
│  (aspect-video)          │
├──────────────────────────┤
│  Stream 1  [●] LIVE      │  ← Header (h-10)
│  Drift: +0.15s           │
├──────────────────────────┤
│  [▶/⏸] [⟳] [...more]     │  ← Controls (h-12)
└──────────────────────────┘
```

**Card Structure**:
- Outer container: `border border-opacity-20 rounded-lg overflow-hidden`
- Video area: `relative aspect-video bg-neutral-900`
- Info bar: `flex justify-between items-center px-4 py-2 h-10`
- Control bar: `flex gap-2 px-4 py-2 h-12`

### 3. Status Indicators
**Live Indicator**: Circle icon + "LIVE" text
**Sync Status**: 
- Three states: In Sync / Minor Drift / Major Drift
- Text format: "Drift: ±X.XXs" in monospace
- Position: Top-right of each video card

### 4. Control Panel (Bottom Bar)
**Height**: `h-20`
**Sections**:
```
[Global Controls] | [Sync Info] | [Settings]
     40%              40%           20%
```

**Global Controls**:
- Large buttons: `px-8 py-3 rounded-md text-base font-medium`
- Icon + Text combination
- Button group spacing: `gap-3`

**Sync Information Display**:
- Master stream indicator
- Average drift across all streams
- Last sync timestamp

**Settings Toggle**:
- Compact icon buttons: `w-10 h-10`
- Dropdown menu on click

### 5. Buttons

**Primary Actions** (Play All, Sync):
- Size: `px-6 py-3 text-sm`
- Border radius: `rounded-md`
- Font weight: `font-medium`

**Secondary Actions** (individual controls):
- Size: `px-4 py-2 text-sm`
- Border radius: `rounded`

**Icon-Only Buttons**:
- Square: `w-10 h-10`
- Circular: `rounded-full`
- Icons centered with flexbox

### 6. Loading States
**Video Loading**: Skeleton with pulsing effect on `aspect-video` container
**Error States**: Display within video container with retry button

### 7. Empty State (No Streams)
Center card with:
- Icon (large, `w-16 h-16`)
- Heading: `text-xl font-semibold`
- Description: `text-sm`
- Setup instruction link

---

## Responsive Behavior

### Mobile (<768px)
- Single column stack
- Sticky header: `sticky top-0 z-50`
- Control panel becomes modal/drawer
- Reduce padding: `p-4` instead of `p-6`

### Tablet (768px-1024px)
- 2-column grid
- Maintain full controls
- Reduce gaps slightly: `gap-3`

### Desktop (>1024px)
- 3-column grid
- Maximum container width: `max-w-screen-2xl mx-auto`
- Full spacing: `gap-4`

---

## Accessibility

### Focus States
- Keyboard navigation: Clear focus rings on all interactive elements
- Focus ring: `focus:ring-2 focus:ring-offset-2`
- Skip to content link at top

### ARIA Labels
- Each video: `aria-label="Stream {number}"`
- Play/pause state announced
- Sync status changes announced

### Keyboard Shortcuts
- Space: Play/Pause master
- S: Sync all streams
- 1-6: Focus individual streams
- Display shortcut guide: Small `?` button in header

---

## Icons
**Library**: Heroicons (via CDN)
**Common Icons**:
- Play/Pause: `play`, `pause`
- Sync: `arrow-path`
- Settings: `cog-6-tooth`
- Live indicator: `signal` or filled circle
- Error: `exclamation-triangle`
- Info: `information-circle`

**Icon Sizing**:
- Header: `w-5 h-5`
- Buttons: `w-4 h-4`
- Status indicators: `w-3 h-3`

---

## Performance Considerations
- Lazy load video elements outside viewport on mobile
- Debounce sync calculations
- Minimize re-renders with React.memo on video components
- Use CSS Grid for layout (better performance than Flexbox for grids)

---

## Visual Polish
- Smooth transitions: `transition-all duration-200` on interactive states
- Subtle borders: `border border-opacity-20` for card separation
- Consistent border radius: `rounded-md` for cards, `rounded` for small elements
- Backdrop blur for overlays: `backdrop-blur-sm`