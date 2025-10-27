# EduCompose Frontend

Modern React-based frontend for the EduCompose essay evaluation system.

## Features

- **Modern UI/UX** - Built with React 19, TypeScript, and Tailwind CSS
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Component Library** - Reusable UI components with consistent design
- **Real-time Updates** - Dynamic data loading and state management
- **Accessibility** - ARIA labels and keyboard navigation support
- **Animations** - Smooth transitions with Framer Motion

## Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **Vite** - Fast build tool and dev server

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:5173

### 3. Build for Production

```bash
npm run build
```

### 4. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Basic UI components (Button, Card, etc.)
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── essay/        # Essay-related components
│   │   └── ...           # Other component categories
│   ├── pages/            # Page components
│   ├── layout/           # Layout components
│   ├── types/            # TypeScript type definitions
│   ├── data/             # JSON data files
│   ├── api.ts            # API client and dummy data
│   └── main.tsx          # Application entry point
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.ts        # Vite configuration
└── package.json          # Dependencies and scripts
```

## Components

### UI Components (`src/components/ui/`)

- **Button** - Customizable button with variants and sizes
- **Card** - Container component with hover effects
- **Input** - Form input with validation states
- **Modal** - Overlay modal with animations
- **Badge** - Status and category indicators
- **ProgressBar** - Animated progress indicators

### Dashboard Components (`src/components/dashboard/`)

- **StatsCard** - Statistics display cards
- **RecentActivity** - Activity feed component
- **ClassOverview** - Class statistics and management

### Essay Components (`src/components/essay/`)

- **EssayCard** - Essay preview and status cards
- **EssayAnalysisModal** - Detailed analysis display

## Data Management

The application uses dummy data from JSON files for development:

- **`src/data/dummyData.json`** - Complete dataset with essays, classes, students, and users
- **`src/api.ts`** - API client with dummy data integration

### Sample Data Structure

```json
{
  "essays": [
    {
      "id": 1,
      "title": "Essay Title",
      "content": "Essay content...",
      "status": "analyzed",
      "grammar_score": 85,
      "readability_score": 78,
      "overall_score": 83,
      "grammar_errors": [...],
      "style_issues": [...],
      "recommendations": [...]
    }
  ],
  "classes": [...],
  "students": [...],
  "users": [...]
}
```

## Styling

### Tailwind CSS Configuration

The project uses a custom color palette defined in `tailwind.config.js`:

- **Primary**: Blue tones (#0791B2)
- **Secondary**: Teal tones (#8CB5B9)
- **Tertiary**: Red tones (#B22807)
- **Success**: Green tones (#10B981)
- **Warning**: Yellow tones (#F59E0B)
- **Error**: Red tones (#EF4444)

### Custom Utilities

Additional CSS utilities in `src/index.css`:

- `.line-clamp-2` - Two-line text truncation
- `.line-clamp-3` - Three-line text truncation
- `.btn-fade` - Button hover animations

## Development

### Adding New Components

1. Create component file in appropriate directory
2. Export from component index if needed
3. Add TypeScript interfaces for props
4. Use Tailwind classes for styling
5. Add Framer Motion animations if needed

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/ClientSidebar.tsx`

### API Integration

The `src/api.ts` file contains:

- API client functions for all endpoints
- Dummy data loading from JSON
- Type-safe request/response handling
- Error handling and authentication

## Building and Deployment

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=EduCompose
```

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deployment

The application can be deployed to any static hosting service:

- **Vercel**: `vercel --prod`
- **Netlify**: Connect to Git repository
- **GitHub Pages**: Use GitHub Actions
- **AWS S3**: Upload `dist/` contents

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript for all new code
3. Add proper prop types and interfaces
4. Include responsive design considerations
5. Test on multiple screen sizes

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
