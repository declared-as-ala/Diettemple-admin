# DietTemple Admin Dashboard - Design System

## 🎨 Design Philosophy

Premium fitness platform aesthetic inspired by:
- Whoop
- MyFitnessPal (new UI)
- Nike Training Club
- Strong App
- Linear (UI quality)

## 🌈 Color System

### Primary Colors
- **Primary**: Deep Fitness Green (`#10B981` / `rgb(16, 185, 129)`)
- **Accent**: Electric Blue (`#3B82F6` / `rgb(59, 130, 246)`)
- **Success**: Neon Green (`#22C55E` / `rgb(34, 197, 94)`)

### Theme Modes
- **Dark Mode**: Default (gym context)
- **Light Mode**: Available via theme toggle

All colors use CSS variables for easy theming.

## 🧱 Components

### Layout
- **Sidebar**: Collapsible with smooth animations, icons from lucide-react
- **TopBar**: Search, theme toggle, notifications, profile dropdown
- **Cards**: Rounded-xl, subtle shadows, glass/blurred backgrounds in dark mode

### UI Components
- **Buttons**: Primary with glow effect on hover
- **Inputs**: Clean borders, focus rings
- **Tables**: Sticky headers, row hover effects
- **Badges**: Status indicators with color coding
- **Loading**: Logo spinner animation

### Modals & Dialogs
- All use shadcn Dialog component
- Keyboard accessible
- Auto-close on success

## 🎭 Animations

- **Fade In**: Page transitions
- **Slide In**: Sidebar collapse/expand
- **Spin**: Loading logo rotation
- **Glow**: Button hover effects
- **Card Hover**: Lift effect on cards

## 📐 Spacing & Typography

- Consistent spacing scale
- Font: Geist Sans (system fallback)
- Responsive typography
- Clear hierarchy

## 🎯 Key Features

1. **Dark Mode Default**: Perfect for gym/admin context
2. **Collapsible Sidebar**: Icons-only when collapsed
3. **Level Badges**: Visual level indicators with images
4. **Loading States**: Logo spinner for all async operations
5. **Toast Notifications**: Success/error feedback
6. **Theme Persistence**: Saved in localStorage

## 🚀 Usage

All components follow shadcn/ui patterns and use Tailwind utilities. No inline styles, no hardcoded colors.
